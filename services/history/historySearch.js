"use strict";

/**
 * historySearch.js
 * BM25-inspired ranking over the corpus built by historyIndexer.
 * Returns the top-N most relevant past messages for a given query.
 */

const indexer = require("./historyIndexer");

// BM25 tuning parameters
const K1 = 1.5;   // term-frequency saturation
const B  = 0.75;  // length normalisation factor

// ──────────────────────────────────────────────────────────────
// BM25 scoring
// ──────────────────────────────────────────────────────────────

/**
 * Compute BM25 score for a single document (corpus entry) against
 * a set of query tokens.
 *
 * @param {object} entry        - corpus entry with .tokens array
 * @param {string[]} queryTokens
 * @param {number} avgDocLen    - average document length in tokens
 * @param {number} N            - total number of documents in corpus
 * @param {object} invertedIndex
 * @returns {number} BM25 score (higher = more relevant)
 */
function bm25Score(entry, queryTokens, avgDocLen, N, invertedIndex) {
    let score = 0;
    const docLen = entry.tokens.length;
    if (docLen === 0) return 0;

    // Pre-compute term frequency map for this document
    const tf = {};
    for (const t of entry.tokens) {
        tf[t] = (tf[t] || 0) + 1;
    }

    for (const qTerm of queryTokens) {
        const df = (invertedIndex[qTerm] || []).length;  // document frequency
        if (df === 0) continue;

        // IDF (Robertson-Sprärck Jones formula, floor at 0)
        const idf = Math.max(0, Math.log((N - df + 0.5) / (df + 0.5) + 1));

        // TF normalised with BM25 saturation + length normalisation
        const termFreq = tf[qTerm] || 0;
        const numerator = termFreq * (K1 + 1);
        const denominator = termFreq + K1 * (1 - B + B * (docLen / avgDocLen));

        score += idf * (numerator / denominator);
    }

    return score;
}

// ──────────────────────────────────────────────────────────────
// Public search API
// ──────────────────────────────────────────────────────────────

/**
 * Search previous chat sessions for messages relevant to the query.
 *
 * @param {string} query           - User's current question / input
 * @param {object} [opts]
 * @param {number} [opts.topK=8]   - Maximum results to return
 * @param {number} [opts.minScore=0.1] - Minimum BM25 score threshold
 * @param {string} [opts.excludeSession] - Session ID to exclude (current session)
 * @returns {Array<SearchResult>}
 *
 * SearchResult shape:
 * {
 *   sessionId   : string,
 *   sessionTitle: string,
 *   role        : "user" | "assistant",
 *   content     : string,
 *   msgIndex    : number,
 *   score       : number
 * }
 */
function search(query, opts = {}) {
    const {
        topK           = 8,
        minScore       = 0.1,
        excludeSession = null
    } = opts;

    // Always refresh so newly saved messages are included
    indexer.refreshChanged();

    const corpus        = indexer.getCorpus();
    const invertedIndex = indexer.getInvertedIndex();
    const N             = corpus.length;

    if (N === 0) return [];

    const queryTokens = indexer.tokenise(query);
    if (queryTokens.length === 0) return [];

    // Average document length across the corpus
    const avgDocLen = corpus.reduce((sum, e) => sum + e.tokens.length, 0) / N;

    // Score every document (only those touching at least one query term)
    const candidateIdxSet = new Set();
    for (const qTerm of queryTokens) {
        (invertedIndex[qTerm] || []).forEach(idx => candidateIdxSet.add(idx));
    }

    const scored = [];
    for (const idx of candidateIdxSet) {
        const entry = corpus[idx];
        if (excludeSession && entry.sessionId === excludeSession) continue;

        const score = bm25Score(entry, queryTokens, avgDocLen, N, invertedIndex);
        if (score >= minScore) {
            scored.push({ ...entry, score });
        }
    }

    // Sort descending by score and return topK
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}

/**
 * Group search results by session, returning sessions ordered by
 * their best matching message score.
 *
 * @param {string} query
 * @param {object} [opts]
 * @returns {Array<SessionGroup>}
 *
 * SessionGroup shape:
 * {
 *   sessionId   : string,
 *   sessionTitle: string,
 *   bestScore   : number,
 *   messages    : SearchResult[]
 * }
 */
function searchGrouped(query, opts = {}) {
    const results = search(query, { ...opts, topK: (opts.topK || 8) * 2 });

    const groups = {};
    for (const r of results) {
        if (!groups[r.sessionId]) {
            groups[r.sessionId] = {
                sessionId   : r.sessionId,
                sessionTitle: r.sessionTitle,
                bestScore   : 0,
                messages    : []
            };
        }
        const g = groups[r.sessionId];
        g.messages.push(r);
        if (r.score > g.bestScore) g.bestScore = r.score;
    }

    return Object.values(groups)
        .sort((a, b) => b.bestScore - a.bestScore);
}

module.exports = { search, searchGrouped };
