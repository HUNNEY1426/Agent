"use strict";

/**
 * historyIndexer.js
 * Builds and maintains a lightweight in-memory inverted index
 * over all saved session files in memory/sessions/.
 * Uses TF-IDF style scoring for BM25-like retrieval without
 * any external vector database or npm package.
 */

const fs   = require("fs");
const path = require("path");

const SESSION_DIR = path.join(__dirname, "../../memory/sessions");

// ──────────────────────────────────────────────────────────────
// Internal index data structures
// ──────────────────────────────────────────────────────────────

/**
 * Each entry in the flat message corpus:
 * {
 *   sessionId   : string,
 *   sessionTitle: string,
 *   role        : "user" | "assistant",
 *   content     : string,
 *   msgIndex    : number   (0-based position inside session.messages)
 *   tokens      : string[] (normalised word tokens)
 * }
 */
let corpus = [];

/**
 * Inverted index  →  term → [ corpusIdx, ... ]
 * Allows O(k) lookup where k = number of docs containing the term.
 */
let invertedIndex = {};

/** Track last-modified time per session file to enable incremental refresh */
const fileModTimes = {};

// ──────────────────────────────────────────────────────────────
// Tokenisation helpers
// ──────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
    "a","an","the","is","it","in","on","at","to","for","of","and",
    "or","but","be","are","was","were","this","that","with","from",
    "by","as","i","you","he","she","we","they","my","your","our",
    "their","what","which","who","how","when","where","why","not",
    "no","do","did","does","can","could","will","would","should",
    "have","has","had","been","so","if","then","than","about","up",
    "out","also","just","like","more","its","his","her","me","him",
    "us","them","there","here","all","some","any","one","two","time",
    "get","got","let","use","used","using","make","made","need",
    "know","want","give","see","say","said","go","come","take"
]);

/**
 * Tokenise a string: lowercase, strip punctuation, remove stop-words, dedup.
 * Returns an array of meaningful tokens (may contain duplicates for TF).
 */
function tokenise(text) {
    if (!text || typeof text !== "string") return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

// ──────────────────────────────────────────────────────────────
// Index building
// ──────────────────────────────────────────────────────────────

/**
 * Load a single session JSON file safely.
 * Returns null on error.
 */
function loadSessionFile(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8").trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Support both { messages: [] } and legacy raw-array formats
        if (Array.isArray(parsed)) {
            const name = path.basename(filePath, ".json");
            return { id: name, title: name, messages: parsed };
        }
        if (parsed && Array.isArray(parsed.messages)) return parsed;
        return null;
    } catch {
        return null;
    }
}

/**
 * (Re)build the entire index by scanning all session files.
 * Safe to call multiple times; resets and rebuilds from scratch.
 */
function buildIndex() {
    corpus       = [];
    invertedIndex = {};

    if (!fs.existsSync(SESSION_DIR)) return;

    const files = fs.readdirSync(SESSION_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => path.join(SESSION_DIR, f));

    for (const filePath of files) {
        _indexFile(filePath);
    }
}

/**
 * Index (or re-index) a single file.
 * Removes old entries for that file first so they are not duplicated.
 * @param {string} filePath
 */
function _indexFile(filePath) {
    const sessionId = path.basename(filePath, ".json");

    // Remove any existing corpus entries for this session
    const kept = corpus.filter(e => e.sessionId !== sessionId);
    corpus = kept;

    const session = loadSessionFile(filePath);
    if (!session) return;

    const sessionTitle = session.title || sessionId;

    (session.messages || []).forEach((msg, msgIndex) => {
        const content = (msg.content || msg.text || "").trim();
        if (!content) return;

        const tokens = tokenise(content);
        const entry = {
            sessionId,
            sessionTitle,
            role    : msg.role || "user",
            content,
            msgIndex,
            tokens
        };
        corpus.push(entry);
    });

    // Record modification time
    try {
        fileModTimes[filePath] = fs.statSync(filePath).mtimeMs;
    } catch { /* ignore */ }

    // Rebuild inverted index for new corpus
    _rebuildInvertedIndex();
}

function _rebuildInvertedIndex() {
    invertedIndex = {};
    corpus.forEach((entry, idx) => {
        const seen = new Set();
        for (const token of entry.tokens) {
            if (seen.has(token)) continue;
            seen.add(token);
            if (!invertedIndex[token]) invertedIndex[token] = [];
            invertedIndex[token].push(idx);
        }
    });
}

/**
 * Incrementally refresh any session files that have changed on disk
 * since the last index build.  Call this before every search to
 * pick up new messages automatically.
 */
function refreshChanged() {
    if (!fs.existsSync(SESSION_DIR)) return;

    const files = fs.readdirSync(SESSION_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => path.join(SESSION_DIR, f));

    let changed = false;
    for (const filePath of files) {
        try {
            const mtime = fs.statSync(filePath).mtimeMs;
            if ((fileModTimes[filePath] || 0) !== mtime) {
                _indexFile(filePath);
                changed = true;
            }
        } catch { /* ignore */ }
    }

    // If nothing changed but index is empty, do a full build
    if (!changed && corpus.length === 0) {
        buildIndex();
    }
}

// ──────────────────────────────────────────────────────────────
// Public interface
// ──────────────────────────────────────────────────────────────

/**
 * Return the raw corpus array (read-only).
 * Used by historySearch for scoring.
 */
function getCorpus() {
    return corpus;
}

/**
 * Return the inverted index (read-only).
 */
function getInvertedIndex() {
    return invertedIndex;
}

/**
 * Return basic statistics.
 */
function getStats() {
    const sessions = new Set(corpus.map(e => e.sessionId));
    return {
        totalMessages : corpus.length,
        totalSessions : sessions.size,
        totalTerms    : Object.keys(invertedIndex).length,
        sessions      : [...sessions]
    };
}

// Build the index once when this module is first loaded
buildIndex();

module.exports = {
    buildIndex,
    refreshChanged,
    getCorpus,
    getInvertedIndex,
    getStats,
    tokenise,         // exported so historySearch can reuse it
    SESSION_DIR
};
