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

const defaultProviders = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model:
      process.env.GEMINI_MODEL ||
      process.env.AI_MODEL ||
      "gemini-2.0-flash",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model:
      process.env.OPENAI_MODEL ||
      "gpt-4o-mini",
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model:
      process.env.CLAUDE_MODEL ||
      "claude-sonnet-4-20250514",
  },

  ollama: {
    baseUrl:
      process.env.OLLAMA_BASE_URL ||
      "http://localhost:11434",
    model:
      process.env.OLLAMA_MODEL ||
      "llama3.2",
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model:
      process.env.OPENROUTER_MODEL ||
      "liquid/lfm-2.5-2.6b:free",
  },
};

const aiConfig = {
  provider: process.env.AI_PROVIDER || "gemini",

  model:
    process.env.AI_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.0-flash",

  thinkingLevel: process.env.AI_THINKING_LEVEL || "medium",

  fallbackProviders: (process.env.AI_FALLBACK_PROVIDERS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),

  providers: defaultProviders,

  // Direct access compatibility
  get gemini() {
    return this.providers.gemini;
  },
  get openai() {
    return this.providers.openai;
  },
  get claude() {
    return this.providers.claude;
  },
  get ollama() {
    return this.providers.ollama;
  },
  get openrouter() {
    return this.providers.openrouter;
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

  const config = aiConfig.providers[provider];

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
