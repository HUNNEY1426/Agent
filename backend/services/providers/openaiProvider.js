const OpenAI = require("openai");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    this.model = config.model || "gpt-4o-mini";
    if (config.apiKey) {
      this.client = new OpenAI({
        apiKey: config.apiKey,
      });
    }
  }

  getName() {
    return "openai";
  }

  getCapabilities() {
    return {
      streaming: true,
      thinkingLevels: ["low", "medium", "high"],
    };
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async generateResponse(messages = [], options = {}) {
    if (!this.config.apiKey) {
      throw new Error(
        "OpenAI API key is missing. Please configure OPENAI_API_KEY in .env"
      );
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });
    }

    const targetModel = options.model || this.model;
    const thinkingLevel = options.thinkingLevel || this.config.thinkingLevel || "medium";

    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
      content: m.content || m.text || "",
    }));

    const isReasoningModel = targetModel.startsWith("o1") || targetModel.startsWith("o3");
    const payload = {
      model: targetModel,
      messages: formattedMessages,
    };

    if (isReasoningModel) {
      const reasoningEffort = getThinkingParameters("openai", thinkingLevel);
      if (reasoningEffort) {
        payload.reasoning_effort = reasoningEffort;
      }
    }

    const response = await this.client.chat.completions.create(payload);

    const choice = response.choices?.[0];
    const content = choice?.message?.content || "";

    return {
      provider: "openai",
      model: targetModel,
      content: content,
      text: content,
      thinkingLevel: thinkingLevel,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      },
    };
  }
}

module.exports = OpenAIProvider;
