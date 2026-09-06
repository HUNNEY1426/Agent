const BaseProvider = require("./baseProvider");

class OllamaProvider extends BaseProvider {
  getName() {
    return "ollama";
  }

  async generateResponse() {
    throw new Error("Ollama provider is not implemented yet");
  }
}

module.exports = OllamaProvider;
