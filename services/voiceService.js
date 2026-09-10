"use strict";

require("dotenv").config();
const fs          = require("fs");
const path        = require("path");
const os          = require("os");
const { spawnSync, spawn } = require("child_process");

// ── State ─────────────────────────────────────────────────────────────────────
let voiceEnabled    = process.env.VOICE_ENABLED  === "true";
let ttsEnabled      = process.env.VOICE_TTS      === "true";
let language        = process.env.VOICE_LANGUAGE || "en-IN";
let _ffmpegProcess  = null;   // active recording process
let _loopActive     = false;
let _selectedDevice = null;   // user-chosen device name (null = auto-pick first)

// ── FFmpeg path resolution ────────────────────────────────────────────────────

/**
 * Resolve the ffmpeg binary to use.
 * Priority: system PATH  →  bundled ffmpeg-static.
 */
function getFfmpegPath() {
  // 1. System PATH
  const check = spawnSync("ffmpeg", ["-version"], { stdio: "pipe", timeout: 3000 });
  if (check.status === 0) return "ffmpeg";

  // 2. Bundled npm package
  try {
    const bundled = require("ffmpeg-static");
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {}

  throw new Error(
    "❌  FFmpeg not found.\n\n" +
    "Run ONE of the following:\n\n" +
    "  npm install ffmpeg-static        (no PATH setup, recommended)\n" +
    "  winget install Gyan.FFmpeg       (system-wide)\n" +
    "  choco install ffmpeg             (system-wide)\n"
  );
}

// ── Device enumeration ────────────────────────────────────────────────────────

/**
 * Run  ffmpeg -list_devices true -f dshow -i dummy  and return raw stderr.
 *
 * FFmpeg always exits with a non-zero code when listing devices because
 * "dummy" is not a real input — the device list still appears in stderr.
 */
function runDshowDeviceList(ffmpegBin) {
  const result = spawnSync(
    ffmpegBin,
    ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
    { encoding: "utf8", timeout: 8000 }
  );
  // Combine stderr + stdout — all useful output goes to stderr
  return (result.stderr || "") + (result.stdout || "");
}

/**
 * Parse the FFmpeg dshow device-list output and return an array of audio devices.
 *
 * FFmpeg 6.x format (this machine):
 *   [dshow @ 00000266...] "USB2.0 HD UVC WebCam" (video)
 *   [dshow @ 00000266...]   Alternative name "..."
 *   [dshow @ 00000266...] "Microphone Array (Realtek(R) Audio)" (audio)
 *   [dshow @ 00000266...]   Alternative name "..."
 *
 * Older FFmpeg format:
 *   [dshow @ ...] DirectShow video devices
 *   [dshow @ ...]  "..."
 *   [dshow @ ...] DirectShow audio devices
 *   [dshow @ ...]  "..."
 *
 * We handle both by matching any line whose quoted name is followed by "(audio)".
 * We also handle the older two-section format as a fallback.
 */
function parseAudioDevices(output) {
  const devices = [];
  const lines   = output.split("\n");

  // ── Strategy 1: inline "(audio)" / "(video)" labels (FFmpeg 6.x) ──────────
  for (const line of lines) {
    // Skip "Alternative name" lines
    if (/alternative name/i.test(line)) continue;
    // Match:  [dshow @ ...] "Device Name" (audio)
    const m = line.match(/^\[dshow[^\]]*\]\s+"([^"]+)"\s+\(audio\)/i);
    if (m) {
      devices.push(m[1]);
    }
  }

  if (devices.length > 0) return devices;

  // ── Strategy 2: section-header format (FFmpeg 4.x / 5.x fallback) ─────────
  let inAudioSection = false;
  for (const line of lines) {
    if (/DirectShow audio devices/i.test(line)) {
      inAudioSection = true;
      continue;
    }
    if (/DirectShow video devices/i.test(line)) {
      inAudioSection = false;
      continue;
    }
    if (!inAudioSection) continue;
    if (/alternative name/i.test(line)) continue;
    const m = line.match(/^\[dshow[^\]]*\]\s+"([^"]+)"/);
    if (m) devices.push(m[1]);
  }

  return devices;
}

/**
 * Return an array of { name } objects for all detected audio input devices.
 * Throws with a clear actionable message if none found or FFmpeg fails.
 */
function listAudioDevices() {
  const ffmpegBin = getFfmpegPath();
  const output    = runDshowDeviceList(ffmpegBin);
  const devices   = parseAudioDevices(output);

  if (devices.length === 0) {
    throw new Error(
      "❌  No audio input devices detected.\n\n" +
      "Checklist:\n" +
      "  1. Connect a microphone and make sure it is enabled.\n" +
      "  2. Open Settings → Privacy & Security → Microphone\n" +
      "     → enable 'Let desktop apps access your microphone'.\n" +
      "  3. Check Device Manager for disabled audio input devices.\n\n" +
      "FFmpeg output (last 400 chars):\n" +
      output.slice(-400)
    );
  }

  return devices.map((name) => ({ name }));
}

/**
 * Get the device to record from.
 * - User-chosen device wins (set via /voice device <name>).
 * - Otherwise auto-pick the first audio input and CACHE it in _selectedDevice
 *   so subsequent calls from inside the async voice loop never re-enumerate.
 */
function resolveDevice() {
  if (_selectedDevice) return _selectedDevice;

  const devices = listAudioDevices();          // throws if none
  _selectedDevice = devices[0].name;           // cache → avoids re-enumeration bug
  return _selectedDevice;
}

// ── Audio recording ───────────────────────────────────────────────────────────

/**
 * Escape a DirectShow device name for use inside  audio="<name>"
 * Backslashes and double-quotes must be escaped.
 */
function escapeDshowDeviceName(name) {
  // In the FFmpeg -i argument, the device name sits inside  audio=<name>
  // No extra escaping is needed for the JS spawn args array (no shell quoting).
  return name;
}

/**
 * Record audio from the system microphone using FFmpeg.
 * Max duration: durationSecs (default 60 s).
 * Auto-stops gracefully after 1 s of silence following detected speech.
 * Returns a Promise<string> that resolves to the temp WAV file path.
 */
function recordAudio(durationSecs = 60) {
  return new Promise((resolve, reject) => {
    let ffmpegBin, deviceName;
    try {
      ffmpegBin  = getFfmpegPath();
      deviceName = resolveDevice();   // uses cache — no spawnSync inside async context
    } catch (err) {
      return reject(err);
    }

    const tmpFile  = path.join(os.tmpdir(), `voice_${Date.now()}.wav`);
    const platform = os.platform();

    let inputArgs;
    if (platform === "win32") {
      inputArgs = ["-f", "dshow", "-i", `audio=${deviceName}`];
    } else if (platform === "darwin") {
      inputArgs = ["-f", "avfoundation", "-i", ":0"];
    } else {
      inputArgs = ["-f", "pulse", "-i", "default"];
    }

    const args = [
      "-hide_banner",
      "-y",
      ...inputArgs,
      "-ar", "16000",
      "-ac", "1",
      // silencedetect: emit silence_start / silence_end events in stderr
      // d=1.0  → 1 second of continuous silence below −35 dB triggers detection
      "-af", "silencedetect=noise=-35dB:d=1.0",
      "-t",  String(durationSecs),   // hard max (safety net)
      "-vn",
      tmpFile,
    ];

    const proc = spawn(ffmpegBin, args, { stdio: ["pipe", "pipe", "pipe"] });
    _ffmpegProcess = proc;

    let stderrBuf    = "";
    let speechSeen   = false;   // true after first silence_end (= speech started)
    let stopScheduled = false;
    const startMs    = Date.now();

    proc.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderrBuf += chunk;

      // silence_end  → a silence period just ENDED → speech has begun
      if (!speechSeen && chunk.includes("silence_end")) {
        speechSeen = true;
      }

      // silence_start → silence detected (speech paused or never started)
      if (!stopScheduled && chunk.includes("silence_start")) {
        const elapsed = Date.now() - startMs;
        // Auto-stop when:
        //   • speech was detected and user paused, OR
        //   • 2+ seconds of audio captured (handles immediately-speaking users
        //     where no initial silence_end is emitted before they start)
        if (speechSeen || elapsed > 2000) {
          stopScheduled = true;
          // Give ffmpeg 300 ms to flush the current frame then stop gracefully
          setTimeout(() => {
            try { proc.stdin.write("q\n"); } catch {}
            // Hard kill fallback after 1.5 s
            setTimeout(() => { try { proc.kill(); } catch {} }, 1500);
          }, 300);
        }
      }
    });

    proc.on("close", () => {
      _ffmpegProcess = null;
      const exists = fs.existsSync(tmpFile);
      const size   = exists ? fs.statSync(tmpFile).size : 0;

      if (exists && size > 1024) return resolve(tmpFile);

      const lower = stderrBuf.toLowerCase();
      if (lower.includes("no such filter") || lower.includes("could not enumerate")) {
        return reject(new Error(
          `❌  DirectShow cannot open: "${deviceName}"\n` +
          "  Run /voice devices to list mics, /voice device <name> to switch."
        ));
      }
      if (lower.includes("permission denied") || lower.includes("access denied")) {
        return reject(new Error(
          "❌  Microphone permission denied.\n" +
          "  Settings → Privacy & Security → Microphone → ON."
        ));
      }
      if (exists && size === 0) {
        return reject(new Error("❌  Recorded file is empty. Mic may be muted."));
      }
      reject(new Error(
        `❌  Recording failed (device: "${deviceName}")\n` +
        "FFmpeg output:\n" + stderrBuf.slice(-400)
      ));
    });

    proc.on("error", (err) => {
      _ffmpegProcess = null;
      reject(new Error(
        err.code === "ENOENT"
          ? "❌  FFmpeg not found. Run: npm install ffmpeg-static"
          : `FFmpeg spawn error: ${err.message}`
      ));
    });
  });
}

// ── OpenAI Whisper ────────────────────────────────────────────────────────────

function requireOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      "❌  OPENAI_API_KEY is not set.\n" +
      "  Whisper STT requires an OpenAI API key.\n" +
      "  Add OPENAI_API_KEY=sk-... to your .env file."
    );
  }
  try {
    const { OpenAI } = require("openai");
    return new OpenAI({ apiKey });
  } catch {
    throw new Error("❌  Failed to load openai package. Run: npm install openai");
  }
}

/** Map BCP-47 / locale codes to Whisper language codes. */
function mapLanguage(lang) {
  if (!lang || lang === "auto") return undefined;
  const map = {
    "en-in": "en", "en-us": "en", "en-gb": "en", "en": "en",
    "hi-in": "hi", "hi":    "hi",
    "ta-in": "ta", "ta":    "ta",
    "te-in": "te", "te":    "te",
    "mr-in": "mr", "mr":    "mr",
    "bn-in": "bn", "bn":    "bn",
    "gu-in": "gu", "gu":    "gu",
    "kn-in": "kn", "kn":    "kn",
    "ml-in": "ml", "ml":    "ml",
    "pa-in": "pa", "pa":    "pa",
    "ur":    "ur",
  };
  const key = lang.toLowerCase().replace("_", "-");
  return map[key] || key.split("-")[0];
}

async function transcribeAudio(filePath) {
  const openai = requireOpenAI();
  const lang   = mapLanguage(language);
  try {
    const result = await openai.audio.transcriptions.create({
      file:            fs.createReadStream(filePath),
      model:           "whisper-1",
      language:        lang,
      response_format: "text",
    });
    return (typeof result === "string" ? result : result.text || "").trim();
  } catch (err) {
    if (err.status === 401) throw new Error("❌  OpenAI API key invalid or expired.");
    if (err.status === 429) throw new Error("❌  OpenAI rate limit reached. Wait and retry.");
    if (err.status === 413) throw new Error("❌  Audio file too large for Whisper (max 25 MB).");
    throw new Error("❌  Whisper transcription failed: " + err.message);
  } finally {
    try { fs.unlinkSync(filePath); } catch {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

function enableVoice()  { voiceEnabled = true;  }
function enableTTS()    { ttsEnabled   = true;  }
function disableTTS()   { ttsEnabled   = false; }

function disableVoice() {
  voiceEnabled = false;
  _loopActive  = false;
  stopRecording();
}

function finishRecording() {
  // Stops current recording but keeps voiceEnabled true so the loop continues
  stopRecording();
}

function setLanguage(lang) {
  const v = (lang || "").trim();
  if (!v) throw new Error("Language code cannot be empty. Examples: en-IN, hi-IN, auto");
  if (v !== "auto" && !/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(v)) {
    throw new Error(
      `❌  Invalid language code: '${lang}'.\n` +
      "Use a BCP-47 code (e.g. en-IN, hi-IN, fr) or 'auto'."
    );
  }
  language = v;
}

/** Manually select a microphone by its exact DirectShow name. */
function selectDevice(deviceName) {
  if (!deviceName || !deviceName.trim()) {
    throw new Error("Device name cannot be empty. Use /voice devices to list available microphones.");
  }
  _selectedDevice = deviceName.trim();
}

/** Clear the manual device selection (revert to auto-pick). */
function clearDeviceSelection() {
  _selectedDevice = null;
}

function getStatus() {
  return {
    voiceEnabled,
    ttsEnabled,
    language,
    loopActive:     _loopActive,
    selectedDevice: _selectedDevice || "(auto)",
  };
}

function stopRecording() {
  if (_ffmpegProcess) {
    try { _ffmpegProcess.stdin.write("q\n"); } catch {}
    const proc = _ffmpegProcess;
    setTimeout(() => { try { proc.kill(); } catch {} }, 1500);
    _ffmpegProcess = null;
  }
}

/**
 * Dependency preflight: checks FFmpeg and OPENAI_API_KEY.
 * Returns { ok: boolean, message: string }.
 */
function checkDependencies() {
  const issues = [];

  try { getFfmpegPath(); }
  catch (err) { issues.push(err.message); }

  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
    issues.push(
      "❌  OPENAI_API_KEY is not set in .env.\n" +
      "   Add OPENAI_API_KEY=sk-... to your .env file."
    );
  }

  if (issues.length === 0) return { ok: true, message: "All voice dependencies OK." };
  return { ok: false, message: issues.join("\n\n") };
}

/**
 * Record one utterance from the mic and return the Whisper transcript.
 * Max 60 s; auto-stops after 1 s of silence following speech.
 */
async function listenOnce() {
  const dep = checkDependencies();
  if (!dep.ok) throw new Error(dep.message);
  const filePath = await recordAudio(60);   // 60 s max, silence auto-stop
  return await transcribeAudio(filePath);
}

/**
 * TTS via Windows PowerShell SpeechSynthesizer (no extra install).
 */
function speak(text) {
  if (!ttsEnabled || !text || !text.trim()) return;
  const platform = os.platform();

  if (platform === "win32") {
    const safe = text.replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, " ");
    const ps   = `Add-Type -AssemblyName System.Speech; ` +
                 `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ` +
                 `$s.Speak('${safe}')`;
    try {
      spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
        detached: true, stdio: "ignore",
      }).unref();
    } catch {}
  } else if (platform === "darwin") {
    try { spawn("say", [text], { detached: true, stdio: "ignore" }).unref(); } catch {}
  } else {
    try { spawn("espeak", [text], { detached: true, stdio: "ignore" }).unref(); } catch {}
  }
}

module.exports = {
  enableVoice,
  disableVoice,
  enableTTS,
  disableTTS,
  setLanguage,
  selectDevice,
  clearDeviceSelection,
  listAudioDevices,
  getStatus,
  listenOnce,
  speak,
  stopRecording,
  finishRecording,
  checkDependencies,
};
