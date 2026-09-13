require("dotenv").config();
const path = require("path");

const providerManager  = require("./providerManager");
const pdfService       = require("./pdf/pdfService");
const historyService   = require("./history/historyService");
const { loadHistory, readActiveSession, saveMessage, getSessionObject } = require("./sessionService");

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

    const pdfStatus = pdfService.getStatus();
    let finalUserPrompt = question;
    let citations        = [];
    let pdfUsed          = false;
    let historyCitations = [];
    let historyUsed      = false;

    // ── PDF context ──────────────────────────────────────────
    let pdfContextText = "";
    if (pdfStatus.enabled) {
        const pdfContext = pdfService.buildContext(question);
        citations = pdfContext.citations || [];
        pdfUsed   = pdfContext.hasContext;
        if (pdfContext.hasContext) {
            pdfContextText = pdfContext.contextText;
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
    } else if (pdfStatus.enabled) {
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
        provider: options.provider || session.provider,
        model: options.model || session.model,
        thinkingLevel: options.thinkingLevel || session.thinkingLevel,
        ...options
    };

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