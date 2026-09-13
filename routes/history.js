"use strict";

/**
 * routes/history.js
 * REST endpoints for the Persistent Chat History RAG system.
 */

const express        = require("express");
const historyService = require("../services/history/historyService");

const router = express.Router();

// ── GET /history/status ─────────────────────────────────────
router.get("/status", (req, res) => {
    try {
        const status = historyService.getStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /history/search?q=...&topK=5 or /history/search/:query
router.get("/search", (req, res) => {
    try {
        const query = (req.query.q || req.query.query || "").trim();
        if (!query) return res.status(400).json({ error: "q parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const results = historyService.searchHistory(query, { topK, minScore });
        res.json({ query, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/search/:query", (req, res) => {
    try {
        const query = (req.params.query || "").trim();
        if (!query) return res.status(400).json({ error: "query parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const results = historyService.searchHistory(query, { topK, minScore });
        res.json({ query, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /history/search/grouped?q=... ───────────────────────
router.get("/search/grouped", (req, res) => {
    try {
        const query = (req.query.q || req.query.query || "").trim();
        if (!query) return res.status(400).json({ error: "q parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const groups = historyService.searchHistoryGrouped(query, { topK, minScore });
        res.json({ query, groups });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /history/use ────────────────────────────────────────
router.post("/use", (req, res) => {
    try {
        const mode = (req.body.mode || req.body.state || req.body.action || "").toString().toLowerCase();
        if (mode === "off" || mode === "disable" || mode === "false") {
            historyService.disable();
            res.json({ enabled: false, message: "History RAG disabled" });
        } else if (mode === "on" || mode === "enable" || mode === "true") {
            historyService.enable();
            res.json({ enabled: true, message: "History RAG enabled" });
        } else {
            res.status(400).json({ error: "Invalid mode. Use 'on' or 'off'." });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /history/clear ──────────────────────────────────────
router.post("/clear", (req, res) => {
    try {
        const stats = historyService.clear();
        res.json({ message: "History Knowledge Index cleared and refreshed successfully", stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /history/reindex ────────────────────────────────────
router.post("/reindex", (req, res) => {
    try {
        const stats = historyService.reindex();
        res.json({ message: "History re-indexed successfully", stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /history/on ─────────────────────────────────────────
router.post("/on", (req, res) => {
    historyService.enable();
    res.json({ enabled: true, message: "History RAG enabled" });
});

// ── POST /history/off ────────────────────────────────────────
router.post("/off", (req, res) => {
    historyService.disable();
    res.json({ enabled: false, message: "History RAG disabled" });
});

module.exports = router;
