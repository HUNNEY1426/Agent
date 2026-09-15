const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pdfService = require("../services/pdf/pdfService");

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const originalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${uniqueSuffix}-${originalName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".pdf" && file.mimetype !== "application/pdf") {
            return cb(new Error("Supported files: PDF only (.pdf)"));
        }
        cb(null, true);
    }
});

// Multipart PDF file upload and auto-indexing
router.post("/upload", (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || "File upload failed" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file provided. Please attach a .pdf file." });
        }

        try {
            const result = await pdfService.addPDF(req.file.path);
            res.json({
                success: true,
                duplicate: !!result.duplicate,
                metadata: result.metadata,
                filename: result.metadata?.originalFilename || req.file.originalname,
                message: result.duplicate
                    ? `📄 PDF '${result.metadata?.originalFilename || req.file.originalname}' is already indexed.`
                    : `✓ ${result.metadata?.originalFilename || req.file.originalname} uploaded and indexed`,
            });
        } catch (indexingError) {
            console.error("PDF Indexing Error:", indexingError);
            res.status(400).json({ error: indexingError.message || "Failed to index PDF document" });
        }
    });
});

// Add a PDF document by server file path
router.post("/add", async (req, res) => {
    const { path: filePath } = req.body;
    if (!filePath || !filePath.trim()) {
        return res.status(400).json({ error: "PDF file path is required" });
    }

    try {
        const result = await pdfService.addPDF(filePath.trim());
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// List indexed PDFs
router.get("/list", (req, res) => {
    try {
        const data = pdfService.listPDFs();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get status of PDF Knowledge Base
router.get("/status", (req, res) => {
    try {
        const status = pdfService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get info for a specific PDF
router.get("/info/:identifier", (req, res) => {
    const { identifier } = req.params;
    try {
        const info = pdfService.getPDFInfo(identifier);
        res.json(info);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// Select active PDF or all
router.post("/use", (req, res) => {
    const { name } = req.body;
    try {
        const result = pdfService.usePDF(name);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Search stored PDF knowledge without AI model
router.get("/search/:query", (req, res) => {
    const { query } = req.params;
    try {
        const results = pdfService.searchPDF(decodeURIComponent(query));
        res.json(results);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/search", (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ error: "Query parameter is required" });
    }
    try {
        const results = pdfService.searchPDF(query);
        res.json(results);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Remove a specific PDF
router.delete("/remove/:identifier", (req, res) => {
    const { identifier } = req.params;
    try {
        const result = pdfService.removePDF(identifier);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Clear complete PDF knowledge base
router.post("/clear", (req, res) => {
    try {
        const result = pdfService.clearPDFs();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Turn off PDF knowledge retrieval mode
router.post("/off", (req, res) => {
    try {
        const result = pdfService.turnOffPDF();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
