"use strict";

require("dotenv").config();
const fs          = require("fs");
const path        = require("path");
const os          = require("os");
const { spawnSync, spawn } = require("child_process");

// ── State ─────────────────────────────────────────────────────────────────────
let voiceEnabled      = process.env.VOICE_ENABLED  === "true";
let ttsEnabled        = process.env.VOICE_TTS      === "true";
let language          = process.env.VOICE_LANGUAGE || "en-IN";
let _ffmpegProcess    = null;   // active recording process
let _loopActive       = false;
let _selectedDevice   = null;   // manual user-chosen device name (null = auto-pick Windows default)
let _activeDeviceName = null;   // cached resolved device name

// State locks for concurrency protection
let _isRecording     = false;
let _isTranscribing  = false;
let _stopRequested   = false;

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

// ── Device enumeration & Windows Default Detection ────────────────────────────

/**
 * Run ffmpeg -list_devices true -f dshow -i dummy and return raw output.
 */
function runDshowDeviceList(ffmpegBin) {
  const result = spawnSync(
    ffmpegBin,
    ["-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"],
    { encoding: "utf8", timeout: 8000 }
  );
  return (result.stderr || "") + (result.stdout || "");
}

/**
 * Parse FFmpeg dshow output to get available audio input devices.
 */
function parseAudioDevices(output) {
  const devices = [];
  const lines   = output.split("\n");

  for (const line of lines) {
    if (/alternative name/i.test(line)) continue;
    const m = line.match(/^\[dshow[^\]]*\]\s+"([^"]+)"\s+\(audio\)/i);
    if (m) devices.push(m[1]);
  }

  if (devices.length > 0) return devices;

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
 * Throws clear error if none found.
 */
function listAudioDevices() {
  const ffmpegBin = getFfmpegPath();
  const output    = runDshowDeviceList(ffmpegBin);
  const devices   = parseAudioDevices(output);

  if (devices.length === 0) {
    throw new Error("❌  Windows default microphone not found");
  }

  return devices.map((name) => ({ name }));
}

/**
 * Detect the active Windows default audio capture device via WASAPI and Registry.
 */
function getWindowsDefaultMicrophoneInfo() {
  if (os.platform() !== "win32") return null;

  const psScript = `
$ProgressPreference = 'SilentlyContinue'
$WarningPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace AudioLib {
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDeviceEnumerator {
        [PreserveSig]
        int EnumAudioEndpoints(int dataFlow, uint dwStateMask, out IntPtr ppDevices);
        [PreserveSig]
        int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IMMDevice {
        [PreserveSig]
        int Activate(ref Guid iid, uint dwClsCtx, IntPtr pActivationParams, out IntPtr ppInterface);
        [PreserveSig]
        int OpenPropertyStore(uint stgmAccess, out IntPtr ppProperties);
        [PreserveSig]
        int GetId(out IntPtr ppstrId);
        [PreserveSig]
        int GetState(out uint pdwState);
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    public class MMDeviceEnumeratorComObject { }

    public class Audio {
        public static string GetDefaultInputDeviceId() {
            try {
                var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
                IMMDevice dev = null;
                int hr = enumerator.GetDefaultAudioEndpoint(1, 1, out dev);
                if (hr != 0 || dev == null) {
                    hr = enumerator.GetDefaultAudioEndpoint(1, 0, out dev);
                }
                if (hr != 0 || dev == null) return null;

                IntPtr pStr = IntPtr.Zero;
                hr = dev.GetId(out pStr);
                if (hr != 0 || pStr == IntPtr.Zero) return null;

                string id = Marshal.PtrToStringUni(pStr);
                Marshal.FreeCoTaskMem(pStr);
                return id;
            } catch {
                return null;
            }
        }
    }
}
"@
$id = [AudioLib.Audio]::GetDefaultInputDeviceId()
if ($id) {
    $guid = $id.Split('.')[-1]
    $regPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\MMDevices\\Audio\\Capture\\$guid\\Properties"
    $prop = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
    $p14 = $prop.'{a45c254e-df1c-4efd-8020-67d146a850e0},14'
    $p2  = $prop.'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
    $p6  = $prop.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
    [PSCustomObject]@{
        Id = $id
        Guid = $guid
        FriendlyName = $p14
        DeviceDesc = $p2
        DriverDesc = $p6
    } | ConvertTo-Json -Compress
} else {
    Write-Output "null"
}
`;

  try {
    const res = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript], {
      encoding: "utf8",
      timeout: 6000
    });
    const out = (res.stdout || "").trim();
    if (!out || out === "null") return null;
    return JSON.parse(out);
  } catch (err) {
    return null;
  }
}

/**
 * Resolve Windows default microphone name mapped to FFmpeg DirectShow device list.
 */
function getDefaultMicrophoneName() {
  const ffmpegDevs = listAudioDevices();
  if (!ffmpegDevs || ffmpegDevs.length === 0) {
    throw new Error("❌  Windows default microphone not found");
  }

  if (os.platform() !== "win32") {
    return ffmpegDevs[0].name;
  }

  const defaultInfo = getWindowsDefaultMicrophoneInfo();
  if (!defaultInfo) {
    return ffmpegDevs[0].name;
  }

  const { FriendlyName, DeviceDesc, DriverDesc } = defaultInfo;

  if (FriendlyName) {
    const match = ffmpegDevs.find(d => d.name.toLowerCase() === FriendlyName.toLowerCase());
    if (match) return match.name;
  }

  if (DeviceDesc && DriverDesc) {
    const combined = `${DeviceDesc} (${DriverDesc})`;
    const match = ffmpegDevs.find(d => d.name.toLowerCase() === combined.toLowerCase());
    if (match) return match.name;
  }

  if (DeviceDesc) {
    const match = ffmpegDevs.find(d => d.name.toLowerCase().includes(DeviceDesc.toLowerCase()));
    if (match) return match.name;
  }
  if (DriverDesc) {
    const match = ffmpegDevs.find(d => d.name.toLowerCase().includes(DriverDesc.toLowerCase()));
    if (match) return match.name;
  }

  return ffmpegDevs[0].name;
}

/**
 * Get the device to record from.
 * User-chosen device wins if manually set, otherwise auto-detects Windows default mic.
 */
function resolveDevice() {
  if (_selectedDevice) return _selectedDevice;
  if (_activeDeviceName) return _activeDeviceName;

  _activeDeviceName = getDefaultMicrophoneName();
  return _activeDeviceName;
}

// ── Audio recording ───────────────────────────────────────────────────────────

/**
 * Record audio from the system microphone using FFmpeg.
 */
function recordAudio(durationSecs = 60) {
  if (_isRecording) {
    return Promise.reject(new Error("Recording is already in progress."));
  }

  return new Promise((resolve, reject) => {
    let ffmpegBin, deviceName;
    try {
      ffmpegBin  = getFfmpegPath();
      deviceName = resolveDevice();
    } catch (err) {
      return reject(err);
    }

    _isRecording = true;
    _stopRequested = false;
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
      "-af", "silencedetect=noise=-35dB:d=1.0",
      "-t",  String(durationSecs),
      "-vn",
      tmpFile,
    ];

    const proc = spawn(ffmpegBin, args, { stdio: ["pipe", "pipe", "pipe"] });
    _ffmpegProcess = proc;

    let stderrBuf     = "";
    let speechSeen    = false;
    let stopScheduled = false;
    const startMs     = Date.now();

    proc.stderr.on("data", (d) => {
      const chunk = d.toString();
      stderrBuf += chunk;

      if (!speechSeen && chunk.includes("silence_end")) {
        speechSeen = true;
      }

      if (!stopScheduled && !_stopRequested && chunk.includes("silence_start")) {
        const elapsed = Date.now() - startMs;
        if (speechSeen || elapsed > 2000) {
          stopScheduled = true;
          _stopRequested = true;
          setTimeout(() => {
            try { proc.stdin.write("q\n"); } catch {}
            setTimeout(() => { try { proc.kill(); } catch {} }, 1500);
          }, 300);
        }
      }
    });

    proc.on("close", () => {
      _ffmpegProcess = null;
      _isRecording = false;
      _stopRequested = false;
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
      _isRecording = false;
      _stopRequested = false;
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
    throw new Error("❌  OPENAI_API_KEY is required for Whisper STT");
  }
  try {
    const { OpenAI } = require("openai");
    return new OpenAI({ apiKey: apiKey.trim() });
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
  if (_isTranscribing) {
    try { fs.unlinkSync(filePath); } catch {}
    throw new Error("Transcription already in progress.");
  }

  _isTranscribing = true;
  let openai;
  try {
    openai = requireOpenAI();
  } catch (err) {
    _isTranscribing = false;
    try { fs.unlinkSync(filePath); } catch {}
    throw err;
  }

  const lang = mapLanguage(language);
  try {
    const result = await openai.audio.transcriptions.create({
      file:            fs.createReadStream(filePath),
      model:           "whisper-1",
      language:        lang,
      response_format: "text",
    });
    return (typeof result === "string" ? result : result.text || "").trim();
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    const status = err.status || err.statusCode;

    if (status === 401 || msg.includes("incorrect api key") || msg.includes("invalid_api_key")) {
      throw new Error("❌  OPENAI_API_KEY is invalid or expired.");
    }
    if (
      status === 429 ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("insufficient_quota") ||
      msg.includes("exceeded your current quota")
    ) {
      throw new Error("❌  Whisper STT rate limit reached. Please check OpenAI API quota/billing.");
    }
    if (status === 413) {
      throw new Error("❌  Audio file too large for Whisper (max 25 MB).");
    }
    throw new Error("❌  Whisper transcription failed: " + (err.message || "Unknown error"));
  } finally {
    _isTranscribing = false;
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
  if (_ffmpegProcess && _isRecording && !_stopRequested) {
    _stopRequested = true;
    try { _ffmpegProcess.stdin.write("q\n"); } catch {}
    const proc = _ffmpegProcess;
    setTimeout(() => { try { proc.kill(); } catch {} }, 1500);
    return true;
  }
  return false;
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
  _activeDeviceName = null;
}

/** Clear the manual device selection (revert to auto-pick Windows default). */
function clearDeviceSelection() {
  _selectedDevice = null;
  _activeDeviceName = null;
}

function getStatus() {
  let micDisplay = "Windows Default";
  if (_selectedDevice) {
    micDisplay = _selectedDevice;
  }

  return {
    voiceEnabled,
    ttsEnabled,
    language,
    loopActive:     _loopActive || _isRecording || _isTranscribing,
    selectedDevice: micDisplay,
    isRecording:    _isRecording,
    isTranscribing: _isTranscribing,
    isProcessing:   _isRecording || _isTranscribing,
  };
}

function stopRecording() {
  if (_ffmpegProcess) {
    _stopRequested = true;
    try { _ffmpegProcess.stdin.write("q\n"); } catch {}
    const proc = _ffmpegProcess;
    setTimeout(() => { try { proc.kill(); } catch {} }, 1500);
    _ffmpegProcess = null;
    _isRecording = false;
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
    issues.push("❌  OPENAI_API_KEY is required for Whisper STT");
  }

  if (issues.length === 0) return { ok: true, message: "All voice dependencies OK." };
  return { ok: false, message: issues.join("\n\n") };
}

/**
 * Record one utterance from the mic and return the Whisper transcript.
 * Accepts optional options.onRecordingStop callback.
 */
async function listenOnce(options = {}) {
  const dep = checkDependencies();
  if (!dep.ok) throw new Error(dep.message);
  const filePath = await recordAudio(60);
  if (typeof options.onRecordingStop === "function") {
    options.onRecordingStop();
  }
  return await transcribeAudio(filePath);
}

/**
 * TTS via Windows PowerShell SpeechSynthesizer.
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

function isRecording() {
  return _isRecording;
}

function isTranscribing() {
  return _isTranscribing;
}

function isProcessing() {
  return _isRecording || _isTranscribing;
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
  isRecording,
  isTranscribing,
  isProcessing,
};

