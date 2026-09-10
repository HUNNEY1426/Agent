const axios = require("axios");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama3.2";
  }

  getName() {
    return "ollama";
  }

  getCapabilities() {
    return {
      streaming: true,
      thinkingLevels: ["low", "medium", "high", "ultra"],
    };
  }

  isConfigured() {
    return true;
  }

  async generateResponse(messages = [], options = {}) {
    const targetModel = options.model || this.model;
    const thinkingLevel = options.thinkingLevel || this.config.thinkingLevel || "medium";

    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content || m.text || "",
    }));

    const payload = {
      model: targetModel,
      messages: formattedMessages,
      stream: false,
    };

    const numPredict = getThinkingParameters("ollama", thinkingLevel);
    if (typeof numPredict === "number" && numPredict > 0) {
      payload.options = {
        num_predict: numPredict,
      };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, payload, {
        timeout: 60000,
      });

      const message = response.data?.message;
      const content = message?.content || "";

      return {
        provider: "ollama",
        model: targetModel,
        content: content,
        text: content,
        thinkingLevel: thinkingLevel,
        usage: {
          inputTokens: response.data?.prompt_eval_count || 0,
          outputTokens: response.data?.eval_count || 0,
          totalTokens:
            (response.data?.prompt_eval_count || 0) +
            (response.data?.eval_count || 0),
        },
      };
    } catch (error) {
      if (error.code === "ECONNREFUSED") {
        throw new Error(
          `Cannot connect to Ollama at ${this.baseUrl}. Please make sure Ollama server is running.`
        );
      }
      throw new Error(`Ollama Error: ${error.response?.data?.error || error.message}`);
    }
  }
}

module.exports = OllamaProvider;
