const Anthropic = require("@anthropic-ai/sdk");
const BaseProvider = require("./baseProvider");
const { getThinkingParameters } = require("../thinkingConfig");

class ClaudeProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);

    this.model = config.model || "claude-sonnet-4-20250514";
    if (config.apiKey) {
      this.client = new Anthropic({
        apiKey: config.apiKey,
      });
    }
  }

  getName() {
    return "claude";
  }

  getCapabilities() {
    return {
      streaming: true,
      thinkingLevels: ["high", "ultra"],
    };
  }

  isConfigured() {
    return Boolean(this.config.apiKey);
  }

  async generateResponse(messages = [], options = {}) {
    if (!this.config.apiKey) {
      throw new Error(
        "Anthropic API key is missing. Please configure ANTHROPIC_API_KEY in .env"
      );
    }

    if (!this.client) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }

    const targetModel = options.model || this.model;
    const thinkingLevel = options.thinkingLevel || this.config.thinkingLevel || "medium";

    let systemPrompt = "";
    const formattedMessages = [];

    for (const m of messages) {
      const content = m.content || m.text || "";
      if (m.role === "system") {
        systemPrompt += (systemPrompt ? "\n\n" : "") + content;
      } else {
        formattedMessages.push({
          role: m.role === "assistant" ? "assistant" : "user",
          content: content,
        });
      }
    }

    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: "user",
        content: "Hello",
      });
    }

    const useExtendedThinking = getThinkingParameters("claude", thinkingLevel);

    const payload = {
      model: targetModel,
      max_tokens: useExtendedThinking ? 8000 : 4096,
      messages: formattedMessages,
    };

    if (systemPrompt) {
      payload.system = systemPrompt;
    }

    if (useExtendedThinking && (targetModel.includes("3-7") || targetModel.includes("sonnet-4") || targetModel.includes("3-5-sonnet"))) {
      payload.thinking = {
        type: "enabled",
        budget_tokens: thinkingLevel === "ultra" ? 4096 : 2048,
      };
    }

    const response = await this.client.messages.create(payload);

    let content = "";
    if (Array.isArray(response.content)) {
      content = response.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
    }

    return {
      provider: "claude",
      model: targetModel,
      content: content,
      text: content,
      thinkingLevel: thinkingLevel,
      usage: {
        inputTokens: response.usage?.input_tokens || 0,
        outputTokens: response.usage?.output_tokens || 0,
        totalTokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
    };
  }
}

module.exports = ClaudeProvider;
