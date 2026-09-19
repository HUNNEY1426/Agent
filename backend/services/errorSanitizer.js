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
 * Returns a friendly, safe error description and HTTP status for a given provider error.
 * Accurately distinguishes between 401/403 auth, 400 invalid request, 404 model not found,
 * 429 quota/rate limit, 500 internal server, and 503 unavailable.
 */
function getFriendlyProviderError(providerName, rawError) {
  let errMsg = "";
  if (typeof rawError === "string") {
    errMsg = rawError;
  } else if (rawError) {
    errMsg = rawError.message || rawError.error || "";
    if (typeof errMsg !== "string") errMsg = "";
  }
  const lower = errMsg.toLowerCase();

  const providerDisplay = {
    gemini: "Gemini",
    openrouter: "OpenRouter",
    openai: "OpenAI",
    claude: "Claude",
    ollama: "Ollama",
  }[providerName] || (providerName ? providerName.charAt(0).toUpperCase() + providerName.slice(1) : "AI Provider");

  let status = rawError?.status || rawError?.statusCode || 0;
  let subReason = rawError?.providerReason || "";
  const lowerSubReason = (typeof subReason === "string" ? subReason : "").toLowerCase();
  let extractedDetail = "";

  // Attempt to parse JSON error structure if embedded in error message
  try {
    const jsonMatch = errMsg.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        if (!status && parsed.error.code) status = parsed.error.code;
        if (!subReason) {
          subReason = parsed.error.details?.[0]?.reason || parsed.error.status || "";
        }
        if (parsed.error.message) {
          extractedDetail = sanitizeString(parsed.error.message);
        }
      }
    }
  } catch (_) {}

  // Classification logic
  let reason = "An unexpected error occurred while contacting the provider.";
  let errorCode = "PROVIDER_ERROR";
  let statusCode = 500;

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("unauthenticated") ||
    lower.includes("access_token_type_unsupported") ||
    lowerSubReason.includes("access_token_type_unsupported") ||
    lower.includes("oauth token") ||
    lower.includes("api_key_service_blocked") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid_api_key") ||
    lower.includes("invalid gemini api key") ||
    lower.includes("incorrect api key") ||
    lower.includes("api key not valid") ||
    lower.includes("invalid authentication") ||
    lower.includes("invalid_token") ||
    lower.includes("unauthorized")
  ) {
    statusCode = 401;
    errorCode = "AUTHENTICATION_ERROR";
    if (
      lower.includes("access_token_type_unsupported") ||
      lowerSubReason.includes("access_token_type_unsupported") ||
      lower.includes("oauth token")
    ) {
      reason = `${providerDisplay} API key is invalid (received an OAuth/access token instead of a Gemini API key). Please generate a valid API key (starts with 'AIzaSy...') from Google AI Studio: https://aistudio.google.com/apikey and update GEMINI_API_KEY in backend/.env.`;
    } else if (lower.includes("api_key_service_blocked")) {
      reason = `${providerDisplay} API key is blocked by Google Cloud. Please ensure Generative Language API is enabled on your Google Cloud project.`;
    } else if (lower.includes("api_key_invalid") || lower.includes("api key not valid") || lower.includes("invalid gemini api key")) {
      reason = `${providerDisplay} API key is invalid. Please get a valid key from Google AI Studio (https://aistudio.google.com/apikey) and update GEMINI_API_KEY in backend/.env.`;
    } else {
      reason = `${providerDisplay} API authentication failed. Please check the server API key configuration in backend/.env.`;
    }
  } else if (
    lower.includes("api key is missing") ||
    lower.includes("not configured") ||
    lower.includes("missing api key")
  ) {
    statusCode = 401;
    errorCode = "KEY_NOT_CONFIGURED";
    reason = `${providerDisplay} API key is not configured on the server.`;
  } else if (
    status === 429 ||
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("too many requests")
  ) {
    statusCode = 429;
    errorCode = "RATE_LIMIT_EXCEEDED";
    reason = `${providerDisplay} rate limit exceeded or quota exhausted. Please retry in a few moments.`;
  } else if (
    status === 404 ||
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("no longer available") ||
    lower.includes("deprecated")
  ) {
    statusCode = 404;
    errorCode = "MODEL_NOT_FOUND";
    reason = `Selected model is unavailable or deprecated for ${providerDisplay}.`;
  } else if (
    status === 400 ||
    lower.includes("400") ||
    lower.includes("invalid_argument") ||
    lower.includes("bad request")
  ) {
    statusCode = 400;
    errorCode = "INVALID_REQUEST";
    reason = extractedDetail || `Invalid request or unsupported configuration parameters for ${providerDisplay}.`;
  } else if (
    lower.includes("econnrefused") ||
    lower.includes("connect to ollama") ||
    lower.includes("offline") ||
    lower.includes("11434")
  ) {
    statusCode = 503;
    errorCode = "SERVICE_OFFLINE";
    reason = `${providerDisplay} service is offline or unreachable at the configured host.`;
  } else if (
    status === 503 ||
    lower.includes("503") ||
    lower.includes("overloaded") ||
    lower.includes("unavailable")
  ) {
    statusCode = 503;
    errorCode = "SERVICE_UNAVAILABLE";
    reason = `${providerDisplay} service is temporarily overloaded or experiencing high traffic.`;
  } else if (
    status === 500 ||
    lower.includes("500") ||
    lower.includes("internal")
  ) {
    statusCode = 500;
    errorCode = "INTERNAL_ERROR";
    reason = `${providerDisplay} service encountered an internal server error.`;
  } else if (
    lower.includes("timeout") ||
    lower.includes("etimedout")
  ) {
    statusCode = 504;
    errorCode = "TIMEOUT";
    reason = `Request to ${providerDisplay} timed out.`;
  }

  return {
    provider: providerName,
    providerDisplay,
    reason,
    errorCode,
    statusCode,
    subReason: subReason || undefined,
  };
}

/**
 * Builds a safe error response payload for express routes.
 */
function createSafeErrorResponse(primaryProvider, error, attemptedErrors = []) {
  const foundAttempt = (attemptedErrors || []).find((a) => a.provider === primaryProvider);
  const specificError = foundAttempt || error;
  const primaryFriendly = getFriendlyProviderError(primaryProvider, specificError);

  const cleanErrors = (attemptedErrors || []).map((item) =>
    getFriendlyProviderError(item.provider, item)
  );

  return {
    error: `${primaryFriendly.providerDisplay}: ${primaryFriendly.reason}`,
    friendlyMessage: "Unable to generate a response.",
    failedProvider: primaryProvider,
    providerDisplay: primaryFriendly.providerDisplay,
    reason: primaryFriendly.reason,
    errorCode: primaryFriendly.errorCode,
    statusCode: primaryFriendly.statusCode,
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
