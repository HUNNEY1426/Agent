require("dotenv").config();
const path = require("path");

const providerManager  = require("./providerManager");
const pdfService       = require("./pdf/pdfService");
const historyService   = require("./history/historyService");
const {
    loadHistory,
    readActiveSession,
    setActiveSession,
    saveMessage,
    getSessionObject,
    getUserSessionDir
} = require("./sessionService");
const { aiConfig } = require("../config/aiConfig");

async function askAI(question, options = {}) {
    const userId = options.userId || "default_user";

    // Determine target session ID
    let targetSessionId = options.sessionId || options.session;
    if (!targetSessionId || targetSessionId === "default") {
        const active = readActiveSession(userId);
        if (active && active.active && active.active !== "default") {
            targetSessionId = active.active;
        }
    }
    if (!targetSessionId || targetSessionId === "default") {
        targetSessionId = `chat-${Date.now()}`;
    }

    // Ensure session is set as active
    try {
        await setActiveSession(targetSessionId, userId);
    } catch (e) {}

    const history = loadHistory(userId, targetSessionId);

    const userMessage = {
        role: "user",
        content: question,
        text: question
    };

    const targetDoc = options.pdfId || options.pdfName || options.pdf || options.files;
    const pdfStatus = pdfService.getStatus(userId);
    let finalUserPrompt = question;
    let citations        = [];
    let pdfUsed          = false;
    let historyCitations = [];
    let historyUsed      = false;
    let pdfNames         = [];

    // ── PDF context (scoped to userId) ───────────────────────
    let pdfContextText = "";
    if (pdfStatus.enabled || targetDoc) {
        const pdfContext = pdfService.buildContext(question, 4, targetDoc, userId);
        citations = pdfContext.citations || [];
        pdfUsed   = pdfContext.hasContext;
        if (pdfContext.hasContext) {
            pdfContextText = pdfContext.contextText;
            pdfNames = citations.map(c => c.split(" — ")[0]);
        }
    }

    // ── History context (scoped to userId) ───────────────────
    let historyContextText = "";
    if (historyService.isEnabled(userId)) {
        const histCtx = historyService.buildContext(question, targetSessionId, {}, userId);
        historyUsed      = histCtx.hasContext;
        historyCitations = histCtx.citations || [];
        if (histCtx.hasContext) {
            historyContextText = histCtx.contextText;
        }
    }

    // ── Compose final prompt ─────────────────────────────────
    if (pdfContextText || historyContextText) {
        const parts = [];
        parts.push("You are answering questions using additional context provided below.");
        parts.push("Use the context to give accurate, grounded answers.");
        parts.push("If the answer cannot be found in the context, say so clearly.\n");

        if (pdfContextText) {
            parts.push("--- Relevant PDF context ---");
            parts.push(pdfContextText);
            parts.push("");
        }

        if (historyContextText) {
            parts.push("--- Relevant past conversation context ---");
            parts.push(historyContextText);
            parts.push("");
        }

        parts.push("User question:");
        parts.push(question);
        finalUserPrompt = parts.join("\n");
    } else if (pdfStatus.enabled || targetDoc) {
        // PDF mode on but nothing found
        finalUserPrompt = `You are answering questions strictly using the active PDF Knowledge Base.\n\nUser question:\n${question}\n\nNo relevant context was found in the active PDF document(s).\nClearly state: "I could not find this information in the PDF."`;
    }

    const messages = [
        ...history.map(msg => ({
            role   : msg.role,
            content: msg.content || msg.text || ""
        })),
        {
            role   : "user",
            content: finalUserPrompt
        }
    ];

    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${targetSessionId}.json`);
    const session = getSessionObject(targetSessionId, sessionFile, userId);

    const mergedOptions = {
        provider: options.provider || session.provider || aiConfig.provider || "gemini",
        model: options.model || (options.provider && options.provider !== session.provider ? undefined : session.model) || aiConfig.model,
        thinkingLevel: options.thinkingLevel || session.thinkingLevel || "medium",
        ...options
    };

    // Safe server-side debug log (NEVER print API keys or passwords!)
    console.log(`[AI REQUEST] user=${userId} provider=${mergedOptions.provider} model=${mergedOptions.model || "default"} sessionId=${targetSessionId} pdfUsed=${pdfUsed} pdfNames=${pdfNames.join(",") || "none"} historyUsed=${historyUsed}`);

    const result = await providerManager.generateResponse(messages, mergedOptions);
    const answer = result.content || result.text || "";

    const assistantMessage = {
        role: "assistant",
        content: answer,
        text: answer
    };

    saveMessage(targetSessionId, userMessage, userId);
    saveMessage(targetSessionId, assistantMessage, userId);

    return {
        answer,
        content         : answer,
        text            : answer,
        sessionId       : targetSessionId,
        provider        : result.provider,
        model           : result.model,
        thinkingLevel   : result.thinkingLevel,
        usage           : result.usage,
        citations,
        pdfUsed,
        historyCitations,
        historyUsed
    };
}

module.exports = { askAI };