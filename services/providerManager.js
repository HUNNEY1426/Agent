const {
  aiConfig,
  supportedProviders,
  validateProvider,
  validateThinkingLevel,
  getProviderConfig,
} = require("../config/aiConfig");

const { getModels, getDefaultModel } = require("./modelRegistry");

const GeminiProvider = require("./providers/geminiProvider");
const OpenAIProvider = require("./providers/openaiProvider");
const ClaudeProvider = require("./providers/claudeProvider");
const OllamaProvider = require("./providers/ollamaProvider");
const OpenRouterProvider = require("./providers/openrouterProvider");

class ProviderManager {
  constructor() {
    this.providers = {};
    this.runtimeSettings = {
      provider: aiConfig.provider || "gemini",
      model: aiConfig.model || "gemini-2.0-flash",
      thinkingLevel: aiConfig.thinkingLevel || "medium",
    };
  }

  getCurrentSettings() {
    return {
      provider: this.runtimeSettings.provider,
      model: this.runtimeSettings.model,
      thinkingLevel: this.runtimeSettings.thinkingLevel,
    };
  }

  setProvider(provider) {
    validateProvider(provider);
    this.runtimeSettings.provider = provider;
    
    // Auto-update model to configured or default model for the new provider
    const providerConfigModel = aiConfig.providers?.[provider]?.model;
    const defaultModel = providerConfigModel || getDefaultModel(provider);
    this.runtimeSettings.model = defaultModel;
    return this.getCurrentSettings();
  }

  setModel(model, provider = this.runtimeSettings.provider) {
    validateProvider(provider);
    this.runtimeSettings.model = model;
    return this.getCurrentSettings();
  }

  setThinkingLevel(level) {
    validateThinkingLevel(level);
    this.runtimeSettings.thinkingLevel = level;
    return this.getCurrentSettings();
  }

  listProviders() {
    return [...supportedProviders];
  }

  listModels(provider = this.runtimeSettings.provider) {
    validateProvider(provider);
    return getModels(provider);
  }

  getProviderCapabilities(providerName = this.runtimeSettings.provider) {
    const provider = this.createProvider(providerName);
    return provider.getCapabilities();
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

      case "openai":
        provider = new OpenAIProvider(config);
        break;

      case "claude":
        provider = new ClaudeProvider(config);
        break;

      case "ollama":
        provider = new OllamaProvider(config);
        break;

      case "openrouter":
        provider = new OpenRouterProvider(config);
        break;

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }

    this.providers[providerName] = provider;
    return provider;
  }

  async generateResponse(messages, options = {}) {
    const providerName =
      options.provider ||
      this.runtimeSettings.provider ||
      aiConfig.provider;

    const model =
      options.model ||
      this.runtimeSettings.model ||
      aiConfig.model;

    const thinkingLevel =
      options.thinkingLevel ||
      this.runtimeSettings.thinkingLevel ||
      "medium";

    const fallbackProviders = [
      providerName,
      ...(options.fallbackProviders ||
        aiConfig.fallbackProviders ||
        []),
    ];

    const uniqueProviders = [...new Set(fallbackProviders)];
    const errors = [];

    for (const pName of uniqueProviders) {
      try {
        const providerInstance = this.createProvider(pName);

        let targetModel;
        if (options.model && pName === providerName) {
          targetModel = options.model;
        } else if (pName === this.runtimeSettings.provider && this.runtimeSettings.model) {
          targetModel = this.runtimeSettings.model;
        } else {
          targetModel = aiConfig.providers?.[pName]?.model || getDefaultModel(pName);
        }

        return await providerInstance.generateResponse(messages, {
          ...options,
          model: targetModel,
          thinkingLevel,
        });
      } catch (error) {
        errors.push({
          provider: pName,
          error: error.message,
        });

        console.error(
          `${pName} provider failed: ${error.message}`
        );
      }
    }

    throw new Error(
      `All AI providers failed: ${JSON.stringify(errors)}`
    );
  }

  async streamResponse(messages, options = {}, onToken = () => {}) {
    const providerName = options.provider || this.runtimeSettings.provider;
    const providerInstance = this.createProvider(providerName);
    return providerInstance.streamResponse(messages, options, onToken);
  }
}

module.exports = new ProviderManager();
