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

function getSessionObject(sessionName, file) {
    const now = new Date().toISOString();
    const defaultTitle = sessionName.charAt(0).toUpperCase() + sessionName.slice(1) + " Help";
    let session = {
        id: sessionName,
        title: defaultTitle,
        createdAt: now,
        updatedAt: now,
        messages: []
    };

    if (fs.existsSync(file)) {
        try {
            const content = fs.readFileSync(file, "utf8").trim();
            if (content) {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    const stats = fs.statSync(file);
                    session.createdAt = stats.birthtime ? stats.birthtime.toISOString() : now;
                    session.updatedAt = stats.mtime ? stats.mtime.toISOString() : now;
                    session.messages = parsed.map(msg => ({
                        role: msg.role,
                        content: msg.content || msg.text || ""
                    }));
                } else if (parsed && typeof parsed === "object") {
                    session = parsed;
                    if (!session.id) session.id = sessionName;
                    if (!session.title) session.title = defaultTitle;
                    if (!session.createdAt) session.createdAt = now;
                    if (!session.updatedAt) session.updatedAt = now;
                    if (!session.messages) session.messages = [];
                    session.messages = session.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content || msg.text || ""
                    }));
                }
            }
        } catch (e) {
            // Ignore error, return default structure
        }
    }
    return session;
}

function saveMessage(sessionName, message) {
    const sessionFile = path.join(SESSION_DIR, `${sessionName}.json`);
    const session = getSessionObject(sessionName, sessionFile);

    const formattedMsg = {
        role: message.role,
        content: message.content || message.text || ""
    };
    session.messages.push(formattedMsg);
    session.updatedAt = new Date().toISOString();

    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
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
    const active = getActiveSession();

    if (!fs.existsSync(file)) {
        const now = new Date().toISOString();
        const initialSession = {
            id: active,
            title: active.charAt(0).toUpperCase() + active.slice(1) + " Help",
            createdAt: now,
            updatedAt: now,
            messages: []
        };
        fs.writeFileSync(file, JSON.stringify(initialSession, null, 2));
    }

    try {
        const content = fs.readFileSync(file, "utf8").trim();
        if (!content) return [];
        const parsed = JSON.parse(content);
        let messages = [];
        if (Array.isArray(parsed)) {
            messages = parsed;
        } else if (parsed && Array.isArray(parsed.messages)) {
            messages = parsed.messages;
        }
        return messages.map(msg => ({
            role: msg.role,
            text: msg.text || msg.content || "",
            content: msg.content || msg.text || ""
        }));
    } catch (e) {
        return [];
    }
}

function saveHistory(history) {
    const file = getSessionFile();
    const active = getActiveSession();
    const session = getSessionObject(active, file);

    session.messages = history.map(msg => ({
        role: msg.role,
        content: msg.content || msg.text || ""
    }));
    session.updatedAt = new Date().toISOString();

    fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

module.exports = {
    loadHistory,
    saveHistory,
    getActiveSession,
    readActiveSession,
    saveMessage
};