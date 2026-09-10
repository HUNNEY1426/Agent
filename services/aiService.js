require("dotenv").config();
const path = require("path");

const providerManager = require("./providerManager");
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

    const messages = [
        ...history.map(msg => ({
            role: msg.role,
            content: msg.content || msg.text || ""
        })),
        {
            role: "user",
            content: question
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
        content: answer,
        text: answer,
        provider: result.provider,
        model: result.model,
        thinkingLevel: result.thinkingLevel,
        usage: result.usage
    };
}

module.exports = { askAI };