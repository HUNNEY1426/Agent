const BaseProvider = require("./baseProvider");

class OpenRouterProvider extends BaseProvider {
  getName() {
    return "openrouter";
  }

  async generateResponse() {
    throw new Error("OpenRouter provider is not implemented yet");
  }
}

module.exports = OpenRouterProvider;
