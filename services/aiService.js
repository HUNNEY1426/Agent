require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function askAI(question) {

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: question,
    });

    return response.text;
}

module.exports = { askAI };