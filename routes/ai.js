const express = require("express");
const router = express.Router();


const fs = require("fs");
const path = require("path");


const { askAI } = require("../services/aiService");
const {
    deleteSession,
    renameSession,
    clearSession,
    duplicateSession,
    getSessionInfo,
    searchMessages,
    exportSession,
    importSession,
    archiveSession,
    restoreSession
} = require("../services/sessionService");

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
        const now = new Date().toISOString();
        const initialSession = {
            id: name,
            title: name.charAt(0).toUpperCase() + name.slice(1) + " Help",
            createdAt: now,
            updatedAt: now,
            messages: []
        };
        fs.writeFileSync(sessionFile, JSON.stringify(initialSession, null, 2));
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
                history = parsed.map(msg => ({
                    role: msg.role,
                    text: msg.text || msg.content || "",
                    content: msg.content || msg.text || ""
                }));
            } else if (parsed && Array.isArray(parsed.messages)) {
                history = parsed.messages.map(msg => ({
                    role: msg.role,
                    text: msg.text || msg.content || "",
                    content: msg.content || msg.text || ""
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

    const files = fs.readdirSync(SESSION_DIR).filter(file => file.endsWith(".json"));

    const sessionsList = files.map(file => {
        const name = file.replace(".json", "");
        const filePath = path.join(SESSION_DIR, file);
        try {
            const content = fs.readFileSync(filePath, "utf8").trim();
            if (!content) {
                const stats = fs.statSync(filePath);
                const updatedTime = stats.mtime.toISOString();
                return {
                    id: name,
                    title: name.charAt(0).toUpperCase() + name.slice(1) + " Help",
                    messageCount: 0,
                    messagesCount: 0,
                    updatedAt: updatedTime,
                    updatedDate: updatedTime
                };
            }
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                const stats = fs.statSync(filePath);
                const updatedTime = stats.mtime.toISOString();
                return {
                    id: name,
                    title: name.charAt(0).toUpperCase() + name.slice(1) + " Help",
                    messageCount: parsed.length,
                    messagesCount: parsed.length,
                    updatedAt: updatedTime,
                    updatedDate: updatedTime
                };
            } else if (parsed && typeof parsed === "object") {
                const msgCount = Array.isArray(parsed.messages) ? parsed.messages.length : 0;
                const updatedTime = parsed.updatedAt || parsed.createdAt || new Date().toISOString();
                return {
                    id: parsed.id || name,
                    title: parsed.title || (name.charAt(0).toUpperCase() + name.slice(1) + " Help"),
                    messageCount: msgCount,
                    messagesCount: msgCount,
                    updatedAt: updatedTime,
                    updatedDate: updatedTime
                };
            }
        } catch (e) {
            // Fallback
        }
        return {
            id: name,
            title: name.charAt(0).toUpperCase() + name.slice(1) + " Help",
            messageCount: 0,
            messagesCount: 0,
            updatedAt: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
    });

    res.json(sessionsList);

});

// Delete Chat Session
router.delete("/chat/delete/:name", async (req, res) => {
    const { name } = req.params;
    try {
        await deleteSession(name);
        res.json({
            success: true,
            message: `Session '${name}' deleted`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            error: err.message
        });
    }
});

// Rename Chat Session
router.post("/chat/rename", async (req, res) => {
    const { oldName, newName } = req.body;
    try {
        await renameSession(oldName, newName);
        res.json({
            success: true,
            message: `Session '${oldName}' renamed to '${newName}'`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already exists" ? 409 : 400).json({
            error: err.message
        });
    }
});

// Clear Chat Session
router.post("/chat/clear", async (req, res) => {
    const { name } = req.body;
    try {
        await clearSession(name);
        res.json({
            success: true,
            message: `Session '${name}' cleared`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            error: err.message
        });
    }
});

// Duplicate Chat Session
router.post("/chat/duplicate", async (req, res) => {
    const { source, target } = req.body;
    try {
        await duplicateSession(source, target);
        res.json({
            success: true,
            message: `Session '${source}' duplicated to '${target}'`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already exists" ? 409 : 400).json({
            error: err.message
        });
    }
});

// Get Chat Session Info
router.get("/chat/info/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const info = await getSessionInfo(name);
        res.json(info);
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            error: err.message
        });
    }
});

// Search Chat Messages
router.get("/chat/search/:query", async (req, res) => {
    const { query } = req.params;
    try {
        const results = await searchMessages(query);
        res.json(results);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Export Chat Session
router.post("/chat/export", async (req, res) => {
    const { id, format } = req.body;
    try {
        const result = await exportSession(id, format);
        res.json({
            success: true,
            filePath: result.filePath,
            content: result.content
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : 400).json({
            error: err.message
        });
    }
});

// Import Chat Session
router.post("/chat/import", async (req, res) => {
    const { session } = req.body;
    try {
        const imported = await importSession(session);
        res.json({
            success: true,
            session: imported
        });
    } catch (err) {
        res.status(err.message === "Session ID already exists" ? 409 : 400).json({
            error: err.message
        });
    }
});

// Archive Chat Session
router.post("/chat/archive", async (req, res) => {
    const id = req.body.id || req.body.name;
    try {
        await archiveSession(id);
        res.json({
            success: true,
            message: `Session '${id}' archived successfully`
        });
    } catch (err) {
        res.status(err.message === "Session not found" ? 404 : err.message === "Session already archived" ? 409 : 400).json({
            error: err.message
        });
    }
});

// Restore Chat Session
router.post("/chat/restore", async (req, res) => {
    const id = req.body.id || req.body.name;
    try {
        await restoreSession(id);
        res.json({
            success: true,
            message: `Session '${id}' restored successfully`
        });
    } catch (err) {
        res.status(err.message === "Session not found in archives" ? 404 : err.message === "Session already exists in active sessions" ? 409 : 400).json({
            error: err.message
        });
    }
});

module.exports = router;