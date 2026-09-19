"use strict";

/**
 * routes/history.js
 * REST endpoints for the Persistent Chat History RAG system with user data isolation.
 */

const express        = require("express");
const historyService = require("../services/history/historyService");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all history routes with authMiddleware
router.use(authMiddleware);

// ── GET /history/status ─────────────────────────────────────
router.get("/status", (req, res) => {
    try {
        const userId = req.user.id;
        const status = historyService.getStatus(userId);
        res.json(status);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET /history/search?q=...&topK=5 or /history/search/:query
router.get("/search", (req, res) => {
    try {
        const userId = req.user.id;
        const query = (req.query.q || req.query.query || "").trim();
        if (!query) return res.status(400).json({ success: false, error: "q parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const results = historyService.searchHistory(query, { topK, minScore }, userId);
        res.json({ query, results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/search/:query", (req, res) => {
    try {
        const userId = req.user.id;
        const query = (req.params.query || "").trim();
        if (!query) return res.status(400).json({ success: false, error: "query parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const results = historyService.searchHistory(query, { topK, minScore }, userId);
        res.json({ query, results });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET /history/search/grouped?q=... ───────────────────────
router.get("/search/grouped", (req, res) => {
    try {
        const userId = req.user.id;
        const query = (req.query.q || req.query.query || "").trim();
        if (!query) return res.status(400).json({ success: false, error: "q parameter required" });

        const topK     = parseInt(req.query.topK, 10)  || 8;
        const minScore = parseFloat(req.query.minScore) || 0.1;

        const groups = historyService.searchHistoryGrouped(query, { topK, minScore }, userId);
        res.json({ query, groups });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /history/use ────────────────────────────────────────
router.post("/use", (req, res) => {
    try {
        const userId = req.user.id;
        const mode = (req.body.mode || req.body.state || req.body.action || "").toString().toLowerCase();
        if (mode === "off" || mode === "disable" || mode === "false") {
            historyService.disable(userId);
            res.json({ enabled: false, message: "History RAG disabled" });
        } else if (mode === "on" || mode === "enable" || mode === "true") {
            historyService.enable(userId);
            res.json({ enabled: true, message: "History RAG enabled" });
        } else {
            res.status(400).json({ success: false, error: "Invalid mode. Use 'on' or 'off'." });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /history/clear ──────────────────────────────────────
router.post("/clear", (req, res) => {
    try {
        const userId = req.user.id;
        const stats = historyService.clear(userId);
        res.json({ message: "History Knowledge Index cleared and refreshed successfully", stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /history/reindex ────────────────────────────────────
router.post("/reindex", (req, res) => {
    try {
        const userId = req.user.id;
        const stats = historyService.reindex(userId);
        res.json({ message: "History re-indexed successfully", stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /history/on ─────────────────────────────────────────
router.post("/on", (req, res) => {
    const userId = req.user.id;
    historyService.enable(userId);
    res.json({ enabled: true, message: "History RAG enabled" });
});

// ── POST /history/off ────────────────────────────────────────
router.post("/off", (req, res) => {
    const userId = req.user.id;
    historyService.disable(userId);
    res.json({ enabled: false, message: "History RAG disabled" });
});

module.exports = router;
