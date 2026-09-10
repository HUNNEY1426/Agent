const axios = require("axios");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

class OpenRouterProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    this.apiKey = config.apiKey;
    this.model = config.model || "google/gemini-2.0-flash-exp:free";
  }

  getName() {
    return "openrouter";
  }

  getCapabilities() {
    return {
      streaming: true,
      thinkingLevels: ["medium", "high", "ultra"],
    };
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generateResponse(messages = [], options = {}) {
    if (!this.apiKey) {
      throw new Error(
        "OpenRouter API key is missing. Please configure OPENROUTER_API_KEY in .env"
      );
    }

    const targetModel = options.model || this.model;
    const thinkingLevel = options.thinkingLevel || this.config.thinkingLevel || "medium";

    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content || m.text || "",
    }));

    const payload = {
      model: targetModel,
      messages: formattedMessages,
    };

    const enableReasoning = getThinkingParameters("openrouter", thinkingLevel);
    if (enableReasoning) {
      payload.reasoning = {
        effort: thinkingLevel,
      };
    }

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://github.com/Agent",
            "X-Title": "Terminal AI Agent",
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const choice = response.data?.choices?.[0];
      const content = choice?.message?.content || "";

      return {
        provider: "openrouter",
        model: targetModel,
        content: content,
        text: content,
        thinkingLevel: thinkingLevel,
        usage: {
          inputTokens: response.data?.usage?.prompt_tokens || 0,
          outputTokens: response.data?.usage?.completion_tokens || 0,
          totalTokens: response.data?.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      throw new Error(
        `OpenRouter Error: ${error.response?.data?.error?.message || error.response?.data?.message || error.message}`
      );
    }
  }
}

module.exports = OpenRouterProvider;
