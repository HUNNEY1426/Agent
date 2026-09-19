const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { aiConfig, validateProvider, validateThinkingLevel } = require("../config/aiConfig");

const MEMORY_DIR = path.join(__dirname, "../memory");
const LEGACY_SESSION_DIR = path.join(MEMORY_DIR, "sessions");
const USERS_DIR = path.join(MEMORY_DIR, "users");

function getUserBaseDir(userId) {
    const cleanId = (userId || "default_user").replace(/[^a-zA-Z0-9_-]/g, "_");
    const userDir = path.join(USERS_DIR, cleanId);
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
}

function getUserSessionDir(userId) {
    const userBase = getUserBaseDir(userId);
    const sessionDir = path.join(userBase, "sessions");

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
}

function getUserActiveFile(userId) {
    const userBase = getUserBaseDir(userId);
    return path.join(userBase, "active_session.json");
}

function formatSessionTitle(sessionName, firstMessageText = "") {
    if (firstMessageText && typeof firstMessageText === "string") {
        const clean = firstMessageText.replace(/[\r\n]+/g, " ").trim();
        if (clean) {
            const short = clean.length > 36 ? clean.slice(0, 33) + "..." : clean;
            return short.charAt(0).toUpperCase() + short.slice(1);
        }
    }
    if (!sessionName || sessionName.toLowerCase().startsWith("chat-") || sessionName.toLowerCase() === "default") {
        return "New Chat";
    }
    return sessionName.charAt(0).toUpperCase() + sessionName.slice(1);
}

function readActiveSession(userId) {
    const activeFile = getUserActiveFile(userId);
    const sessionDir = getUserSessionDir(userId);

    if (fs.existsSync(activeFile)) {
        try {
            const data = JSON.parse(fs.readFileSync(activeFile, "utf8"));
            if (data && data.active && data.active !== "default") {
                if (fs.existsSync(path.join(sessionDir, `${data.active}.json`))) {
                    return data;
                }
            }
        } catch (e) { }
    }

    // If no active session or active is default, check user's real sessions
    const sessions = listUserSessions(userId);
    if (sessions.length > 0) {
        const mostRecent = sessions[0].id;
        const result = { active: mostRecent, lastOpened: new Date().toISOString() };
        try { fs.writeFileSync(activeFile, JSON.stringify(result, null, 2)); } catch (e) { }
        return result;
    }

    return { active: null };
}

function getSessionObject(sessionName, file, userId) {
    const now = new Date().toISOString();
    const defaultTitle = formatSessionTitle(sessionName);
    let session = {
        id: sessionName,
        title: defaultTitle,
        provider: aiConfig.provider || "openrouter",
        model: aiConfig.model || "liquid/lfm-2.5-2.6b:free",
        thinkingLevel: aiConfig.thinkingLevel || "medium",
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
                    if (!session.provider) session.provider = aiConfig.provider || "openrouter";
                    if (!session.model) session.model = aiConfig.model || "liquid/lfm-2.5-2.6b:free";
                    if (!session.thinkingLevel) session.thinkingLevel = aiConfig.thinkingLevel || "medium";
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
            // Return default
        }
    }
    return session;
}

function saveMessage(sessionName, message, userId) {
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionName}.json`);
    const session = getSessionObject(sessionName, sessionFile, userId);

    const formattedMsg = {
        role: message.role,
        content: message.content || message.text || ""
    };
    session.messages.push(formattedMsg);

    // Auto-generate clean title from first user message like ChatGPT
    if (message.role === "user" && (
        !session.title ||
        session.title === "New Chat" ||
        session.title.toLowerCase().startsWith("chat-") ||
        session.title.toLowerCase().endsWith("help") ||
        session.title.toLowerCase() === "default"
    )) {
        session.title = formatSessionTitle(sessionName, formattedMsg.content);
    }

    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
}

function getActiveSession(userId) {
    const active = readActiveSession(userId);
    return active.active;
}

function getSessionFile(userId) {
    const sessionDir = getUserSessionDir(userId);
    const session = getActiveSession(userId);
    return session ? path.join(sessionDir, `${session}.json`) : null;
}

function loadHistory(userId, specificSessionName = null) {
    const sessionDir = getUserSessionDir(userId);
    const active = specificSessionName || getActiveSession(userId);
    if (!active) return [];
    const file = path.join(sessionDir, `${active}.json`);
    if (!fs.existsSync(file)) return [];

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

function saveHistory(history, userId) {
    const file = getSessionFile(userId);
    const active = getActiveSession(userId);
    const session = getSessionObject(active, file, userId);

    session.messages = history.map(msg => ({
        role: msg.role,
        content: msg.content || msg.text || ""
    }));
    session.updatedAt = new Date().toISOString();

    fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

function validateSessionId(sessionId) {
    if (!sessionId || typeof sessionId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        throw new Error("Invalid session ID");
    }
}

async function setActiveSession(name, userId) {
    validateSessionId(name);
    const activeFile = getUserActiveFile(userId);
    await fsPromises.writeFile(
        activeFile,
        JSON.stringify({ active: name, lastOpened: new Date().toISOString() }, null, 2)
    );
}

function listUserSessions(userId) {
    const sessionDir = getUserSessionDir(userId);
    if (!fs.existsSync(sessionDir)) {
        return [];
    }

    const files = fs.readdirSync(sessionDir).filter(file => file.endsWith(".json"));

    const sessions = files.map(file => {
        const name = file.replace(".json", "");
        const filePath = path.join(sessionDir, file);
        try {
            const content = fs.readFileSync(filePath, "utf8").trim();
            if (!content) {
                const stats = fs.statSync(filePath);
                const updatedTime = stats.mtime.toISOString();
                return {
                    id: name,
                    title: formatSessionTitle(name),
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
                const firstUserMsg = parsed.find(m => m.role === "user");
                return {
                    id: name,
                    title: formatSessionTitle(name, firstUserMsg ? (firstUserMsg.content || firstUserMsg.text) : ""),
                    messageCount: parsed.length,
                    messagesCount: parsed.length,
                    updatedAt: updatedTime,
                    updatedDate: updatedTime
                };
            } else if (parsed && typeof parsed === "object") {
                const msgs = Array.isArray(parsed.messages) ? parsed.messages : [];
                const msgCount = msgs.length;
                const updatedTime = parsed.updatedAt || parsed.createdAt || new Date().toISOString();
                let title = parsed.title;
                if (!title || title.toLowerCase().endsWith(" help") || title.toLowerCase().startsWith("chat-") || title.toLowerCase() === "default") {
                    const firstUserMsg = msgs.find(m => m.role === "user");
                    title = formatSessionTitle(parsed.id || name, firstUserMsg ? (firstUserMsg.content || firstUserMsg.text) : "");
                }
                return {
                    id: parsed.id || name,
                    title: title || formatSessionTitle(parsed.id || name),
                    provider: parsed.provider,
                    model: parsed.model,
                    thinkingLevel: parsed.thinkingLevel,
                    messageCount: msgCount,
                    messagesCount: msgCount,
                    updatedAt: updatedTime,
                    updatedDate: updatedTime
                };
            }
        } catch (e) {}

        return {
            id: name,
            title: formatSessionTitle(name),
            messageCount: 0,
            messagesCount: 0,
            updatedAt: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };
    });

    return sessions
        .filter(session => {
            const lowerId = session.id.toLowerCase();
            const isLegacyDummy = ["default", "demo", "coding", "coding-copy", "weather", "personal", "legacy-test"].includes(lowerId);
            if (isLegacyDummy && session.messageCount === 0) {
                return false;
            }
            if (lowerId === "default" && session.messageCount === 0) {
                return false;
            }
            if (lowerId.startsWith("chat-") && session.messageCount === 0) {
                return false;
            }
            return true;
        })
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

async function createNewSession(name, options = {}, userId) {
    validateSessionId(name);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${name}.json`);

    const sessionProvider = options.provider || aiConfig.provider || "gemini";
    const sessionModel = options.model || aiConfig.model || "gemini-2.0-flash";
    const sessionThinking = options.thinkingLevel || aiConfig.thinkingLevel || "medium";

    if (!fs.existsSync(sessionFile)) {
        const now = new Date().toISOString();
        const initialSession = {
            id: name,
            title: formatSessionTitle(name),
            provider: sessionProvider,
            model: sessionModel,
            thinkingLevel: sessionThinking,
            createdAt: now,
            updatedAt: now,
            messages: []
        };
        await fsPromises.writeFile(sessionFile, JSON.stringify(initialSession, null, 2));
    }

    await setActiveSession(name, userId);
    return {
        success: true,
        message: `Session '${name}' created`,
        settings: {
            provider: sessionProvider,
            model: sessionModel,
            thinkingLevel: sessionThinking
        }
    };
}

async function switchUserSession(name, userId) {
    validateSessionId(name);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${name}.json`);

    if (!fs.existsSync(sessionFile)) {
        throw new Error("Session not found");
    }

    await setActiveSession(name, userId);

    let history = [];
    let sessionSettings = {
        provider: aiConfig.provider || "gemini",
        model: aiConfig.model || "gemini-2.0-flash",
        thinkingLevel: aiConfig.thinkingLevel || "medium"
    };

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
            } else if (parsed && typeof parsed === "object") {
                sessionSettings = {
                    provider: parsed.provider || aiConfig.provider || "gemini",
                    model: parsed.model || aiConfig.model || "gemini-2.0-flash",
                    thinkingLevel: parsed.thinkingLevel || aiConfig.thinkingLevel || "medium",
                };
                if (Array.isArray(parsed.messages)) {
                    history = parsed.messages.map(msg => ({
                        role: msg.role,
                        text: msg.text || msg.content || "",
                        content: msg.content || msg.text || ""
                    }));
                }
            }
        }
    } catch (e) {
        history = [];
    }

    return {
        message: `Switched to ${name}`,
        history,
        settings: sessionSettings
    };
}

async function deleteSession(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);

    try {
        await fsPromises.access(sessionFile);
    } catch (err) {
        throw new Error("Session not found");
    }

    await fsPromises.unlink(sessionFile);

    const activeInfo = readActiveSession(userId);
    if (activeInfo && activeInfo.active === sessionId) {
        const remaining = listUserSessions(userId);
        if (remaining.length > 0) {
            await setActiveSession(remaining[0].id, userId);
        } else {
            const activeFile = getUserActiveFile(userId);
            try { await fsPromises.unlink(activeFile); } catch (e) {}
        }
    }
}

async function renameSession(oldId, newId, userId) {
    validateSessionId(oldId);
    validateSessionId(newId);

    if (oldId === newId) {
        throw new Error("New session ID must be different");
    }

    const sessionDir = getUserSessionDir(userId);
    const oldFile = path.join(sessionDir, `${oldId}.json`);
    const newFile = path.join(sessionDir, `${newId}.json`);

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
    if (!session.provider) session.provider = aiConfig.provider || "gemini";
    if (!session.model) session.model = aiConfig.model || "gemini-2.0-flash";
    if (!session.thinkingLevel) session.thinkingLevel = aiConfig.thinkingLevel || "medium";
    session.updatedAt = new Date().toISOString();

    await fsPromises.writeFile(newFile, JSON.stringify(session, null, 2));
    await fsPromises.unlink(oldFile);

    const activeInfo = readActiveSession(userId);
    if (activeInfo && activeInfo.active === oldId) {
        await setActiveSession(newId, userId);
    }
}

async function clearSession(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);

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

async function duplicateSession(sourceId, targetId, userId) {
    validateSessionId(sourceId);
    validateSessionId(targetId);

    if (sourceId === targetId) {
        throw new Error("Target session ID must be different");
    }

    const sessionDir = getUserSessionDir(userId);
    const sourceFile = path.join(sessionDir, `${sourceId}.json`);
    const targetFile = path.join(sessionDir, `${targetId}.json`);

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
    session.provider = session.provider || aiConfig.provider || "gemini";
    session.model = session.model || aiConfig.model || "gemini-2.0-flash";
    session.thinkingLevel = session.thinkingLevel || aiConfig.thinkingLevel || "medium";
    session.createdAt = now;
    session.updatedAt = now;
    if (!session.messages) {
        session.messages = [];
    }

    await fsPromises.writeFile(targetFile, JSON.stringify(session, null, 2));
    return { success: true };
}

async function getSessionInfo(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);

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

    const activeSessionName = readActiveSession(userId).active;

    return {
        id: session.id || sessionId,
        title: session.title || (sessionId.charAt(0).toUpperCase() + sessionId.slice(1) + " Help"),
        provider: session.provider || aiConfig.provider || "gemini",
        model: session.model || aiConfig.model || "gemini-2.0-flash",
        thinkingLevel: session.thinkingLevel || aiConfig.thinkingLevel || "medium",
        createdAt: session.createdAt || new Date().toISOString(),
        updatedAt: session.updatedAt || new Date().toISOString(),
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        isActive: activeSessionName === sessionId
    };
}

async function updateSessionSettings(sessionId, settings = {}, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    const session = getSessionObject(sessionId, sessionFile, userId);

    if (settings.provider) {
        validateProvider(settings.provider);
        session.provider = settings.provider;
    }
    if (settings.model) {
        session.model = settings.model;
    }
    if (settings.thinkingLevel) {
        validateThinkingLevel(settings.thinkingLevel);
        session.thinkingLevel = settings.thinkingLevel;
    }

    session.updatedAt = new Date().toISOString();
    await fsPromises.writeFile(sessionFile, JSON.stringify(session, null, 2));
    return {
        provider: session.provider,
        model: session.model,
        thinkingLevel: session.thinkingLevel,
    };
}

async function getSessionSettings(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    const session = getSessionObject(sessionId, sessionFile, userId);
    return {
        provider: session.provider || aiConfig.provider || "gemini",
        model: session.model || aiConfig.model || "gemini-2.0-flash",
        thinkingLevel: session.thinkingLevel || aiConfig.thinkingLevel || "medium",
    };
}

async function searchMessages(query, userId) {
    if (typeof query !== "string") {
        throw new Error("Query must be a string");
    }
    const cleanQuery = query.toLowerCase();
    const sessionDir = getUserSessionDir(userId);

    let files = [];
    try {
        files = await fsPromises.readdir(sessionDir);
    } catch (err) {
        return [];
    }

    const results = [];
    for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = path.join(sessionDir, file);
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
        } catch (e) { }
    }
    return results;
}

async function exportSession(sessionId, format, userId) {
    validateSessionId(sessionId);
    if (!format || typeof format !== "string") {
        throw new Error("Invalid format");
    }
    const cleanFormat = format.toLowerCase();
    if (cleanFormat !== "json" && cleanFormat !== "markdown" && cleanFormat !== "md") {
        throw new Error("Unsupported format. Use 'json' or 'markdown'");
    }

    const sessionDir = getUserSessionDir(userId);
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
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

    const userBase = getUserBaseDir(userId);
    const exportDir = path.join(userBase, "exports");
    await fsPromises.mkdir(exportDir, { recursive: true });

    let exportContent = "";
    let exportFileName = "";

    if (cleanFormat === "json") {
        exportContent = JSON.stringify(session, null, 2);
        exportFileName = `${sessionId}.json`;
    } else {
        const title = session.title || (sessionId.charAt(0).toUpperCase() + sessionId.slice(1) + " Help");
        const createdAt = session.createdAt || new Date().toISOString();
        const updatedAt = session.updatedAt || new Date().toISOString();
        const provider = session.provider || aiConfig.provider || "gemini";
        const model = session.model || aiConfig.model || "gemini-2.0-flash";
        const thinkingLevel = session.thinkingLevel || aiConfig.thinkingLevel || "medium";
        const messages = Array.isArray(session.messages) ? session.messages : [];

        let md = `# ${title}\n\n`;
        md += `- **ID**: ${sessionId}\n`;
        md += `- **Provider**: ${provider}\n`;
        md += `- **Model**: ${model}\n`;
        md += `- **Thinking Level**: ${thinkingLevel}\n`;
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

    const exportFilePath = path.join(exportDir, exportFileName);
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

async function importSession(sessionData, userId) {
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

    const sessionDir = getUserSessionDir(userId);
    const targetFile = path.join(sessionDir, `${session.id}.json`);
    const exists = await fsPromises.access(targetFile).then(() => true).catch(() => false);
    if (exists) {
        throw new Error("Session ID already exists");
    }

    const now = new Date().toISOString();
    const formattedSession = {
        id: session.id,
        title: session.title || (session.id.charAt(0).toUpperCase() + session.id.slice(1) + " Help"),
        provider: session.provider || aiConfig.provider || "gemini",
        model: session.model || aiConfig.model || "gemini-2.0-flash",
        thinkingLevel: session.thinkingLevel || aiConfig.thinkingLevel || "medium",
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

async function archiveSession(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const userBase = getUserBaseDir(userId);
    const archiveDir = path.join(userBase, "archives");
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    const archiveFile = path.join(archiveDir, `${sessionId}.json`);

    try {
        await fsPromises.access(sessionFile);
    } catch (err) {
        throw new Error("Session not found");
    }

    await fsPromises.mkdir(archiveDir, { recursive: true });

    const existsInArchives = await fsPromises.access(archiveFile).then(() => true).catch(() => false);
    if (existsInArchives) {
        throw new Error("Session already archived");
    }

    await fsPromises.rename(sessionFile, archiveFile);

    const activeInfo = readActiveSession(userId);
    if (activeInfo && activeInfo.active === sessionId) {
        const remaining = listUserSessions(userId);
        if (remaining.length > 0) {
            await setActiveSession(remaining[0].id, userId);
        } else {
            const activeFile = getUserActiveFile(userId);
            try { await fsPromises.unlink(activeFile); } catch (e) {}
        }
    }
}

async function restoreSession(sessionId, userId) {
    validateSessionId(sessionId);
    const sessionDir = getUserSessionDir(userId);
    const userBase = getUserBaseDir(userId);
    const archiveDir = path.join(userBase, "archives");
    const sessionFile = path.join(sessionDir, `${sessionId}.json`);
    const archiveFile = path.join(archiveDir, `${sessionId}.json`);

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
    getUserSessionDir,
    loadHistory,
    saveHistory,
    getActiveSession,
    readActiveSession,
    saveMessage,
    validateSessionId,
    setActiveSession,
    listUserSessions,
    createNewSession,
    switchUserSession,
    deleteSession,
    renameSession,
    clearSession,
    duplicateSession,
    getSessionInfo,
    searchMessages,
    exportSession,
    importSession,
    archiveSession,
    restoreSession,
    updateSessionSettings,
    getSessionSettings,
    getSessionObject
};