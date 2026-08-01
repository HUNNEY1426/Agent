require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { loadHistory, saveHistory } = require("./sessionService");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function askAI(question) {

    const history = loadHistory();

    history.push({
        role: "user",
        text: question
    });

    const prompt = history
        .map(msg => `${msg.role}: ${msg.text}`)
        .join("\n");

    const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
    });

    const answer = response.text;

    history.push({
        role: "assistant",
        text: answer
    });

    saveHistory(history);

    return answer;
}

module.exports = { askAI };