require("dotenv").config();

const supportedProviders = [
  "gemini",
  "openai",
  "claude",
  "ollama",
  "openrouter",
];

const aiConfig = {
  provider: process.env.AI_PROVIDER || "gemini",

  fallbackProviders: process.env.AI_FALLBACK_PROVIDERS
    ? process.env.AI_FALLBACK_PROVIDERS
        .split(",")
        .map((provider) => provider.trim())
        .filter(Boolean)
    : [],

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model:
      process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514",
  },

  ollama: {
    baseUrl:
      process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3.2",
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model:
      process.env.OPENROUTER_MODEL ||
      "google/gemini-2.0-flash-exp:free",
  },
};

function validateProvider(provider) {
  if (!supportedProviders.includes(provider)) {
    throw new Error(
      `Unknown provider: ${provider}. Available providers: ${supportedProviders.join(
        ", "
      )}`
    );
  }
}

function getProviderConfig(provider = aiConfig.provider) {
  validateProvider(provider);

  const config = aiConfig[provider];

  if (provider !== "ollama" && !config.apiKey) {
    throw new Error(
      `${provider} API key is missing. Please configure it in .env`
    );
  }

  return config;
}

module.exports = {
  aiConfig,
  supportedProviders,
  validateProvider,
  getProviderConfig,
};
