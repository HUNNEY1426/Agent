require("dotenv").config();

const providerManager = require("./providerManager");
const { loadHistory, readActiveSession, saveMessage } = require("./sessionService");

async function askAI(question) {
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

    const result = await providerManager.generateResponse(messages);
    const answer = result.content || result.text || "";

    const assistantMessage = {
        role: "assistant",
        content: answer,
        text: answer
    };

    saveMessage(active.active, userMessage);
    saveMessage(active.active, assistantMessage);

    return answer;
}

module.exports = { askAI };