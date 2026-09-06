const {
  aiConfig,
  getProviderConfig,
  validateProvider,
} = require("../config/aiConfig");

const GeminiProvider = require("./providers/geminiProvider");

class ProviderManager {
  constructor() {
    this.providers = {};
  }

  createProvider(providerName) {
    validateProvider(providerName);

    if (this.providers[providerName]) {
      return this.providers[providerName];
    }

    const config = getProviderConfig(providerName);

    let provider;

    switch (providerName) {
      case "gemini":
        provider = new GeminiProvider(config);
        break;

      default:
        throw new Error(
          `${providerName} provider is not implemented yet`
        );
    }

    this.providers[providerName] = provider;

    return provider;
  }

  async generateResponse(messages, options = {}) {
    const primaryProvider =
      options.provider || aiConfig.provider;

    const fallbackProviders = [
      primaryProvider,
      ...(options.fallbackProviders ||
        aiConfig.fallbackProviders ||
        []),
    ];

    const uniqueProviders = [...new Set(fallbackProviders)];
    const errors = [];

    for (const providerName of uniqueProviders) {
      try {
        const provider = this.createProvider(providerName);

        return await provider.generateResponse(
          messages,
          options
        );
      } catch (error) {
        errors.push({
          provider: providerName,
          error: error.message,
        });

        console.error(
          `${providerName} provider failed: ${error.message}`
        );
      }
    }

    throw new Error(
      `All AI providers failed: ${JSON.stringify(errors)}`
    );
  }
}

module.exports = new ProviderManager();
