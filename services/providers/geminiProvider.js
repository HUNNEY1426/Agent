const { GoogleGenAI } = require("@google/genai");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

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

  getCapabilities() {
    return {
      streaming: true,
      thinkingLevels: ["low", "medium", "high", "ultra"],
    };
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async generateResponse(messages = [], options = {}) {
    const targetModel = options.model || this.model;
    const thinkingLevel = options.thinkingLevel || this.config.thinkingLevel || "medium";

    const prompt = messages
      .map((message) => {
        const content = message.content || message.text || "";
        return `${message.role}: ${content}`;
      })
      .join("\n");

    const budget = getThinkingParameters("gemini", thinkingLevel);

    const requestPayload = {
      model: targetModel,
      contents: prompt,
    };

    if (typeof budget === "number" && budget > 0) {
      requestPayload.config = {
        thinkingConfig: {
          thinkingBudget: budget,
        },
      };
    }

    try {
      const response = await this.client.models.generateContent(requestPayload);

      return {
        provider: "gemini",
        model: targetModel,
        content: response.text || "",
        text: response.text || "",
        thinkingLevel: thinkingLevel,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount || 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      // If deprecated model 404s, try with fallback to configured model if different
      if (
        (error.message?.includes("is no longer available") || error.message?.includes("NOT_FOUND")) &&
        targetModel !== "gemini-3.6-flash" &&
        !options._isRetry
      ) {
        return this.generateResponse(messages, {
          ...options,
          model: "gemini-3.6-flash",
          _isRetry: true,
        });
      }
      throw error;
    }
  }
}

module.exports = GeminiProvider;
