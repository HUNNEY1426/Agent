const express = require("express");
const router = express.Router();


const fs = require("fs");
const path = require("path");


const { askAI } = require("../services/aiService");

console.log(require("../services/aiService"));

const MEMORY_DIR = path.join(__dirname, "../memory");
const SESSION_DIR = path.join(MEMORY_DIR, "sessions");
const ACTIVE_FILE = path.join(MEMORY_DIR, "active_session.txt");

router.post("/ask", async (req, res) => {
    const { question } = req.body;

    const answer = await askAI(question);

    res.json({ answer });
});

// Create New Chat Session
router.post("/chat/new", (req, res) => {

    const { name } = req.body;

    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const sessionFile = path.join(SESSION_DIR, `${name}.json`);

    if (!fs.existsSync(sessionFile)) {
        fs.writeFileSync(sessionFile, "[]");
    }

    fs.writeFileSync(ACTIVE_FILE, name);

    res.json({
        success: true,
        message: `Session '${name}' created`
    });

});
// Switch Active Session
router.post("/chat/switch", (req, res) => {

    const { name } = req.body;

    const sessionFile = path.join(SESSION_DIR, `${name}.json`);

    if (!fs.existsSync(sessionFile)) {

        return res.status(404).json({
            message: "Session not found"
        });

    }

    fs.writeFileSync(ACTIVE_FILE, name);

    const history = JSON.parse(
        fs.readFileSync(sessionFile)
    );

    res.json({
        message: `Switched to ${name}`,
        history
    });

});

// List All Sessions
router.get("/chat/list", (req, res) => {

    if (!fs.existsSync(SESSION_DIR)) {
        return res.json([]);
    }

    const sessions = fs.readdirSync(SESSION_DIR)
        .map(file => file.replace(".json", ""));

    res.json(sessions);

});

module.exports = router;