const {
  aiConfig,
  supportedProviders,
  validateProvider,
  validateThinkingLevel,
  getProviderConfig,
} = require("../config/aiConfig");

const { getModels, getDefaultModel } = require("./modelRegistry");
const { sanitizeString } = require("./errorSanitizer");

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
      provider: this.runtimeSettings.provider || aiConfig.provider || "gemini",
      model: this.runtimeSettings.model || aiConfig.model || "gemini-2.0-flash",
      thinkingLevel: this.runtimeSettings.thinkingLevel || aiConfig.thinkingLevel || "medium",
    };
  }

  isProviderConfigured(providerName) {
    validateProvider(providerName);
    const cfg = getProviderConfig(providerName);
    if (!cfg) return false;

    switch (providerName) {
      case "gemini":
        return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
      case "openrouter":
        return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
      case "openai":
        return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
      case "claude":
        return Boolean(cfg.apiKey && cfg.apiKey.trim().length > 0);
      case "ollama":
        return true; // Local service
      default:
        return false;
    }
  }

  getProviderStatusList() {
    const displayNames = {
      gemini: "Gemini",
      openrouter: "OpenRouter",
      openai: "OpenAI",
      claude: "Claude",
      ollama: "Ollama",
    };

    const thinkingSupport = {
      gemini: true,
      openrouter: true,
      openai: true,
      claude: false,
      ollama: false,
    };

    return supportedProviders.map((id) => {
      const configured = this.isProviderConfigured(id);
      let status = configured ? "ready" : "not_configured";
      let statusLabel = configured ? "Configured" : "Not configured";

      if (id === "ollama" && !configured) {
        status = "offline";
        statusLabel = "Offline";
      }

      const defaultMod = aiConfig.providers?.[id]?.model || getDefaultModel(id);

      return {
        id,
        name: displayNames[id] || id,
        configured,
        status,
        statusLabel,
        defaultModel: defaultMod,
        models: getModels(id),
        supportsThinking: thinkingSupport[id] || false,
      };
    });
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
    const config = getProviderConfig(providerName);

    if (this.providers[providerName]) {
      this.providers[providerName].config = config;
      if (this.providers[providerName].apiKey !== undefined) {
        this.providers[providerName].apiKey = config.apiKey;
      }
      return this.providers[providerName];
    }

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
    const primaryProvider =
      options.provider ||
      this.runtimeSettings.provider ||
      aiConfig.provider ||
      "gemini";

    const model =
      options.model ||
      (options.provider && options.provider !== this.runtimeSettings.provider ? undefined : this.runtimeSettings.model) ||
      aiConfig.providers?.[primaryProvider]?.model ||
      getDefaultModel(primaryProvider);

    const thinkingLevel =
      options.thinkingLevel ||
      this.runtimeSettings.thinkingLevel ||
      "medium";

    // Build ordered fallback chain
    const configuredFallbacks = (aiConfig.fallbackProviders && aiConfig.fallbackProviders.length > 0)
      ? aiConfig.fallbackProviders
      : [];

    const candidates = [
      primaryProvider,
      ...(options.fallbackProviders || configuredFallbacks),
      // Ensure other configured providers are also candidates if primary fails
      "gemini",
      "openrouter",
      "openai",
      "claude",
      "ollama",
    ];

    const uniqueProviders = [...new Set(candidates)];
    const attemptedErrors = [];

    for (const pName of uniqueProviders) {
      // If pName is not the primary requested provider, skip unconfigured providers
      if (pName !== primaryProvider && !this.isProviderConfigured(pName)) {
        continue;
      }

      try {
        const providerInstance = this.createProvider(pName);

        let targetModel;
        if (options.model && pName === primaryProvider) {
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
        const cleanMsg = sanitizeString(error.message);
        attemptedErrors.push({
          provider: pName,
          error: cleanMsg,
          status: error.status || error.statusCode || 0,
          providerReason: error.providerReason || "",
          rawError: error,
        });

        console.error(
          `[Provider Fallback] ${pName} provider failed (${error.status || 'err'}): ${cleanMsg}`
        );
      }
    }

    const err = new Error(
      `All AI providers failed: ${JSON.stringify(attemptedErrors)}`
    );
    err.attemptedErrors = attemptedErrors;
    err.primaryProvider = primaryProvider;
    throw err;
  }

  async streamResponse(messages, options = {}, onToken = () => {}) {
    const providerName = options.provider || this.runtimeSettings.provider;
    const providerInstance = this.createProvider(providerName);
    return providerInstance.streamResponse(messages, options, onToken);
  }
}

module.exports = new ProviderManager();
