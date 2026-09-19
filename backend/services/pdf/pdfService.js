const fs = require("fs");
const path = require("path");
const { extractPDFText } = require("./pdfExtractor");
const {
    getPDFDirs,
    ensureDirectories,
    calculateFileHash,
    chunkPages,
    findDuplicateByHash,
    saveDocument,
    getMetadata,
    getAllMetadata,
    removeDocument,
    clearAllDocuments,
    searchChunks,
} = require("./pdfIndexer");

function getStateFilePath(userId) {
    const { baseDir } = getPDFDirs(userId);
    return path.join(baseDir, "state.json");
}

function loadState(userId) {
    const stateFile = getStateFilePath(userId);
    if (!fs.existsSync(stateFile)) {
        const initialState = { enabled: false, activeDocumentId: "all" };
        try {
            fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
        } catch (e) {}
        return initialState;
    }
    try {
        return JSON.parse(fs.readFileSync(stateFile, "utf8"));
    } catch (e) {
        return { enabled: false, activeDocumentId: "all" };
    }
}

function saveState(state, userId) {
    const stateFile = getStateFilePath(userId);
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

class PDFService {
    getStatus(userId) {
        const state = loadState(userId);
        const allDocs = getAllMetadata(userId);
        let activeDocName = "All PDFs";

        if (state.activeDocumentId !== "all") {
            const activeMeta = getMetadata(state.activeDocumentId, userId);
            activeDocName = activeMeta ? activeMeta.originalFilename : state.activeDocumentId;
        }

        return {
            enabled: !!state.enabled,
            activeDocumentId: state.activeDocumentId || "all",
            activeDocumentName: activeDocName,
            totalDocuments: allDocs.length,
            documents: allDocs,
        };
    }

    async addPDF(filePath, userId) {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(resolvedPath);
        const originalFilename = path.basename(resolvedPath);

        // Check file hash for duplicate within user's library
        const fileHash = calculateFileHash(resolvedPath);
        const existing = findDuplicateByHash(fileHash, userId);
        if (existing) {
            const state = loadState(userId);
            state.enabled = true;
            state.activeDocumentId = existing.id;
            saveState(state, userId);
            return {
                duplicate: true,
                metadata: existing,
                message: `📄 PDF '${existing.originalFilename}' is already indexed.`,
            };
        }

        // Extract text page-by-page
        const extraction = await extractPDFText(resolvedPath);

        // Generate ID
        const docId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        // Chunk text
        const chunks = chunkPages(extraction.pages, docId, originalFilename);

        const metadata = {
            id: docId,
            originalFilename,
            filePath: resolvedPath,
            fileSize: stats.size,
            addedAt: now,
            updatedAt: now,
            pageCount: extraction.pageCount,
            chunkCount: chunks.length,
            activeStatus: true,
            fileHash,
        };

        // Persist metadata, document, and index for this user
        saveDocument({
            metadata,
            pages: extraction.pages,
            chunks,
        }, userId);

        // Automatically enable PDF mode and set active document for user
        const state = loadState(userId);
        state.enabled = true;
        state.activeDocumentId = docId;
        saveState(state, userId);

        return {
            success: true,
            metadata,
            warning: extraction.warning,
        };
    }

    listPDFs(userId) {
        const state = loadState(userId);
        const docs = getAllMetadata(userId);
        return {
            enabled: state.enabled,
            activeDocumentId: state.activeDocumentId,
            documents: docs.map((doc) => ({
                ...doc,
                isActive:
                    state.enabled &&
                    (state.activeDocumentId === "all" || state.activeDocumentId === doc.id),
            })),
        };
    }

    getPDFInfo(identifier, userId) {
        const meta = getMetadata(identifier, userId);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }
        return meta;
    }

    usePDF(identifier, userId) {
        const state = loadState(userId);
        if (!identifier || identifier.toLowerCase() === "all") {
            state.enabled = true;
            state.activeDocumentId = "all";
            saveState(state, userId);
            return {
                success: true,
                activeDocumentId: "all",
                activeDocumentName: "All PDFs",
            };
        }

        const meta = getMetadata(identifier, userId);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }

        state.enabled = true;
        state.activeDocumentId = meta.id;
        saveState(state, userId);

        return {
            success: true,
            activeDocumentId: meta.id,
            activeDocumentName: meta.originalFilename,
        };
    }

    searchPDF(query, topK = 5, userId = null) {
        const state = loadState(userId);
        const activeId = state.activeDocumentId || "all";
        return searchChunks(query, activeId, topK, userId);
    }

    removePDF(identifier, userId) {
        const meta = getMetadata(identifier, userId);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }

        const removed = removeDocument(meta.id, userId);
        if (removed) {
            const state = loadState(userId);
            if (state.activeDocumentId === meta.id) {
                const remaining = getAllMetadata(userId);
                state.activeDocumentId = "all";
                if (remaining.length === 0) {
                    state.enabled = false;
                }
                saveState(state, userId);
            }
        }
        return {
            success: true,
            removedName: meta.originalFilename,
        };
    }

    clearPDFs(userId) {
        clearAllDocuments(userId);
        const state = { enabled: false, activeDocumentId: "all" };
        saveState(state, userId);
        return {
            success: true,
            message: "PDF Knowledge Base cleared successfully",
        };
    }

    turnOffPDF(userId) {
        const state = loadState(userId);
        state.enabled = false;
        saveState(state, userId);
        return {
            success: true,
            enabled: false,
        };
    }

    buildContext(question, topK = 4, targetDoc = null, userId = null) {
        const state = loadState(userId);

        let activeId = state.activeDocumentId || "all";

        // If a specific document or file list was attached to the request, resolve it
        if (targetDoc) {
            if (Array.isArray(targetDoc) && targetDoc.length > 0) {
                const resolvedIds = targetDoc
                    .map((d) => {
                        const ident = typeof d === "object" ? d.id || d.name || d.originalFilename : d;
                        const meta = getMetadata(ident, userId);
                        return meta ? meta.id : ident;
                    })
                    .filter(Boolean);

                if (resolvedIds.length > 0) {
                    activeId = resolvedIds;
                }
            } else if (typeof targetDoc === "string" || typeof targetDoc === "object") {
                const ident = typeof targetDoc === "object" ? targetDoc.id || targetDoc.name || targetDoc.originalFilename : targetDoc;
                const meta = getMetadata(ident, userId);
                if (meta) {
                    activeId = meta.id;
                } else if (ident) {
                    activeId = ident;
                }
            }
        } else if (!state.enabled) {
            return {
                hasContext: false,
                contextText: "",
                citations: [],
                chunks: [],
            };
        }

        const chunks = searchChunks(question, activeId, topK, userId);

        if (!chunks || chunks.length === 0) {
            return {
                hasContext: false,
                contextText: "",
                citations: [],
                chunks: [],
            };
        }

        // Build formatted citations and context block
        const citationsSet = new Set();
        const contextBlocks = chunks.map((c) => {
            const citationStr = `${c.documentName} — Page ${c.pageNumber}`;
            citationsSet.add(citationStr);
            return `[Document: ${c.documentName} | Page ${c.pageNumber}]\n${c.text}`;
        });

        const citations = Array.from(citationsSet);
        const contextText = contextBlocks.join("\n\n---\n\n");

        return {
            hasContext: true,
            contextText,
            citations,
            chunks,
        };
    }
}

module.exports = new PDFService();
