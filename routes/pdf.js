const express = require("express");
const router = express.Router();
const pdfService = require("../services/pdf/pdfService");

// Add a PDF document
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
