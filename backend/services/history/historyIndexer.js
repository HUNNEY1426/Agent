"use strict";

/**
 * historyIndexer.js
 * Builds and maintains a lightweight in-memory inverted index
 * over user-specific session files in memory/users/<userId>/sessions/.
 */

const fs   = require("fs");
const path = require("path");
const { getUserSessionDir } = require("../sessionService");

// Per-user index storage
// userId -> { corpus: [], invertedIndex: {}, fileModTimes: {} }
const userIndices = {};

function getUserIndexState(userId = "default_user") {
    const cleanId = (userId || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");
    if (!userIndices[cleanId]) {
        userIndices[cleanId] = {
            corpus: [],
            invertedIndex: {},
            fileModTimes: {}
        };
    }
    return userIndices[cleanId];
}

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

function tokenise(text) {
    if (!text || typeof text !== "string") return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function loadSessionFile(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8").trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw);
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

function buildIndex(userId = "default_user") {
    const state = getUserIndexState(userId);
    state.corpus = [];
    state.invertedIndex = {};

    const sessionDir = getUserSessionDir(userId);
    if (!fs.existsSync(sessionDir)) return;

    const files = fs.readdirSync(sessionDir)
        .filter(f => f.endsWith(".json"))
        .map(f => path.join(sessionDir, f));

    for (const filePath of files) {
        _indexFile(filePath, userId);
    }
}

function _indexFile(filePath, userId = "default_user") {
    const state = getUserIndexState(userId);
    const sessionId = path.basename(filePath, ".json");

    state.corpus = state.corpus.filter(e => e.sessionId !== sessionId);

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
        state.corpus.push(entry);
    });

    try {
        state.fileModTimes[filePath] = fs.statSync(filePath).mtimeMs;
    } catch { /* ignore */ }

    _rebuildInvertedIndex(userId);
}

function _rebuildInvertedIndex(userId = "default_user") {
    const state = getUserIndexState(userId);
    state.invertedIndex = {};
    state.corpus.forEach((entry, idx) => {
        const seen = new Set();
        for (const token of entry.tokens) {
            if (seen.has(token)) continue;
            seen.add(token);
            if (!state.invertedIndex[token]) state.invertedIndex[token] = [];
            state.invertedIndex[token].push(idx);
        }
    });
}

function refreshChanged(userId = "default_user") {
    const sessionDir = getUserSessionDir(userId);
    if (!fs.existsSync(sessionDir)) return;

    const state = getUserIndexState(userId);
    const files = fs.readdirSync(sessionDir)
        .filter(f => f.endsWith(".json"))
        .map(f => path.join(sessionDir, f));

    let changed = false;
    for (const filePath of files) {
        try {
            const mtime = fs.statSync(filePath).mtimeMs;
            if ((state.fileModTimes[filePath] || 0) !== mtime) {
                _indexFile(filePath, userId);
                changed = true;
            }
        } catch { /* ignore */ }
    }

    if (!changed && state.corpus.length === 0 && files.length > 0) {
        buildIndex(userId);
    }
}

function getCorpus(userId = "default_user") {
    return getUserIndexState(userId).corpus;
}

function getInvertedIndex(userId = "default_user") {
    return getUserIndexState(userId).invertedIndex;
}

function getStats(userId = "default_user") {
    const state = getUserIndexState(userId);
    const sessions = new Set(state.corpus.map(e => e.sessionId));
    return {
        totalMessages : state.corpus.length,
        totalSessions : sessions.size,
        totalTerms    : Object.keys(state.invertedIndex).length,
        sessions      : [...sessions]
    };
}

module.exports = {
    buildIndex,
    refreshChanged,
    getCorpus,
    getInvertedIndex,
    getStats,
    tokenise
};
