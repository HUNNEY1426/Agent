const BaseProvider = require("./baseProvider");

class OpenAIProvider extends BaseProvider {
  getName() {
    return "openai";
  }

  async generateResponse() {
    throw new Error("OpenAI provider is not implemented yet");
  }
}

module.exports = OpenAIProvider;
