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
    const apiKey = (this.config?.apiKey || this.apiKey || process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      const err = new Error("Gemini API key is missing. Please configure GEMINI_API_KEY in .env");
      err.status = 401;
      throw err;
    }

    if (apiKey.startsWith("AQ.") || apiKey.startsWith("ya29.")) {
      const err = new Error(
        "Invalid Gemini API key format (found OAuth token instead of AI Studio API key). Please generate a valid Gemini API key starting with 'AIzaSy...' from https://aistudio.google.com/apikey and update GEMINI_API_KEY in backend/.env"
      );
      err.status = 401;
      err.providerReason = "ACCESS_TOKEN_TYPE_UNSUPPORTED";
      throw err;
    }

    if (!this.client || this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      this.client = new GoogleGenAI({ apiKey });
    }

    const targetModel = options.model || this.model || "gemini-2.0-flash";
    const thinkingLevel = options.thinkingLevel || this.config?.thinkingLevel || "medium";

    // Format messages for @google/genai SDK
    let contents;
    if (Array.isArray(messages) && messages.length > 0) {
      contents = messages.map((m) => {
        const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
        const text = m.content || m.text || "";
        return {
          role,
          parts: [{ text }],
        };
      });
    } else {
      contents = typeof messages === "string" ? messages : "Hello";
    }

    const budget = getThinkingParameters("gemini", thinkingLevel);

    const requestPayload = {
      model: targetModel,
      contents,
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

      // Extract structured status and reason if error message has embedded JSON
      try {
        const jsonMatch = error.message && error.message.match(/\{[\s\S]*"error"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.error) {
            error.providerError = parsed.error;
            error.providerReason = parsed.error.details?.[0]?.reason || parsed.error.status;
            if (parsed.error.code && !error.status) {
              error.status = parsed.error.code;
            }
          }
        }
      } catch (_) {}

      throw error;
    }
  }
}

module.exports = GeminiProvider;
