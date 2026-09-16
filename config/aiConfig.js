require("dotenv").config();

const supportedThinkingLevels = [
  "low",
  "medium",
  "high",
  "ultra",
];

const supportedProviders = [
  "gemini",
  "openai",
  "claude",
  "ollama",
  "openrouter",
];

function getProviderSettings(provider) {
  switch (provider) {
    case "gemini":
      return {
        apiKey: process.env.GEMINI_API_KEY || "",
        model:
          process.env.GEMINI_MODEL ||
          process.env.AI_MODEL ||
          "gemini-2.0-flash",
      };
    case "openai":
      return {
        apiKey: process.env.OPENAI_API_KEY || "",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      };
    case "claude":
      return {
        apiKey: process.env.ANTHROPIC_API_KEY || "",
        model:
          process.env.CLAUDE_MODEL ||
          "claude-sonnet-4-20250514",
      };
    case "ollama":
      return {
        baseUrl:
          process.env.OLLAMA_BASE_URL ||
          "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "llama3.2",
      };
    case "openrouter":
      return {
        apiKey: process.env.OPENROUTER_API_KEY || "",
        model:
          process.env.OPENROUTER_MODEL ||
          "liquid/lfm-2.5-2.6b:free",
      };
    default:
      return {};
  }
}

const aiConfig = {
  get provider() {
    return process.env.AI_PROVIDER || "gemini";
  },

  get model() {
    return (
      process.env.AI_MODEL ||
      process.env.GEMINI_MODEL ||
      "gemini-2.0-flash"
    );
  },

  get thinkingLevel() {
    return process.env.AI_THINKING_LEVEL || "medium";
  },

  get fallbackProviders() {
    return (process.env.AI_FALLBACK_PROVIDERS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  },

  get providers() {
    return {
      get gemini() {
        return getProviderSettings("gemini");
      },
      get openai() {
        return getProviderSettings("openai");
      },
      get claude() {
        return getProviderSettings("claude");
      },
      get ollama() {
        return getProviderSettings("ollama");
      },
      get openrouter() {
        return getProviderSettings("openrouter");
      },
    };
  },

  // Direct access compatibility
  get gemini() {
    return getProviderSettings("gemini");
  },
  get openai() {
    return getProviderSettings("openai");
  },
  get claude() {
    return getProviderSettings("claude");
  },
  get ollama() {
    return getProviderSettings("ollama");
  },
  get openrouter() {
    return getProviderSettings("openrouter");
  },
};

function validateProvider(provider) {
  if (!supportedProviders.includes(provider)) {
    throw new Error(
      `Unsupported provider: ${provider}. Supported providers: ${supportedProviders.join(", ")}`
    );
  }
}

function validateThinkingLevel(level) {
  if (!supportedThinkingLevels.includes(level)) {
    throw new Error(
      `Unsupported thinking level: ${level}. Use: low, medium, high, ultra`
    );
  }
}

function getProviderConfig(provider = aiConfig.provider) {
  validateProvider(provider);
  const config = getProviderSettings(provider);

  return {
    ...config,
    thinkingLevel: aiConfig.thinkingLevel,
  };
}

module.exports = {
  aiConfig,
  supportedProviders,
  supportedThinkingLevels,
  validateProvider,
  validateThinkingLevel,
  getProviderConfig,
};
