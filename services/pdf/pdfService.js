const fs = require("fs");
const path = require("path");
const { extractPDFText } = require("./pdfExtractor");
const {
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

const BASE_DIR = path.join(__dirname, "../../memory/pdf");
const STATE_FILE = path.join(BASE_DIR, "state.json");

function loadState() {
    ensureDirectories();
    if (!fs.existsSync(STATE_FILE)) {
        const initialState = { enabled: false, activeDocumentId: "all" };
        fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2));
        return initialState;
    }
    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch (e) {
        return { enabled: false, activeDocumentId: "all" };
    }
}

function saveState(state) {
    ensureDirectories();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

class PDFService {
    constructor() {
        this.state = loadState();
    }

    getStatus() {
        this.state = loadState();
        const allDocs = getAllMetadata();
        let activeDocName = "All PDFs";

        if (this.state.activeDocumentId !== "all") {
            const activeMeta = getMetadata(this.state.activeDocumentId);
            activeDocName = activeMeta ? activeMeta.originalFilename : this.state.activeDocumentId;
        }

        return {
            enabled: !!this.state.enabled,
            activeDocumentId: this.state.activeDocumentId || "all",
            activeDocumentName: activeDocName,
            totalDocuments: allDocs.length,
            documents: allDocs,
        };
    }

    async addPDF(filePath) {
        const resolvedPath = path.resolve(filePath);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(resolvedPath);
        const originalFilename = path.basename(resolvedPath);

        // Check file hash for duplicate
        const fileHash = calculateFileHash(resolvedPath);
        const existing = findDuplicateByHash(fileHash);
        if (existing) {
            // Set active to existing duplicate
            this.state.enabled = true;
            this.state.activeDocumentId = existing.id;
            saveState(this.state);
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

        // Persist metadata, document, and index
        saveDocument({
            metadata,
            pages: extraction.pages,
            chunks,
        });

        // Automatically enable PDF mode and set active document
        this.state.enabled = true;
        this.state.activeDocumentId = docId;
        saveState(this.state);

        return {
            success: true,
            metadata,
            warning: extraction.warning,
        };
    }

    listPDFs() {
        this.state = loadState();
        const docs = getAllMetadata();
        return {
            enabled: this.state.enabled,
            activeDocumentId: this.state.activeDocumentId,
            documents: docs.map((doc) => ({
                ...doc,
                isActive:
                    this.state.enabled &&
                    (this.state.activeDocumentId === "all" || this.state.activeDocumentId === doc.id),
            })),
        };
    }

    getPDFInfo(identifier) {
        const meta = getMetadata(identifier);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }
        return meta;
    }

    usePDF(identifier) {
        this.state = loadState();
        if (!identifier || identifier.toLowerCase() === "all") {
            this.state.enabled = true;
            this.state.activeDocumentId = "all";
            saveState(this.state);
            return {
                success: true,
                activeDocumentId: "all",
                activeDocumentName: "All PDFs",
            };
        }

        const meta = getMetadata(identifier);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }

        this.state.enabled = true;
        this.state.activeDocumentId = meta.id;
        saveState(this.state);

        return {
            success: true,
            activeDocumentId: meta.id,
            activeDocumentName: meta.originalFilename,
        };
    }

    searchPDF(query, topK = 5) {
        this.state = loadState();
        const activeId = this.state.activeDocumentId || "all";
        return searchChunks(query, activeId, topK);
    }

    removePDF(identifier) {
        const meta = getMetadata(identifier);
        if (!meta) {
            throw new Error(`PDF document not found: '${identifier}'`);
        }

        const removed = removeDocument(meta.id);
        if (removed) {
            this.state = loadState();
            if (this.state.activeDocumentId === meta.id) {
                const remaining = getAllMetadata();
                this.state.activeDocumentId = remaining.length > 0 ? "all" : "all";
                if (remaining.length === 0) {
                    this.state.enabled = false;
                }
                saveState(this.state);
            }
        }
        return {
            success: true,
            removedName: meta.originalFilename,
        };
    }

    clearPDFs() {
        clearAllDocuments();
        this.state = { enabled: false, activeDocumentId: "all" };
        saveState(this.state);
        return {
            success: true,
            message: "PDF Knowledge Base cleared successfully",
        };
    }

    turnOffPDF() {
        this.state = loadState();
        this.state.enabled = false;
        saveState(this.state);
        return {
            success: true,
            enabled: false,
        };
    }

    buildContext(question, topK = 4) {
        this.state = loadState();
        if (!this.state.enabled) {
            return {
                hasContext: false,
                contextText: "",
                citations: [],
                chunks: [],
            };
        }

        const chunks = searchChunks(question, this.state.activeDocumentId, topK);

        if (chunks.length === 0) {
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
