const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE_DIR = path.join(__dirname, "../../memory/pdf");
const METADATA_DIR = path.join(BASE_DIR, "metadata");
const DOCUMENTS_DIR = path.join(BASE_DIR, "documents");
const INDEXES_DIR = path.join(BASE_DIR, "indexes");

// English stop words for lightweight token filtering
const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if", "in",
    "into", "is", "it", "no", "not", "of", "on", "or", "such", "that", "the",
    "their", "then", "there", "these", "they", "this", "to", "was", "will", "with"
]);

function ensureDirectories() {
    [BASE_DIR, METADATA_DIR, DOCUMENTS_DIR, INDEXES_DIR].forEach((dir) => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

/**
 * Tokenize and normalize text into terms.
 */
function tokenize(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Calculate SHA-256 hash of a file for duplicate detection.
 */
function calculateFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    return hashSum.digest("hex");
}

/**
 * Split extracted PDF pages into chunks with overlap.
 */
function chunkPages(pages, documentId, documentName, chunkSize = 800, chunkOverlap = 200) {
    const chunks = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
        const text = page.text;
        if (!text || text.trim().length === 0) continue;

        if (text.length <= chunkSize) {
            chunks.push({
                id: `${documentId}_c${globalChunkIndex}`,
                documentId,
                documentName,
                pageNumber: page.pageNumber,
                chunkIndex: globalChunkIndex,
                text: text.trim(),
                tokens: tokenize(text),
            });
            globalChunkIndex++;
        } else {
            let start = 0;
            while (start < text.length) {
                let end = start + chunkSize;
                if (end < text.length) {
                    // Try to break at newline or space
                    const lastSpace = text.lastIndexOf(" ", end);
                    if (lastSpace > start + chunkSize / 2) {
                        end = lastSpace;
                    }
                } else {
                    end = text.length;
                }

                const chunkText = text.slice(start, end).trim();
                if (chunkText.length > 0) {
                    chunks.push({
                        id: `${documentId}_c${globalChunkIndex}`,
                        documentId,
                        documentName,
                        pageNumber: page.pageNumber,
                        chunkIndex: globalChunkIndex,
                        text: chunkText,
                        tokens: tokenize(chunkText),
                    });
                    globalChunkIndex++;
                }

                if (end >= text.length) break;
                start = end - chunkOverlap;
            }
        }
    }

    return chunks;
}

/**
 * Check if a PDF has already been indexed (by hash).
 */
function findDuplicateByHash(fileHash) {
    ensureDirectories();
    const files = fs.readdirSync(METADATA_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(METADATA_DIR, file), "utf8"));
            if (meta.fileHash === fileHash) {
                return meta;
            }
        } catch (e) {}
    }
    return null;
}

/**
 * Save document metadata, pages, and chunk index.
 */
function saveDocument({ metadata, pages, chunks }) {
    ensureDirectories();
    const docId = metadata.id;

    fs.writeFileSync(path.join(METADATA_DIR, `${docId}.json`), JSON.stringify(metadata, null, 2));
    fs.writeFileSync(path.join(DOCUMENTS_DIR, `${docId}.json`), JSON.stringify({ id: docId, pages }, null, 2));
    fs.writeFileSync(path.join(INDEXES_DIR, `${docId}.json`), JSON.stringify({ id: docId, chunks }, null, 2));
}

/**
 * Get metadata for a specific document by ID or filename.
 */
function getMetadata(identifier) {
    ensureDirectories();
    const files = fs.readdirSync(METADATA_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(METADATA_DIR, file), "utf8"));
            if (
                meta.id === identifier ||
                meta.originalFilename.toLowerCase() === identifier.toLowerCase() ||
                file === `${identifier}.json`
            ) {
                return meta;
            }
        } catch (e) {}
    }
    return null;
}

/**
 * Get all document metadata list.
 */
function getAllMetadata() {
    ensureDirectories();
    const files = fs.readdirSync(METADATA_DIR).filter((f) => f.endsWith(".json"));
    const list = [];
    for (const file of files) {
        try {
            const meta = JSON.parse(fs.readFileSync(path.join(METADATA_DIR, file), "utf8"));
            list.push(meta);
        } catch (e) {}
    }
    return list.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
}

/**
 * Delete index files for a document.
 */
function removeDocument(docId) {
    ensureDirectories();
    const meta = getMetadata(docId);
    if (!meta) return false;

    const actualId = meta.id;
    [METADATA_DIR, DOCUMENTS_DIR, INDEXES_DIR].forEach((dir) => {
        const filePath = path.join(dir, `${actualId}.json`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
    return true;
}

/**
 * Delete all PDF indexes.
 */
function clearAllDocuments() {
    ensureDirectories();
    [METADATA_DIR, DOCUMENTS_DIR, INDEXES_DIR].forEach((dir) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith(".json")) {
                fs.unlinkSync(path.join(dir, file));
            }
        }
    });
}

/**
 * BM25 / TF-IDF chunk retrieval engine.
 */
function searchChunks(query, activeDocIds = "all", topK = 5) {
    ensureDirectories();

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 && !query.trim()) {
        return [];
    }

    const allDocs = getAllMetadata();
    let targetDocIds = [];

    if (activeDocIds === "all" || !activeDocIds) {
        targetDocIds = allDocs.map((d) => d.id);
    } else if (Array.isArray(activeDocIds)) {
        targetDocIds = activeDocIds;
    } else {
        targetDocIds = [activeDocIds];
    }

    if (targetDocIds.length === 0) {
        return [];
    }

    // Load chunks from target documents
    const candidateChunks = [];
    for (const docId of targetDocIds) {
        const indexFile = path.join(INDEXES_DIR, `${docId}.json`);
        if (fs.existsSync(indexFile)) {
            try {
                const indexData = JSON.parse(fs.readFileSync(indexFile, "utf8"));
                if (Array.isArray(indexData.chunks)) {
                    candidateChunks.push(...indexData.chunks);
                }
            } catch (e) {}
        }
    }

    if (candidateChunks.length === 0) {
        return [];
    }

    const normalizedQuery = query.toLowerCase().trim();
    const queryTermSet = new Set(queryTokens);

    // Document frequency (DF) calculation for BM25
    const totalDocs = candidateChunks.length;
    const docFreq = {};
    for (const token of queryTokens) {
        docFreq[token] = 0;
        for (const chunk of candidateChunks) {
            if (chunk.tokens && chunk.tokens.includes(token)) {
                docFreq[token]++;
            }
        }
    }

    // Score chunks
    const scoredChunks = candidateChunks.map((chunk) => {
        let score = 0;
        const chunkTokens = chunk.tokens || [];
        const chunkTextLower = chunk.text.toLowerCase();

        // Exact phrase match bonus
        if (chunkTextLower.includes(normalizedQuery)) {
            score += 15;
        }

        // BM25 term scoring
        const termFreqs = {};
        for (const token of chunkTokens) {
            termFreqs[token] = (termFreqs[token] || 0) + 1;
        }

        for (const token of queryTokens) {
            const tf = termFreqs[token] || 0;
            if (tf > 0) {
                const df = docFreq[token] || 1;
                const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
                // BM25 formula parameters k1=1.2, b=0.75
                const lenRatio = chunkTokens.length / 100;
                const tfScore = (tf * 2.2) / (tf + 1.2 * (1 - 0.75 + 0.75 * lenRatio));
                score += idf * tfScore;
            }
        }

        return {
            ...chunk,
            score,
        };
    });

    // Filter chunks with positive score and sort descending
    return scoredChunks
        .filter((chunk) => chunk.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

module.exports = {
    ensureDirectories,
    tokenize,
    calculateFileHash,
    chunkPages,
    findDuplicateByHash,
    saveDocument,
    getMetadata,
    getAllMetadata,
    removeDocument,
    clearAllDocuments,
    searchChunks,
};
