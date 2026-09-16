"use strict";

/**
 * historyService.js
 * High-level service that wraps historyIndexer + historySearch
 * and provides user-scoped History RAG consumed by aiService and routes.
 */

const { search, searchGrouped }               = require("./historySearch");
const { buildIndex, getStats, refreshChanged } = require("./historyIndexer");

const MAX_CONTEXT_CHARS = 4000;

// Track history enabled/disabled state per user
const userHistoryState = {};

function isEnabled(userId = "default_user") {
    const cleanId = (userId || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (userHistoryState[cleanId] === undefined) {
        userHistoryState[cleanId] = true;
    }
    return userHistoryState[cleanId];
}

function enable(userId = "default_user") {
    const cleanId = (userId || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");
    userHistoryState[cleanId] = true;
}

function disable(userId = "default_user") {
    const cleanId = (userId || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");
    userHistoryState[cleanId] = false;
}

/**
 * Search history and return a context block ready for injection
 * into the AI prompt, plus citation metadata for specific user.
 */
function buildContext(query, currentSession = null, opts = {}, userId = "default_user") {
    if (!isEnabled(userId)) {
        return { hasContext: false, contextText: "", citations: [] };
    }

    const results = search(query, {
        topK          : opts.topK    || 8,
        minScore      : opts.minScore || 0.1,
        excludeSession: currentSession,
        userId
    });

    if (results.length === 0) {
        return { hasContext: false, contextText: "", citations: [] };
    }

    const lines   = [];
    const citations = [];
    let totalChars  = 0;

    for (const r of results) {
        const snippet = r.content.length > 500
            ? r.content.slice(0, 500) + "…"
            : r.content;

        const line = `[${r.sessionTitle} | ${r.role}]: ${snippet}`;
        if (totalChars + line.length > MAX_CONTEXT_CHARS) break;

        lines.push(line);
        totalChars += line.length;

        citations.push({
            sessionId   : r.sessionId,
            sessionTitle: r.sessionTitle,
            role        : r.role,
            snippet     : snippet.slice(0, 120) + (snippet.length > 120 ? "…" : "")
        });
    }

    if (lines.length === 0) {
        return { hasContext: false, contextText: "", citations: [] };
    }

    return {
        hasContext  : true,
        contextText : lines.join("\n"),
        citations
    };
}

function searchHistory(query, opts = {}, userId = "default_user") {
    refreshChanged(userId);
    return search(query, { ...opts, userId });
}

function searchHistoryGrouped(query, opts = {}, userId = "default_user") {
    refreshChanged(userId);
    return searchGrouped(query, { ...opts, userId });
}

function reindex(userId = "default_user") {
    buildIndex(userId);
    return getStats(userId);
}

function clear(userId = "default_user") {
    buildIndex(userId);
    return getStats(userId);
}

function use(mode, userId = "default_user") {
    const m = (mode || "").trim().toLowerCase();
    if (m === "off" || m === "disable" || m === "false") {
        disable(userId);
        return false;
    } else {
        enable(userId);
        return true;
    }
}

function getStatus(userId = "default_user") {
    const stats = getStats(userId);
    return {
        enabled      : isEnabled(userId),
        ...stats
    };
}

module.exports = {
    enable,
    disable,
    use,
    clear,
    isEnabled,
    buildContext,
    searchHistory,
    searchHistoryGrouped,
    reindex,
    getStatus
};
