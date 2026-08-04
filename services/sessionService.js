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

const fsPromises = require("fs").promises;

function validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        throw new Error("Invalid session ID");
    }
}

async function setActiveSession(name) {
    validateSessionId(name);
    await fsPromises.writeFile(ACTIVE_FILE, name);
    await fsPromises.writeFile(
        ACTIVE_JSON_FILE,
        JSON.stringify({ active: name, lastOpened: new Date().toISOString() }, null, 2)
    );
}

async function deleteSession(sessionId) {
    validateSessionId(sessionId);
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    
    try {
        await fsPromises.access(sessionFile);
    } catch (err) {
        throw new Error("Session not found");
    }
    
    await fsPromises.unlink(sessionFile);
    
    const activeInfo = readActiveSession();
    if (activeInfo && activeInfo.active === sessionId) {
        await setActiveSession("default");
    }
}

async function renameSession(oldId, newId) {
    validateSessionId(oldId);
    validateSessionId(newId);
    
    if (oldId === newId) {
        throw new Error("New session ID must be different");
    }
    
    const oldFile = path.join(SESSION_DIR, `${oldId}.json`);
    const newFile = path.join(SESSION_DIR, `${newId}.json`);
    
    let content;
    try {
        content = await fsPromises.readFile(oldFile, "utf8");
    } catch (err) {
        throw new Error("Session not found");
    }
    
    const existsNew = await fsPromises.access(newFile).then(() => true).catch(() => false);
    if (existsNew) {
        throw new Error("Session already exists");
    }
    
    let session;
    try {
        session = JSON.parse(content);
    } catch (e) {
        session = {};
    }
    
    session.id = newId;
    const oldDefaultTitle = oldId.charAt(0).toUpperCase() + oldId.slice(1) + " Help";
    if (session.title === oldDefaultTitle || !session.title) {
        session.title = newId.charAt(0).toUpperCase() + newId.slice(1) + " Help";
    }
    session.updatedAt = new Date().toISOString();
    
    await fsPromises.writeFile(newFile, JSON.stringify(session, null, 2));
    await fsPromises.unlink(oldFile);
    
    const activeInfo = readActiveSession();
    if (activeInfo && activeInfo.active === oldId) {
        await setActiveSession(newId);
    }
}

async function clearSession(sessionId) {
    validateSessionId(sessionId);
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    
    let content;
    try {
        content = await fsPromises.readFile(sessionFile, "utf8");
    } catch (err) {
        throw new Error("Session not found");
    }
    
    let session;
    try {
        session = JSON.parse(content);
    } catch (e) {
        session = {};
    }
    
    session.id = sessionId;
    if (!session.title) {
        session.title = sessionId.charAt(0).toUpperCase() + sessionId.slice(1) + " Help";
    }
    session.messages = [];
    session.updatedAt = new Date().toISOString();
    
    await fsPromises.writeFile(sessionFile, JSON.stringify(session, null, 2));
}

async function duplicateSession(sourceId, targetId) {
    validateSessionId(sourceId);
    validateSessionId(targetId);
    
    if (sourceId === targetId) {
        throw new Error("Target session ID must be different");
    }
    
    const sourceFile = path.join(SESSION_DIR, `${sourceId}.json`);
    const targetFile = path.join(SESSION_DIR, `${targetId}.json`);
    
    let content;
    try {
        content = await fsPromises.readFile(sourceFile, "utf8");
    } catch (err) {
        throw new Error("Session not found");
    }
    
    const existsTarget = await fsPromises.access(targetFile).then(() => true).catch(() => false);
    if (existsTarget) {
        throw new Error("Session already exists");
    }
    
    let session;
    try {
        session = JSON.parse(content);
    } catch (e) {
        session = {};
    }
    
    const now = new Date().toISOString();
    session.id = targetId;
    session.title = targetId.charAt(0).toUpperCase() + targetId.slice(1) + " Help";
    session.createdAt = now;
    session.updatedAt = now;
    if (!session.messages) {
        session.messages = [];
    }
    
    await fsPromises.writeFile(targetFile, JSON.stringify(session, null, 2));
    return { success: true };
}

async function getSessionInfo(sessionId) {
    validateSessionId(sessionId);
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    
    let content;
    try {
        content = await fsPromises.readFile(sessionFile, "utf8");
    } catch (err) {
        throw new Error("Session not found");
    }
    
    let session;
    try {
        session = JSON.parse(content);
    } catch (e) {
        session = {};
    }
    
    const activeSessionName = readActiveSession().active;
    
    return {
        id: session.id || sessionId,
        title: session.title || (sessionId.charAt(0).toUpperCase() + sessionId.slice(1) + " Help"),
        createdAt: session.createdAt || new Date().toISOString(),
        updatedAt: session.updatedAt || new Date().toISOString(),
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        isActive: activeSessionName === sessionId
    };
}

async function searchMessages(query) {
    if (typeof query !== "string") {
        throw new Error("Query must be a string");
    }
    const cleanQuery = query.toLowerCase();

    let files = [];
    try {
        files = await fsPromises.readdir(SESSION_DIR);
    } catch (err) {
        return [];
    }

    const results = [];
    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(SESSION_DIR, file);
        const sessionName = file.slice(0, -5);
        try {
            const contentStr = await fsPromises.readFile(filePath, "utf8");
            if (!contentStr.trim()) continue;
            const session = JSON.parse(contentStr);
            let messages = [];
            if (Array.isArray(session)) {
                messages = session;
            } else if (session && Array.isArray(session.messages)) {
                messages = session.messages;
            }

            for (const msg of messages) {
                const msgContent = msg.content || msg.text || "";
                if (msgContent.toLowerCase().includes(cleanQuery)) {
                    results.push({
                        session: sessionName,
                        role: msg.role,
                        content: msgContent
                    });
                }
            }
        } catch (e) {
            // Ignore parse errors/read errors of individual files
        }
    }
    return results;
}

const EXPORT_DIR = path.join(MEMORY_DIR, "exports");

async function exportSession(sessionId, format) {
    validateSessionId(sessionId);
    if (!format || typeof format !== "string") {
        throw new Error("Invalid format");
    }
    const cleanFormat = format.toLowerCase();
    if (cleanFormat !== "json" && cleanFormat !== "markdown" && cleanFormat !== "md") {
        throw new Error("Unsupported format. Use 'json' or 'markdown'");
    }

    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    let content;
    try {
        content = await fsPromises.readFile(sessionFile, "utf8");
    } catch (err) {
        throw new Error("Session not found");
    }

    let session;
    try {
        session = JSON.parse(content);
    } catch (e) {
        session = {};
    }

    await fsPromises.mkdir(EXPORT_DIR, { recursive: true });

    let exportContent = "";
    let exportFileName = "";

    if (cleanFormat === "json") {
        exportContent = JSON.stringify(session, null, 2);
        exportFileName = `${sessionId}.json`;
    } else {
        const title = session.title || (sessionId.charAt(0).toUpperCase() + sessionId.slice(1) + " Help");
        const createdAt = session.createdAt || new Date().toISOString();
        const updatedAt = session.updatedAt || new Date().toISOString();
        const messages = Array.isArray(session.messages) ? session.messages : [];

        let md = `# ${title}\n\n`;
        md += `- **ID**: ${sessionId}\n`;
        md += `- **Created At**: ${createdAt}\n`;
        md += `- **Updated At**: ${updatedAt}\n\n`;
        md += `## Messages\n\n`;

        for (const msg of messages) {
            const role = msg.role || "unknown";
            const text = msg.content || msg.text || "";
            md += `### ${role.charAt(0).toUpperCase() + role.slice(1)}\n${text}\n\n`;
        }
        exportContent = md;
        exportFileName = `${sessionId}.md`;
    }

    const exportFilePath = path.join(EXPORT_DIR, exportFileName);
    await fsPromises.writeFile(exportFilePath, exportContent, "utf8");
    return { filePath: exportFilePath, content: exportContent };
}

function validateSessionStructure(session) {
    if (!session || typeof session !== "object" || Array.isArray(session)) {
        throw new Error("Invalid session structure: must be an object");
    }
    validateSessionId(session.id);
    if (session.title && typeof session.title !== "string") {
        throw new Error("Invalid session structure: title must be a string");
    }
    if (session.messages) {
        if (!Array.isArray(session.messages)) {
            throw new Error("Invalid session structure: messages must be an array");
        }
        for (const msg of session.messages) {
            if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
                throw new Error("Invalid session structure: each message must be an object");
            }
            if (typeof msg.role !== "string" || !msg.role) {
                throw new Error("Invalid session structure: message role must be a non-empty string");
            }
            const content = msg.content || msg.text;
            if (content !== undefined && typeof content !== "string") {
                throw new Error("Invalid session structure: message content must be a string");
            }
        }
    }
}

async function importSession(sessionData) {
    let session;
    if (typeof sessionData === "string") {
        try {
            session = JSON.parse(sessionData);
        } catch (e) {
            throw new Error("Invalid JSON format");
        }
    } else {
        session = sessionData;
    }

    validateSessionStructure(session);

    const targetFile = path.join(SESSION_DIR, `${session.id}.json`);
    const exists = await fsPromises.access(targetFile).then(() => true).catch(() => false);
    if (exists) {
        throw new Error("Session ID already exists");
    }

    const now = new Date().toISOString();
    const formattedSession = {
        id: session.id,
        title: session.title || (session.id.charAt(0).toUpperCase() + session.id.slice(1) + " Help"),
        createdAt: session.createdAt || now,
        updatedAt: session.updatedAt || now,
        messages: (session.messages || []).map(msg => ({
            role: msg.role,
            content: msg.content || msg.text || ""
        }))
    };

    await fsPromises.writeFile(targetFile, JSON.stringify(formattedSession, null, 2), "utf8");
    return formattedSession;
}

async function archiveSession(sessionId) {
    validateSessionId(sessionId);
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    const archiveFile = path.join(MEMORY_DIR, "archives", `${sessionId}.json`);

    try {
        await fsPromises.access(sessionFile);
    } catch (err) {
        throw new Error("Session not found");
    }

    await fsPromises.mkdir(path.join(MEMORY_DIR, "archives"), { recursive: true });

    const existsInArchives = await fsPromises.access(archiveFile).then(() => true).catch(() => false);
    if (existsInArchives) {
        throw new Error("Session already archived");
    }

    await fsPromises.rename(sessionFile, archiveFile);

    const activeInfo = readActiveSession();
    if (activeInfo && activeInfo.active === sessionId) {
        await setActiveSession("default");
    }
}

async function restoreSession(sessionId) {
    validateSessionId(sessionId);
    const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
    const archiveFile = path.join(MEMORY_DIR, "archives", `${sessionId}.json`);

    try {
        await fsPromises.access(archiveFile);
    } catch (err) {
        throw new Error("Session not found in archives");
    }

    const existsInSessions = await fsPromises.access(sessionFile).then(() => true).catch(() => false);
    if (existsInSessions) {
        throw new Error("Session already exists in active sessions");
    }

    await fsPromises.rename(archiveFile, sessionFile);
}

module.exports = {
    loadHistory,
    saveHistory,
    getActiveSession,
    readActiveSession,
    saveMessage,
    validateSessionId,
    setActiveSession,
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
};