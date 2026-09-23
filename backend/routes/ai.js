const express = require("express");
const router = express.Router();
const path = require("path");
const { spawn } = require("child_process");
const multer = require("multer");
const ffmpeg = require("ffmpeg-static");
const { OpenAI, toFile } = require("openai");
const { GoogleGenAI } = require("@google/genai");

const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }
});

const { askAI } = require("../services/aiService");
const providerManager = require("../services/providerManager");
const { thinkingLevels } = require("../services/thinkingConfig");
const { createSafeErrorResponse } = require("../services/errorSanitizer");
const { aiConfig } = require("../config/aiConfig");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
    getUserSessionDir,
    deleteSession,
    renameSession,
    clearSession,
    duplicateSession,
    getSessionInfo,
    searchMessages,
    exportSession,
    importSession,
    archiveSession,
    restoreSession,
    updateSessionSettings,
    getSessionSettings,
    getSessionObject,
    readActiveSession,
    listUserSessions,
    createNewSession,
    switchUserSession
} = require("../services/sessionService");

// Protect all AI routes with authMiddleware
router.use(authMiddleware);

router.post("/ask", async (req, res) => {
    const { question, provider, model, thinkingLevel, pdfName, pdfId, files, pdf, sessionId } = req.body;
    const userId = req.user?.id;
    const isAuthenticated = Boolean(req.user);
    const userIdPresent = Boolean(userId);

    if (!question || !question.trim()) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Question is required"
            }
        });
    }

    const selectedProvider = provider || providerManager.runtimeSettings.provider || aiConfig.provider || "gemini";
    const selectedModel = model || (provider && provider !== providerManager.runtimeSettings.provider ? undefined : providerManager.runtimeSettings.model) || aiConfig.model || "gemini-2.0-flash";

    console.log(`[AI DEBUG]\nprovider=${selectedProvider}\nmodel=${selectedModel}\nauthenticated=${isAuthenticated}\nuserIdPresent=${userIdPresent}\nquestionLength=${question.length}\nproviderStarted=true`);

    try {
        const result = await askAI(question, {
            provider: selectedProvider,
            model: selectedModel,
            thinkingLevel,
            pdfName,
            pdfId,
            files,
            pdf,
            sessionId,
            userId
        });

        console.log(`[AI DEBUG]\nproviderSuccess=true`);

        const answer = typeof result === "string" ? result : result.answer;

        res.json({
            success: true,
            answer,
            sessionId: result.sessionId,
            provider: result.provider,
            model: result.model,
            thinkingLevel: result.thinkingLevel,
            usage: result.usage,
            citations: result.citations || [],
            pdfUsed: !!result.pdfUsed,
            historyCitations: result.historyCitations || [],
            historyUsed: !!result.historyUsed
        });

    } catch (error) {
        console.log(`[AI DEBUG]\nproviderSuccess=false`);
        console.error("AI Route Error:", error.message || error);

        const safeError = createSafeErrorResponse(
            selectedProvider,
            error,
            error.attemptedErrors || []
        );

        const httpStatus = safeError.statusCode || 500;

        res.status(httpStatus).json({
            success: false,
            error: {
                code: safeError.errorCode || "AI_PROVIDER_ERROR",
                message: safeError.reason || `${safeError.providerDisplay || "AI"} provider request failed`,
                details: safeError.error
            },
            ...safeError
        });
    }
});

// Get Current AI Settings
router.get("/settings", (req, res) => {
    try {
        const userId = req.user.id;
        const active = readActiveSession(userId);
        const sessionDir = getUserSessionDir(userId);
        const sessionFile = path.join(sessionDir, `${active.active}.json`);
        const session = getSessionObject(active.active, sessionFile, userId);

        const activeProvider = session.provider || providerManager.runtimeSettings.provider || aiConfig.provider || "gemini";
        const activeModel = session.model || providerManager.runtimeSettings.model || aiConfig.model || "gemini-2.0-flash";
        const activeThinking = session.thinkingLevel || providerManager.runtimeSettings.thinkingLevel || aiConfig.thinkingLevel || "medium";

        res.json({
            provider: activeProvider,
            model: activeModel,
            thinkingLevel: activeThinking,
            defaultProvider: aiConfig.provider || "gemini",
            defaultModel: aiConfig.model || "gemini-2.0-flash",
        });
    } catch (error) {
        res.json(providerManager.getCurrentSettings());
    }
});

// Update AI Settings
router.post("/settings", async (req, res) => {
    const { provider, model, thinkingLevel } = req.body;
    const userId = req.user.id;

    try {
        const active = readActiveSession(userId);

        if (provider) {
            providerManager.setProvider(provider);
        }
        if (model) {
            providerManager.setModel(model, provider || providerManager.runtimeSettings.provider);
        }
        if (thinkingLevel) {
            providerManager.setThinkingLevel(thinkingLevel);
        }

        const current = providerManager.getCurrentSettings();

        // Update active session file for user
        try {
            await updateSessionSettings(active.active, current, userId);
        } catch (e) {
            // Ignore if active session file not ready
        }

        res.json({
            success: true,
            settings: current,
            message: "Settings updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// List Available Providers with configuration status and models
router.get("/providers", (req, res) => {
    const providerList = providerManager.getProviderStatusList();
    res.json({
        providers: providerList,
        defaultProvider: aiConfig.provider || providerManager.runtimeSettings.provider || "gemini",
        defaultModel: aiConfig.model || providerManager.runtimeSettings.model || "gemini-2.0-flash",
    });
});

// List Models for Provider
function handleModelsList(req, res) {
    const provider = req.params.provider || providerManager.runtimeSettings.provider || "gemini";
    try {
        const modelsList = providerManager.listModels(provider);
        res.json({
            provider,
            models: modelsList
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

router.get("/models", handleModelsList);
router.get("/models/:provider", handleModelsList);

// Get Thinking Levels
router.get("/thinking-levels", (req, res) => {
    res.json({
        levels: thinkingLevels
    });
});

// Create New Chat Session
router.post("/chat/new", async (req, res) => {
    const { name, provider, model, thinkingLevel } = req.body;
    const userId = req.user.id;

    try {
        const result = await createNewSession(name, { provider, model, thinkingLevel }, userId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Switch Active Session
router.post("/chat/switch", async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;

    try {
        const result = await switchUserSession(name, userId);
        res.json(result);
    } catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
});

// List All Sessions for user
router.get("/chat/list", (req, res) => {
    try {
        const userId = req.user.id;
        const sessionsList = listUserSessions(userId);
        res.json(sessionsList);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete Chat Session
router.delete("/chat/delete/:name", async (req, res) => {
    const { name } = req.params;
    const userId = req.user.id;
    try {
        await deleteSession(name, userId);
        res.json({
            success: true,
            message: `Session '${name}' deleted`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Rename Chat Session
router.post("/chat/rename", async (req, res) => {
    const { oldName, newName } = req.body;
    const userId = req.user.id;
    try {
        await renameSession(oldName, newName, userId);
        res.json({
            success: true,
            message: `Session '${oldName}' renamed to '${newName}'`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already exists" ? 409 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Clear Chat Session
router.post("/chat/clear", async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    try {
        await clearSession(name, userId);
        res.json({
            success: true,
            message: `Session '${name}' cleared`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Duplicate Chat Session
router.post("/chat/duplicate", async (req, res) => {
    const { source, target } = req.body;
    const userId = req.user.id;
    try {
        await duplicateSession(source, target, userId);
        res.json({
            success: true,
            message: `Session '${source}' duplicated to '${target}'`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already exists" ? 409 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Get Chat Session Info
router.get("/chat/info/:name", async (req, res) => {
    const { name } = req.params;
    const userId = req.user.id;
    try {
        const info = await getSessionInfo(name, userId);
        res.json(info);
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Search Chat Messages
router.get("/chat/search/:query", async (req, res) => {
    const { query } = req.params;
    const userId = req.user.id;
    try {
        const results = await searchMessages(query, userId);
        res.json(results);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Export Chat Session
router.post("/chat/export", async (req, res) => {
    const { id, format } = req.body;
    const userId = req.user.id;
    try {
        const result = await exportSession(id, format, userId);
        res.json({
            success: true,
            filePath: result.filePath,
            content: result.content
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Import Chat Session
router.post("/chat/import", async (req, res) => {
    const { session } = req.body;
    const userId = req.user.id;
    try {
        const imported = await importSession(session, userId);
        res.json({
            success: true,
            session: imported
        });
    } catch (err) {
        res.status(err.message === "Session ID already exists" ? 409 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Archive Chat Session
router.post("/chat/archive", async (req, res) => {
    const id = req.body.id || req.body.name;
    const userId = req.user.id;
    try {
        await archiveSession(id, userId);
        res.json({
            success: true,
            message: `Session '${id}' archived successfully`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already archived" ? 409 : 400).json({
            success: false,
            error: err.message
        });
    }
});

// Restore Chat Session
router.post("/chat/restore", async (req, res) => {
    const id = req.body.id || req.body.name;
    const userId = req.user.id;
    try {
        await restoreSession(id, userId);
        res.json({
            success: true,
            message: `Session '${id}' restored successfully`
        });
    } catch (err) {
        res.status(err.message === "Session not found in archives" ? 404 : err.message === "Session already exists in active sessions" ? 409 : 400).json({
            success: false,
            error: err.message
        });
    }
});

function convertBufferToWav(buffer) {
    return new Promise((resolve, reject) => {
        const proc = spawn(ffmpeg, [
            "-i", "pipe:0",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-f", "wav",
            "pipe:1"
        ]);
        const chunks = [];
        proc.stdout.on("data", c => chunks.push(c));
        proc.stderr.on("data", () => {});
        proc.on("close", code => {
            if (code === 0) resolve(Buffer.concat(chunks));
            else reject(new Error(`FFmpeg exited with code ${code}`));
        });
        proc.on("error", reject);
        proc.stdin.write(buffer);
        proc.stdin.end();
    });
}

// Transcribe Audio via Gemini AI (Primary, free tier) and Whisper AI (Fallback)
router.post("/transcribe", audioUpload.single("audio"), async (req, res) => {
    try {
        if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: "NO_AUDIO", message: "Audio file is required" }
            });
        }

        const lang = req.body.language === "hi-IN" ? "Hindi" : "English";
        let transcribedText = "";

        // 1. Try Gemini Multimodal Audio first (works with GEMINI_API_KEY)
        if (process.env.GEMINI_API_KEY) {
            try {
                let wavBuffer = req.file.buffer;
                try {
                    wavBuffer = await convertBufferToWav(req.file.buffer);
                } catch (convErr) {
                    console.warn("[Transcribe] WAV conversion warning:", convErr.message);
                }

                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                const prompt = `Listen carefully to this audio recording and transcribe the speech verbatim in its original spoken language (${lang}). Output ONLY the transcribed words with no commentary, quotation marks, or explanations. If there is no discernible speech or only silence, output nothing.`;

                // Try gemini-3.5-flash-lite, fallback to gemini-3.6-flash
                for (const model of ["gemini-3.5-flash-lite", "gemini-3.6-flash"]) {
                    try {
                        const response = await ai.models.generateContent({
                            model,
                            contents: [
                                {
                                    inlineData: {
                                        mimeType: "audio/wav",
                                        data: wavBuffer.toString("base64")
                                    }
                                },
                                prompt
                            ]
                        });
                        if (response && typeof response.text === "string" && response.text.trim()) {
                            transcribedText = response.text.trim();
                            break;
                        }
                    } catch (mErr) {
                        console.warn(`[Transcribe] Model ${model} error:`, mErr.message);
                    }
                }
            } catch (geminiErr) {
                console.warn("[Transcribe] Gemini transcription error:", geminiErr.message);
            }
        }

        // 2. Fallback to OpenAI Whisper if Gemini didn't return text and OPENAI_API_KEY is present
        if (!transcribedText && process.env.OPENAI_API_KEY) {
            try {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const whisperLang = req.body.language === "hi-IN" ? "hi" : "en";
                const originalName = req.file.originalname || "recording.webm";
                const fileObj = await toFile(req.file.buffer, originalName, { type: req.file.mimetype || "audio/webm" });

                const transcription = await openai.audio.transcriptions.create({
                    file: fileObj,
                    model: "whisper-1",
                    language: whisperLang,
                    response_format: "text"
                });

                transcribedText = (typeof transcription === "string" ? transcription : transcription.text || "").trim();
            } catch (whisperErr) {
                console.warn("[Transcribe] Whisper transcription error:", whisperErr.message);
            }
        }

        if (!transcribedText) {
            return res.status(200).json({
                success: true,
                text: "",
                message: "No speech recognized."
            });
        }

        return res.json({
            success: true,
            text: transcribedText
        });
    } catch (err) {
        console.error("Audio transcription error:", err.message);
        return res.status(500).json({
            success: false,
            error: { code: "TRANSCRIPTION_FAILED", message: err.message || "Failed to transcribe audio" }
        });
    }
});

module.exports = router;