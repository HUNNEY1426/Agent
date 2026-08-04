const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const {
    validateSessionId,
    deleteSession,
    renameSession,
    clearSession,
    readActiveSession,
    setActiveSession,
    duplicateSession,
    getSessionInfo,
    searchMessages,
    exportSession,
    importSession,
    archiveSession,
    restoreSession
} = require("../services/sessionService");

const MEMORY_DIR = path.join(__dirname, "../memory");
const SESSION_DIR = path.join(MEMORY_DIR, "sessions");

// Helper to create a temporary test session
async function createTestSession(id, data = {}) {
    const file = path.join(SESSION_DIR, `${id}.json`);
    const defaultData = {
        id: id,
        title: `${id.charAt(0).toUpperCase() + id.slice(1)} Help`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
            { role: "user", content: "hello" },
            { role: "assistant", content: "world" }
        ],
        ...data
    };
    await fsPromises.writeFile(file, JSON.stringify(defaultData, null, 2));
}

// Helper to check if file exists
async function sessionFileExists(id) {
    const file = path.join(SESSION_DIR, `${id}.json`);
    return fsPromises.access(file).then(() => true).catch(() => false);
}

// Helper to read session content
async function readSessionFile(id) {
    const file = path.join(SESSION_DIR, `${id}.json`);
    const content = await fsPromises.readFile(file, "utf8");
    return JSON.parse(content);
}

test("sessionService Milestone 1 Tests", async (t) => {
    // Preserve current active session to restore after tests
    let originalActive;
    try {
        originalActive = readActiveSession().active;
    } catch (e) {
        originalActive = "default";
    }

    t.afterEach(async () => {
        // Cleanup test session files
        const testFiles = ["t-temp-del", "t-temp-ren-1", "t-temp-ren-2", "t-temp-clear", "t-temp-dup-1", "t-temp-dup-2", "t-temp-info"];
        for (const fileId of testFiles) {
            const file = path.join(SESSION_DIR, `${fileId}.json`);
            try {
                await fsPromises.unlink(file);
            } catch (e) {
                // Ignore error if file doesn't exist
            }
        }
        // Restore original active session
        try {
            await setActiveSession(originalActive);
        } catch (e) {
            // Ignore
        }
    });

    await t.test("validateSessionId validation checks", () => {
        // Valid inputs
        assert.doesNotThrow(() => validateSessionId("valid-name"));
        assert.doesNotThrow(() => validateSessionId("valid_name_123"));
        assert.doesNotThrow(() => validateSessionId("Default"));

        // Invalid inputs
        assert.throws(() => validateSessionId("../invalid"), /Invalid session ID/);
        assert.throws(() => validateSessionId("invalid/path"), /Invalid session ID/);
        assert.throws(() => validateSessionId(""), /Invalid session ID/);
        assert.throws(() => validateSessionId(null), /Invalid session ID/);
        assert.throws(() => validateSessionId(undefined), /Invalid session ID/);
        assert.throws(() => validateSessionId("name with spaces"), /Invalid session ID/);
    });

    await t.test("deleteSession deletes files and handles active session logic", async () => {
        const testId = "t-temp-del";
        await createTestSession(testId);
        
        assert.ok(await sessionFileExists(testId));
        
        // Make it active
        await setActiveSession(testId);
        assert.strictEqual(readActiveSession().active, testId);

        // Delete it
        await deleteSession(testId);
        assert.ok(!(await sessionFileExists(testId)));

        // Active session should fallback to default
        assert.strictEqual(readActiveSession().active, "default");

        // Error checking
        await assert.rejects(() => deleteSession("non-existent"), /Session not found/);
        await assert.rejects(() => deleteSession("invalid/id"), /Invalid session ID/);
    });

    await t.test("renameSession renames files and updates metadata", async () => {
        const oldId = "t-temp-ren-1";
        const newId = "t-temp-ren-2";

        await createTestSession(oldId);
        assert.ok(await sessionFileExists(oldId));
        assert.ok(!(await sessionFileExists(newId)));

        // Set old as active
        await setActiveSession(oldId);
        assert.strictEqual(readActiveSession().active, oldId);

        // Rename
        await renameSession(oldId, newId);
        assert.ok(!(await sessionFileExists(oldId)));
        assert.ok(await sessionFileExists(newId));

        // Check internal structure update
        const renamedData = await readSessionFile(newId);
        assert.strictEqual(renamedData.id, newId);
        assert.strictEqual(renamedData.title, "T-temp-ren-2 Help");

        // Active session should update to new ID
        assert.strictEqual(readActiveSession().active, newId);

        // Error checking
        await assert.rejects(() => renameSession(oldId, newId), /Session not found/); // oldId doesn't exist anymore
        await assert.rejects(() => renameSession(newId, newId), /New session ID must be different/);

        // Collision check: create another oldId and try to rename to newId which now exists
        await createTestSession(oldId);
        await assert.rejects(() => renameSession(oldId, newId), /Session already exists/);
    });

    await t.test("clearSession clears message history", async () => {
        const testId = "t-temp-clear";
        await createTestSession(testId);
        
        const dataBefore = await readSessionFile(testId);
        assert.ok(dataBefore.messages.length > 0);

        // Clear
        await clearSession(testId);

        const dataAfter = await readSessionFile(testId);
        assert.strictEqual(dataAfter.messages.length, 0);

        // Error checking
        await assert.rejects(() => clearSession("non-existent"), /Session not found/);
        await assert.rejects(() => clearSession("invalid/id"), /Invalid session ID/);
    });

    await t.test("duplicateSession duplicates files and resets timestamps/id", async () => {
        const srcId = "t-temp-dup-1";
        const dstId = "t-temp-dup-2";

        await createTestSession(srcId);
        assert.ok(await sessionFileExists(srcId));
        assert.ok(!(await sessionFileExists(dstId)));

        // Duplicate
        await duplicateSession(srcId, dstId);
        assert.ok(await sessionFileExists(srcId));
        assert.ok(await sessionFileExists(dstId));

        // Check internal structure update
        const duplicatedData = await readSessionFile(dstId);
        assert.strictEqual(duplicatedData.id, dstId);
        assert.strictEqual(duplicatedData.title, "T-temp-dup-2 Help");
        assert.ok(duplicatedData.createdAt);
        assert.ok(duplicatedData.updatedAt);
        assert.strictEqual(duplicatedData.messages.length, 2);

        // Error checking
        await assert.rejects(() => duplicateSession("non-existent", dstId), /Session not found/);
        await assert.rejects(() => duplicateSession(srcId, dstId), /Session already exists/);
        await assert.rejects(() => duplicateSession(srcId, srcId), /Target session ID must be different/);
        await assert.rejects(() => duplicateSession("invalid/id", dstId), /Invalid session ID/);
        await assert.rejects(() => duplicateSession(srcId, "invalid/id"), /Invalid session ID/);
    });

    await t.test("getSessionInfo retrieves correct session metadata", async () => {
        const testId = "t-temp-info";
        await createTestSession(testId);

        // Set as active
        await setActiveSession(testId);

        const info = await getSessionInfo(testId);
        assert.strictEqual(info.id, testId);
        assert.strictEqual(info.title, "T-temp-info Help");
        assert.ok(info.createdAt);
        assert.ok(info.updatedAt);
        assert.strictEqual(info.messageCount, 2);
        assert.strictEqual(info.isActive, true);

        // Switch active session to "default" and check isActive is false
        await setActiveSession("default");
        const info2 = await getSessionInfo(testId);
        assert.strictEqual(info2.isActive, false);

        // Error checking
        await assert.rejects(() => getSessionInfo("non-existent"), /Session not found/);
        await assert.rejects(() => getSessionInfo("invalid/id"), /Invalid session ID/);
    });

    await t.test("searchMessages finds matching messages case-insensitively across sessions", async () => {
        const id1 = "t-search-1";
        const id2 = "t-search-2";
        await createTestSession(id1, {
            messages: [
                { role: "user", content: "I love unique-express-framework-search-test" },
                { role: "assistant", content: "Yes, Node.js is great" }
            ]
        });
        await createTestSession(id2, {
            messages: [
                { role: "user", content: "How to use unique-python-language-search-test?" },
                { role: "assistant", content: "unique-python-language-search-test is a versatile language" }
            ]
        });

        // Search for "unique-express-framework-search-test"
        const resExpress = await searchMessages("unique-express-framework-search-test");
        assert.strictEqual(resExpress.length, 1);
        assert.strictEqual(resExpress[0].session, id1);
        assert.strictEqual(resExpress[0].role, "user");
        assert.strictEqual(resExpress[0].content, "I love unique-express-framework-search-test");

        // Search for "unique-python-language-search-test" (should match both user and assistant due to case-insensitivity)
        const resPython = await searchMessages("UNIQUE-PYTHON-LANGUAGE-search-test");
        assert.strictEqual(resPython.length, 2);
        assert.ok(resPython.some(m => m.session === id2 && m.role === "user"));
        assert.ok(resPython.some(m => m.session === id2 && m.role === "assistant"));

        // Error checking
        await assert.rejects(() => searchMessages(123), /Query must be a string/);

        // Cleanup
        try { await fsPromises.unlink(path.join(SESSION_DIR, `${id1}.json`)); } catch(e) {}
        try { await fsPromises.unlink(path.join(SESSION_DIR, `${id2}.json`)); } catch(e) {}
    });

    await t.test("exportSession exports to JSON and Markdown format", async () => {
        const id = "t-export-1";
        await createTestSession(id, {
            title: "Export Test Session",
            messages: [
                { role: "user", content: "export me" }
            ]
        });

        // JSON export
        const expJson = await exportSession(id, "json");
        assert.ok(fs.existsSync(expJson.filePath));
        const parsedExport = JSON.parse(expJson.content);
        assert.strictEqual(parsedExport.id, id);

        // MD export
        const expMd = await exportSession(id, "markdown");
        assert.ok(fs.existsSync(expMd.filePath));
        assert.ok(expMd.content.includes("# Export Test Session"));
        assert.ok(expMd.content.includes("### User\nexport me"));

        // Error checking
        await assert.rejects(() => exportSession(id, "xml"), /Unsupported format/);
        await assert.rejects(() => exportSession("non-existent", "json"), /Session not found/);

        // Cleanup
        try { await fsPromises.unlink(path.join(SESSION_DIR, `${id}.json`)); } catch(e) {}
        try { await fsPromises.unlink(expJson.filePath); } catch(e) {}
        try { await fsPromises.unlink(expMd.filePath); } catch(e) {}
    });

    await t.test("importSession imports valid JSON structure and prevents duplicates", async () => {
        const importData = {
            id: "t-import-1",
            title: "Imported Session",
            messages: [
                { role: "user", content: "imported message" }
            ]
        };

        // Standard import
        const imported = await importSession(importData);
        assert.strictEqual(imported.id, "t-import-1");
        assert.strictEqual(imported.title, "Imported Session");

        const file = path.join(SESSION_DIR, "t-import-1.json");
        assert.ok(fs.existsSync(file));

        // Duplicate prevention
        await assert.rejects(() => importSession(importData), /Session ID already exists/);

        // Structure validation checks
        await assert.rejects(() => importSession({}), /Invalid session ID/);
        await assert.rejects(() => importSession({ id: "invalid/id" }), /Invalid session ID/);
        await assert.rejects(() => importSession({ id: "valid", messages: "not-an-array" }), /messages must be an array/);
        await assert.rejects(() => importSession({ id: "valid", messages: [{}] }), /message role must be a non-empty string/);

        // Cleanup
        try { await fsPromises.unlink(file); } catch(e) {}
    });

    await t.test("archiveSession moves file to archives and switches active if needed, restoreSession restores it", async () => {
        const id = "t-archive-1";
        await createTestSession(id);

        // Make it active
        await setActiveSession(id);
        assert.strictEqual(readActiveSession().active, id);

        // Archive it
        await archiveSession(id);

        // Assertions for archive
        assert.ok(!fs.existsSync(path.join(SESSION_DIR, `${id}.json`)));
        assert.ok(fs.existsSync(path.join(MEMORY_DIR, "archives", `${id}.json`)));
        assert.strictEqual(readActiveSession().active, "default");

        // Try to archive again
        await assert.rejects(() => archiveSession(id), /Session not found/);

        // Restore it
        await restoreSession(id);

        // Assertions for restore
        assert.ok(fs.existsSync(path.join(SESSION_DIR, `${id}.json`)));
        assert.ok(!fs.existsSync(path.join(MEMORY_DIR, "archives", `${id}.json`)));

        // Try to restore again
        await assert.rejects(() => restoreSession(id), /Session not found in archives/);

        // Cleanup
        try { await fsPromises.unlink(path.join(SESSION_DIR, `${id}.json`)); } catch(e) {}
        try { await fsPromises.unlink(path.join(MEMORY_DIR, "archives", `${id}.json`)); } catch(e) {}
    });
});
