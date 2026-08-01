const fs = require("fs");
const path = require("path");

const MEMORY_DIR = path.join(__dirname, "../memory");
const SESSION_DIR = path.join(MEMORY_DIR, "sessions");
const ACTIVE_FILE = path.join(MEMORY_DIR, "active_session.txt");

function getActiveSession() {
    if (!fs.existsSync(ACTIVE_FILE)) {
        fs.writeFileSync(ACTIVE_FILE, "default");
    }

    return fs.readFileSync(ACTIVE_FILE, "utf8").trim();
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

    return JSON.parse(fs.readFileSync(file));
}

function saveHistory(history) {
    const file = getSessionFile();
    fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

module.exports = {
    loadHistory,
    saveHistory,
    getActiveSession
};