const { GoogleGenAI } = require("@google/genai");
const BaseProvider = require("./baseProvider");

class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    if (!config.apiKey) {
      throw new Error(
        "Gemini API key is missing. Please configure GEMINI_API_KEY in .env"
      );
    }

    this.client = new GoogleGenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || "gemini-2.0-flash";
  }

  getName() {
    return "gemini";
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async generateResponse(messages = []) {
    const prompt = messages
      .map((message) => {
        const content = message.content || message.text || "";
        return `${message.role}: ${content}`;
      })
      .join("\n");

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    return {
      provider: "gemini",
      model: this.model,
      content: response.text || "",
      text: response.text || "",
      usage: {
        inputTokens:
          response.usageMetadata?.promptTokenCount || 0,
        outputTokens:
          response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens:
          response.usageMetadata?.totalTokenCount || 0,
      },
    };
  }
}

module.exports = GeminiProvider;
