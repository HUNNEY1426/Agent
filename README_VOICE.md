# 🎤 Terminal Voice Chat — Windows Setup Guide

Voice input and text-to-speech inside the CLI (`npm run client`). No browser needed.

---

## How It Works

```
Microphone
  └─► FFmpeg (bundled via npm — no system install needed)
        └─► WAV file (temp)
              └─► OpenAI Whisper API  ──► transcript text
                                               └─► AI provider of your choice
                                                     └─► response in terminal
                                                           └─► (optional) Windows TTS reads aloud
```

**Audio capture:** `ffmpeg-static` npm package — ships a pre-built FFmpeg binary.  
**Speech-to-text:** OpenAI Whisper API (uses your existing `OPENAI_API_KEY`).  
**Text-to-speech:** Windows built-in `SpeechSynthesizer` via PowerShell — zero dependencies.

> **SoX is NOT required.** The bundled FFmpeg replaces it entirely.

---

## Quick Install (One Command)

```bash
npm install
```

That's it. `ffmpeg-static` is already listed in `package.json` and downloads the
FFmpeg binary automatically during `npm install`. No PATH setup, no system tools.

---

## Prerequisites

### 1. OpenAI API Key (for Whisper STT)

Your existing `OPENAI_API_KEY` in `.env` handles Whisper transcription.  
Whisper cost: ~$0.006 per minute — very affordable.

If the key is missing you'll see:

```
❌  OPENAI_API_KEY is not set.
   Add OPENAI_API_KEY=sk-... to your .env file.
```

### 2. Microphone Permissions (Windows 10 / 11)

1. Open **Settings → Privacy & Security → Microphone**
2. Turn ON **Microphone access**
3. Turn ON **Let desktop apps access your microphone**

### 3. (Optional) System FFmpeg — not required

`ffmpeg-static` bundles a working binary so nothing else is needed.
If you already have FFmpeg on PATH, the voice service will use that instead.

---

## Configuration (.env)

```env
VOICE_ENABLED=false        # true = voice mode starts automatically on CLI launch
VOICE_LANGUAGE=en-IN       # Recognition language (see list below)
VOICE_TTS=false            # true = AI responses spoken aloud automatically
```

---

## Starting the CLI

```bash
npm run client
```

---

## Voice Commands

| Command | Description |
|---------|-------------|
| `/voice on` | Enable microphone voice mode |
| `/voice` | Same as `/voice on` |
| `/mic` | Alias for `/voice on` |
| `/voice off` | Disable voice mode, return to text input |
| `/voice status` | Show voice + TTS state and current language |
| `/voice language en-IN` | Set language to English (India) |
| `/voice language hi-IN` | Set language to Hindi |
| `/voice language auto` | Let Whisper auto-detect language |
| `/tts on` | Enable TTS — AI reads responses aloud |
| `/tts off` | Disable TTS |
| `/tts status` | Show current TTS state |

---

## Startup Dependency Check

When you type `/voice on`, the CLI automatically checks:

- ✅ FFmpeg binary accessible (bundled via `ffmpeg-static`)
- ✅ `OPENAI_API_KEY` is set in `.env`

If anything is missing, you'll see a clear error message **before** recording starts — no cryptic crashes.

Example error output:
```
❌  OPENAI_API_KEY is not set.
   Whisper STT requires an OpenAI API key.
   Add OPENAI_API_KEY=sk-... to your .env file.
```

---

## Supported Languages

Whisper supports 99+ languages. Common codes:

| Language | Code |
|----------|------|
| English (India) | `en-IN` |
| English (US) | `en-US` |
| Hindi | `hi-IN` |
| Tamil | `ta-IN` |
| Telugu | `te-IN` |
| Bengali | `bn-IN` |
| Marathi | `mr-IN` |
| Gujarati | `gu-IN` |
| Kannada | `kn-IN` |
| Malayalam | `ml-IN` |
| Punjabi | `pa-IN` |
| Urdu | `ur` |
| Spanish | `es` |
| French | `fr` |
| German | `de` |
| Japanese | `ja` |
| Auto-detect | `auto` |

---

## Example Session

```
npm run client

🤖 Welcome to AI Interactive Chat
Voice:    /voice on|off|status, /voice language <code>, /mic, /tts on|off|status

You > /voice on
🎤 Voice mode enabled (language: en-IN)
  Recording up to 7 s per utterance. Speak after the mic prompt.

🎤 Listening... (type /voice off to stop)

📝 You said: "What is the capital of India?"

AI Thinking...
AI [gemini-2.0-flash | medium] >
The capital of India is New Delhi.

🎤 Listening...
📝 You said: "Tell me about Taj Mahal"

AI Thinking...
AI [gemini-2.0-flash | medium] >
The Taj Mahal is a white marble mausoleum...

🎤 Listening...
```

```
You > /voice language hi-IN
✔ Voice language set to: hi-IN

You > /tts on
🔊 TTS enabled. AI responses will be spoken aloud.

You > /voice off
🔇 Voice mode stopped.

You > What is 2 + 2?
AI [gemini-2.0-flash | medium] >
2 + 2 equals 4.
```

---

## Switching Providers During Voice Mode

Voice mode works with all providers — switch at any time:

```
You > /provider ollama
Provider changed to ollama

🎤 Listening...     ← next utterance goes to Ollama
```

Supported providers: **Gemini · Ollama · OpenRouter · OpenAI · Claude**

---

## Error Reference

| Message | Cause | Fix |
|---------|-------|-----|
| `❌ FFmpeg not found` | ffmpeg-static missing | `npm install` |
| `❌ OPENAI_API_KEY is not set` | Missing env var | Add key to `.env` |
| `❌ OpenAI API key is invalid` | Wrong or expired key | Renew at platform.openai.com |
| `❌ No audio input device detected` | No mic / mic disabled | Connect mic, check Device Manager |
| `❌ Microphone permission denied` | Windows privacy setting | Settings → Privacy → Microphone → ON |
| `❌ Recorded audio file is empty` | Mic muted or wrong default device | Unmute, set correct default input |
| `❌ Rate limit reached` | Too many Whisper requests | Wait and retry |
| `Cannot connect to server` | Express server not running | Run `npm run dev` in another terminal |

---

## All Other CLI Features Still Work

The following are completely unchanged:

```
/provider   /model   /thinking   /settings
/providers  /models  /switch     /new
exit        quit
```

---

## Uninstall Voice Feature

```bash
npm uninstall ffmpeg-static
```

Remove `VOICE_ENABLED`, `VOICE_LANGUAGE`, `VOICE_TTS` from `.env`.
