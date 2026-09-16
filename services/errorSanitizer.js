"use strict";

/**
 * services/errorSanitizer.js
 * Sanitizes errors from AI providers to prevent exposing API keys, tokens,
 * internal paths, stack traces, or raw provider dumps to the client.
 */

// Patterns that might look like sensitive API keys or tokens
const SENSITIVE_PATTERNS = [
  /sk-proj-[A-Za-z0-9-_]+/gi,
  /sk-[A-Za-z0-9-_]{20,}/gi,
  /AIza[0-9A-Za-z-_]{35}/gi,
  /AQ\.[A-Za-z0-9-_]{30,}/gi,
  /Bearer\s+[A-Za-z0-9-_.]+/gi,
  /[a-f0-9]{32,64}/gi,
  /[A-Z0-9_]{10,}_KEY/gi,
];

function sanitizeString(str) {
  if (typeof str !== "string") return "";
  let result = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  // Strip local absolute file paths
  result = result.replace(/([a-zA-Z]:\\[^:<>"|\r\n]+|\/[a-zA-Z0-9_.-]+(\/[a-zA-Z0-9_.-]+)+)/g, "[PATH]");
  return result;
}

/**
 * Returns a friendly, safe error description for a given provider error.
 */
function getFriendlyProviderError(providerName, rawError) {
  const errMsg = typeof rawError === "string" ? rawError : rawError?.message || "";
  const lower = errMsg.toLowerCase();

  const providerDisplay = {
    gemini: "Gemini",
    openrouter: "OpenRouter",
    openai: "OpenAI",
    claude: "Claude",
    ollama: "Ollama",
  }[providerName] || (providerName ? providerName.charAt(0).toUpperCase() + providerName.slice(1) : "AI Provider");

  let reason = "An unexpected error occurred while contacting the provider.";

  if (
    lower.includes("401") ||
    lower.includes("unauthenticated") ||
    lower.includes("incorrect api key") ||
    lower.includes("invalid authentication") ||
    lower.includes("invalid_api_key") ||
    lower.includes("api_key_invalid") ||
    lower.includes("api key not valid") ||
    lower.includes("user not found")
  ) {
    reason = "API authentication failed. Please check the server configuration.";
  } else if (
    lower.includes("api key is missing") ||
    lower.includes("not configured") ||
    lower.includes("missing api key")
  ) {
    reason = `${providerDisplay} API key is not configured on the server.`;
  } else if (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests")
  ) {
    reason = `${providerDisplay} rate limit exceeded or quota exhausted.`;
  } else if (
    lower.includes("econnrefused") ||
    lower.includes("connect to ollama") ||
    lower.includes("offline") ||
    lower.includes("11434")
  ) {
    reason = `${providerDisplay} service is offline or unreachable.`;
  } else if (
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("no longer available") ||
    lower.includes("deprecated")
  ) {
    reason = `Selected model is unavailable for ${providerDisplay}.`;
  } else if (
    lower.includes("500") ||
    lower.includes("503") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable") ||
    lower.includes("timeout") ||
    lower.includes("etimedout")
  ) {
    reason = `${providerDisplay} service is temporarily overloaded or experiencing issues.`;
  }

  return {
    provider: providerName,
    providerDisplay,
    reason,
  };
}

/**
 * Builds a safe error response payload for express routes.
 */
function createSafeErrorResponse(primaryProvider, error, attemptedErrors = []) {
  const specificError = (attemptedErrors || []).find((a) => a.provider === primaryProvider)?.error || error;
  const primaryFriendly = getFriendlyProviderError(primaryProvider, specificError);

  const cleanErrors = (attemptedErrors || []).map((item) =>
    getFriendlyProviderError(item.provider, item.error)
  );

  return {
    error: `${primaryFriendly.providerDisplay}: ${primaryFriendly.reason}`,
    friendlyMessage: "Unable to generate a response.",
    failedProvider: primaryProvider,
    providerDisplay: primaryFriendly.providerDisplay,
    reason: primaryFriendly.reason,
    suggestedProvider: primaryProvider === "gemini" ? "openrouter" : "gemini",
    allFailed: cleanErrors.length > 0,
    attempts: cleanErrors,
  };
}

module.exports = {
  sanitizeString,
  getFriendlyProviderError,
  createSafeErrorResponse,
};
