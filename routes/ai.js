const express = require("express");
const router = express.Router();
const path = require("path");

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
    const { question, provider, model, thinkingLevel, pdfName, pdfId, files, pdf } = req.body;
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
            userId
        });

        console.log(`[AI DEBUG]\nproviderSuccess=true`);

        const answer = typeof result === "string" ? result : result.answer;

        res.json({
            success: true,
            answer,
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

        res.status(500).json({
            success: false,
            error: {
                code: "AI_PROVIDER_ERROR",
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

module.exports = router;