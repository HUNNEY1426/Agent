const BaseProvider = require("./baseProvider");

class ClaudeProvider extends BaseProvider {
  getName() {
    return "claude";
  }

  async generateResponse() {
    throw new Error("Claude provider is not implemented yet");
  }
}

module.exports = ClaudeProvider;
