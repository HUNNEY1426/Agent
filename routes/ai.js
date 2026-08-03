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
    fs.writeFileSync(
        path.join(MEMORY_DIR, "active_session.json"),
        JSON.stringify({ active: name, lastOpened: new Date().toISOString() }, null, 2)
    );

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
    fs.writeFileSync(
        path.join(MEMORY_DIR, "active_session.json"),
        JSON.stringify({ active: name, lastOpened: new Date().toISOString() }, null, 2)
    );

    let history = [];
    try {
        const content = fs.readFileSync(sessionFile, "utf8").trim();
        if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                history = parsed;
            } else if (parsed && Array.isArray(parsed.messages)) {
                history = parsed.messages.map(msg => ({
                    role: msg.role,
                    text: msg.text || msg.content || ""
                }));
            }
        }
    } catch (e) {
        history = [];
    }

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