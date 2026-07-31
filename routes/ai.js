const express = require("express");
const { askAI } = require("../services/aiService");

const router = express.Router();

router.post("/ask", async (req, res) => {
    try {
        const { question } = req.body;

        const answer = await askAI(question);

        res.json({
            answer,
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
});

module.exports = router;