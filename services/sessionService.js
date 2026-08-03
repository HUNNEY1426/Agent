const fs = require("fs");
const path = require("path");

const MEMORY_DIR = path.join(__dirname, "../memory");
const SESSION_DIR = path.join(MEMORY_DIR, "sessions");
const ACTIVE_FILE = path.join(MEMORY_DIR, "active_session.txt");
const ACTIVE_JSON_FILE = path.join(MEMORY_DIR, "active_session.json");

function readActiveSession() {
    if (!fs.existsSync(ACTIVE_JSON_FILE)) {
        const defaultSession = { active: "default", lastOpened: new Date().toISOString() };
        fs.writeFileSync(ACTIVE_JSON_FILE, JSON.stringify(defaultSession, null, 2));
        return defaultSession;
    }
    try {
        return JSON.parse(fs.readFileSync(ACTIVE_JSON_FILE, "utf8"));
    } catch (e) {
        return { active: "default" };
    }
}

function saveMessage(sessionName, message) {
    const sessionFile = path.join(SESSION_DIR, `${sessionName}.json`);
    let history = [];
    if (fs.existsSync(sessionFile)) {
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
    }
    history.push(message);
    fs.writeFileSync(sessionFile, JSON.stringify(history, null, 2));
}

function getActiveSession() {
    const active = readActiveSession();
    return active.active;
}

function getSessionFile() {
    const session = getActiveSession();
    return path.join(SESSION_DIR, `${session}.json`);
}

function loadHistory() {
    const file = getSessionFile();

    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]");
    }

    try {
        const content = fs.readFileSync(file, "utf8").trim();
        if (!content) return [];
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed;
        } else if (parsed && Array.isArray(parsed.messages)) {
            return parsed.messages.map(msg => ({
                role: msg.role,
                text: msg.text || msg.content || ""
            }));
        }
        return [];
    } catch (e) {
        return [];
    }
}

function saveHistory(history) {
    const file = getSessionFile();
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

module.exports = {
    loadHistory,
    saveHistory,
    getActiveSession,
    readActiveSession,
    saveMessage
};