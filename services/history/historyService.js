"use strict";

/**
 * historyService.js
 * High-level service that wraps historyIndexer + historySearch
 * and provides the main public API consumed by aiService and routes.
 */

const { search, searchGrouped }               = require("./historySearch");
const { buildIndex, getStats, refreshChanged } = require("./historyIndexer");

// Module-level state ──────────────────────────────────────────
let historyEnabled = true;   // toggled by /history on|off
const MAX_CONTEXT_CHARS = 4000; // hard cap on total injected characters

// ──────────────────────────────────────────────────────────────
// Enable / disable
// ──────────────────────────────────────────────────────────────

function enable()  { historyEnabled = true;  }
function disable() { historyEnabled = false; }
function isEnabled() { return historyEnabled; }

// ──────────────────────────────────────────────────────────────
// Core: build context for AI prompt injection
// ──────────────────────────────────────────────────────────────

/**
 * Search history and return a context block ready for injection
 * into the AI prompt, plus citation metadata.
 *
 * @param {string} query             - Current user question
 * @param {string} [currentSession]  - Active session ID to exclude
 * @param {object} [opts]
 * @param {number} [opts.topK=8]
 * @param {number} [opts.minScore=0.1]
 * @returns {{
 *   hasContext  : boolean,
 *   contextText : string,
 *   citations   : Array<{sessionId, sessionTitle, role, snippet}>
 * }}
 */
function buildContext(query, currentSession = null, opts = {}) {
    if (!historyEnabled) {
        return { hasContext: false, contextText: "", citations: [] };
    }

    const results = search(query, {
        topK          : opts.topK    || 8,
        minScore      : opts.minScore || 0.1,
        excludeSession: currentSession
    });

    if (results.length === 0) {
        return { hasContext: false, contextText: "", citations: [] };
    }

    // Build context text, respecting MAX_CONTEXT_CHARS
    const lines   = [];
    const citations = [];
    let totalChars  = 0;

    for (const r of results) {
        // Truncate individual messages to 500 chars
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

// ──────────────────────────────────────────────────────────────
// Wrappers for direct route/CLI access
// ──────────────────────────────────────────────────────────────

/**
 * Raw search returning scored message results.
 * @param {string} query
 * @param {object} [opts]
 * @returns {Array<SearchResult>}
 */
function searchHistory(query, opts = {}) {
    refreshChanged();
    return search(query, opts);
}

/**
 * Grouped search: results grouped by session.
 * @param {string} query
 * @param {object} [opts]
 * @returns {Array<SessionGroup>}
 */
function searchHistoryGrouped(query, opts = {}) {
    refreshChanged();
    return searchGrouped(query, opts);
}

/**
 * Force a full re-index of all session files.
 */
function reindex() {
    buildIndex();
    return getStats();
}

/**
 * Clear / reset and re-index the in-memory knowledge index.
 */
function clear() {
    buildIndex();
    return getStats();
}

/**
 * Toggle history state using a mode string ("on" | "off").
 */
function use(mode) {
    const m = (mode || "").trim().toLowerCase();
    if (m === "off" || m === "disable" || m === "false") {
        disable();
        return false;
    } else {
        enable();
        return true;
    }
}

/**
 * Return index statistics.
 */
function getStatus() {
    const stats = getStats();
    return {
        enabled      : historyEnabled,
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

