require("dotenv").config();
const path = require("path");

const providerManager  = require("./providerManager");
const pdfService       = require("./pdf/pdfService");
const historyService   = require("./history/historyService");
const { loadHistory, readActiveSession, saveMessage, getSessionObject } = require("./sessionService");
const { aiConfig } = require("../config/aiConfig");

const MEMORY_DIR = path.join(__dirname, "../memory");
const SESSION_DIR = path.join(MEMORY_DIR, "sessions");

async function askAI(question, options = {}) {
    const active = readActiveSession();
    const history = loadHistory();

    const userMessage = {
        role: "user",
        content: question,
        text: question
    };

    const targetDoc = options.pdfId || options.pdfName || options.pdf || options.files;
    const pdfStatus = pdfService.getStatus();
    let finalUserPrompt = question;
    let citations        = [];
    let pdfUsed          = false;
    let historyCitations = [];
    let historyUsed      = false;
    let pdfNames         = [];

    // ── PDF context ──────────────────────────────────────────
    let pdfContextText = "";
    if (pdfStatus.enabled || targetDoc) {
        const pdfContext = pdfService.buildContext(question, 4, targetDoc);
        citations = pdfContext.citations || [];
        pdfUsed   = pdfContext.hasContext;
        if (pdfContext.hasContext) {
            pdfContextText = pdfContext.contextText;
            pdfNames = citations.map(c => c.split(" — ")[0]);
        }
    }

    // ── History context ──────────────────────────────────────
    let historyContextText = "";
    if (historyService.isEnabled()) {
        const histCtx = historyService.buildContext(question, active.active);
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

    const sessionFile = path.join(SESSION_DIR, `${active.active}.json`);
    const session = getSessionObject(active.active, sessionFile);

    const mergedOptions = {
        provider: options.provider || session.provider || aiConfig.provider || "gemini",
        model: options.model || (options.provider && options.provider !== session.provider ? undefined : session.model) || aiConfig.model,
        thinkingLevel: options.thinkingLevel || session.thinkingLevel || "medium",
        ...options
    };

    // Safe server-side debug log (Step 15: NEVER print API keys!)
    console.log(`[AI REQUEST] provider=${mergedOptions.provider} model=${mergedOptions.model || "default"} sessionId=${active.active} pdfUsed=${pdfUsed} pdfNames=${pdfNames.join(",") || "none"} historyUsed=${historyUsed}`);

    const result = await providerManager.generateResponse(messages, mergedOptions);
    const answer = result.content || result.text || "";

    const assistantMessage = {
        role: "assistant",
        content: answer,
        text: answer
    };

    saveMessage(active.active, userMessage);
    saveMessage(active.active, assistantMessage);

    return {
        answer,
        content         : answer,
        text            : answer,
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