"use strict";

/**
 * historySearch.js
 * BM25-inspired ranking over the corpus built by historyIndexer for a specific user.
 * Returns the top-N most relevant past messages for a given query.
 */

const indexer = require("./historyIndexer");

// BM25 tuning parameters
const K1 = 1.5;   // term-frequency saturation
const B  = 0.75;  // length normalisation factor

function bm25Score(entry, queryTokens, avgDocLen, N, invertedIndex) {
    let score = 0;
    const docLen = entry.tokens.length;
    if (docLen === 0) return 0;

    const tf = {};
    for (const t of entry.tokens) {
        tf[t] = (tf[t] || 0) + 1;
    }

    for (const qTerm of queryTokens) {
        const df = (invertedIndex[qTerm] || []).length;
        if (df === 0) continue;

        const idf = Math.max(0, Math.log((N - df + 0.5) / (df + 0.5) + 1));

        const termFreq = tf[qTerm] || 0;
        const numerator = termFreq * (K1 + 1);
        const denominator = termFreq + K1 * (1 - B + B * (docLen / avgDocLen));

        score += idf * (numerator / denominator);
    }

    return score;
}

function search(query, opts = {}) {
    const {
        topK           = 8,
        minScore       = 0.1,
        excludeSession = null,
        userId         = "default_user"
    } = opts;

    indexer.refreshChanged(userId);

    const corpus        = indexer.getCorpus(userId);
    const invertedIndex = indexer.getInvertedIndex(userId);
    const N             = corpus.length;

    if (N === 0) return [];

    const queryTokens = indexer.tokenise(query);
    if (queryTokens.length === 0) return [];

    const avgDocLen = corpus.reduce((sum, e) => sum + e.tokens.length, 0) / N;

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

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}

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
