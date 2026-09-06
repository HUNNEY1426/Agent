class BaseProvider {
  constructor(config = {}) {
    this.config = config;
  }

  getName() {
    throw new Error("getName() must be implemented");
  }

  async generateResponse(messages = [], options = {}) {
    throw new Error(
      "generateResponse() must be implemented by the provider"
    );
  }

  async ask(messages, options = {}) {
    return this.generateResponse(messages, options);
  }

  async stream(messages, options = {}, onToken = () => {}) {
    throw new Error("stream() must be implemented");
  }

  isConfigured() {
    return true;
  }
}

module.exports = BaseProvider;
