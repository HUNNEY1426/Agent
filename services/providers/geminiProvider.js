const { GoogleGenAI } = require("@google/genai");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || "";
    this.model = config.model || process.env.GEMINI_MODEL || "gemini-2.0-flash";
    if (this.apiKey) {
      this.client = new GoogleGenAI({
        apiKey: this.apiKey,
      });
    }
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
    const key = this.config?.apiKey || this.apiKey || process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async generateResponse(messages = [], options = {}) {
    const apiKey = this.config?.apiKey || this.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please configure GEMINI_API_KEY in .env"
      );
    }

    if (!this.client || this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      this.client = new GoogleGenAI({ apiKey });
    }

    const targetModel = options.model || this.model || "gemini-2.0-flash";
    const thinkingLevel = options.thinkingLevel || this.config?.thinkingLevel || "medium";

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

    // Only apply thinkingConfig for models supporting thinking budget and not flagged without thinking
    if (
      !options._withoutThinking &&
      typeof budget === "number" &&
      budget > 0 &&
      (targetModel.includes("thinking") || targetModel.includes("2.5") || targetModel.includes("3."))
    ) {
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
      // If error is thinkingConfig unsupported, retry without thinkingConfig
      if (requestPayload.config?.thinkingConfig && !options._withoutThinking) {
        return this.generateResponse(messages, {
          ...options,
          _withoutThinking: true,
        });
      }

      // If model 404s/not found, try with gemini-2.0-flash fallback if not already
      if (
        (error.message?.includes("is no longer available") || error.message?.includes("NOT_FOUND")) &&
        targetModel !== "gemini-2.0-flash" &&
        !options._isRetry
      ) {
        return this.generateResponse(messages, {
          ...options,
          model: "gemini-2.0-flash",
          _isRetry: true,
        });
      }
      throw error;
    }
  }
}

module.exports = GeminiProvider;
