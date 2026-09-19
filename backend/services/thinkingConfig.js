const thinkingLevels = {
  low: {
    label: "Low",
    description: "Fast response with minimum reasoning effort",
  },

  medium: {
    label: "Medium",
    description: "Balanced speed and reasoning",
  },

  high: {
    label: "High",
    description: "More reasoning for complex tasks",
  },

  ultra: {
    label: "Ultra",
    description: "Maximum available reasoning effort",
  },
};

function getThinkingLevel(level = "medium") {
  return thinkingLevels[level] || thinkingLevels.medium;
}

function getThinkingParameters(provider, level) {
  const safeLevel = level || "medium";

  /*
   Provider-specific mapping:
   - OpenAI: use reasoning_effort where supported
   - Gemini: use thinkingConfig where supported by installed SDK/model
   - Claude: use extended thinking only where supported
   - Ollama: use model-specific options where supported
   - OpenRouter: forward compatible reasoning parameters where supported
   */

  const mappings = {
    openai: {
      low: "low",
      medium: "medium",
      high: "high",
      ultra: "high",
    },

    gemini: {
      low: 512,
      medium: 1024,
      high: 4096,
      ultra: 8192,
    },

    claude: {
      low: false,
      medium: false,
      high: true,
      ultra: true,
    },

    ollama: {
      low: 0,
      medium: 1024,
      high: 4096,
      ultra: 8192,
    },

    openrouter: {
      low: false,
      medium: true,
      high: true,
      ultra: true,
    },
  };

  return mappings[provider]?.[safeLevel];
}

module.exports = {
  thinkingLevels,
  getThinkingLevel,
  getThinkingParameters,
};
