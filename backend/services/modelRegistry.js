const models = {
  gemini: [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-3.6-flash",
  ],

  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "o1",
    "o3-mini",
  ],

  claude: [
    "claude-sonnet-4-20250514",
    "claude-3-5-haiku",
    "claude-3-7-sonnet",
  ],

  ollama: [
    "llama3.2",
    "mistral",
    "qwen2.5",
    "deepseek-r1",
  ],

  openrouter: [
    "liquid/lfm-2.5-2.6b:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
    "meta-llama/llama-3.3-70b-instruct",
  ],
};

function getModels(provider) {
  return models[provider] || [];
}

function isModelSupported(provider, model) {
  return getModels(provider).includes(model);
}

function getDefaultModel(provider) {
  const providerModels = getModels(provider);
  return providerModels[0] || "";
}

module.exports = {
  models,
  getModels,
  isModelSupported,
  getDefaultModel,
};
