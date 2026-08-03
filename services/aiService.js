require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { loadHistory, readActiveSession, saveMessage } = require("./sessionService");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function askAI(question) {
    const active = readActiveSession();
    const history = loadHistory();

    const userMessage = {
        role: "user",
        text: question
    };

    const prompt = [...history, userMessage]
        .map(msg => `${msg.role}: ${msg.text}`)
        .join("\n");

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
    });

    const answer = response.text;

    const assistantMessage = {
        role: "assistant",
        text: answer
    };

    saveMessage(active.active, userMessage);
    saveMessage(active.active, assistantMessage);

    return answer;
}

module.exports = { askAI };