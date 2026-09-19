class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  getName() {
    return "base";
  }

  getCapabilities() {
    return {
      streaming: false,
      thinkingLevels: ["low", "medium", "high", "ultra"],
    };
  }

  isConfigured() {
    return true;
  }

  async generateResponse(messages = [], options = {}) {
    throw new Error(
      "generateResponse() must be implemented by the provider"
    );
  }

  async streamResponse(messages, options = {}, onToken = () => {}) {
    const result = await this.generateResponse(
      messages,
      options
    );

    onToken(result.content || result.text || "");
    return result;
  }

  async ask(messages, options = {}) {
    return this.generateResponse(messages, options);
  }

  async stream(messages, options = {}, onToken = () => {}) {
    return this.streamResponse(messages, options, onToken);
  }
}

module.exports = BaseProvider;
