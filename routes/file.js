const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Workspace root — all file operations restricted to this directory
const WORKSPACE_ROOT = path.resolve(__dirname, "..");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validate filename and prevent path traversal
function sanitizePath(filename) {
    if (!filename || typeof filename !== "string") {
        return { error: "Filename is required" };
    }

    // Block obvious traversal patterns
    if (filename.includes("..") || filename.includes("~")) {
        return { error: "Invalid filename: path traversal not allowed" };
    }

    const resolved = path.resolve(WORKSPACE_ROOT, filename);

    // Ensure resolved path is within workspace
    if (!resolved.startsWith(WORKSPACE_ROOT)) {
        return { error: "Access denied: path outside workspace" };
    }

    // Block access to sensitive files
    const blocked = [".env", ".git", "node_modules"];
    const relative = path.relative(WORKSPACE_ROOT, resolved);
    const firstSegment = relative.split(path.sep)[0];
    if (blocked.includes(firstSegment)) {
        return { error: "Access denied: protected path" };
    }

    return { safePath: resolved };
}

// Create File
router.post("/create", (req, res) => {
    try {
        const { filename, content } = req.body;
        const { safePath, error } = sanitizePath(filename);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        if (content && Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE) {
            return res.status(400).json({
                success: false,
                error: "File content exceeds maximum size (5MB)"
            });
        }

        // Create parent directories if needed
        const dir = path.dirname(safePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(safePath, content || "");

        res.json({
            success: true,
            message: "File Created Successfully",
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// Read File
router.get("/read/:filename", (req, res) => {
    try {
        const filename = req.params.filename;
        const { safePath, error } = sanitizePath(filename);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        if (!fs.existsSync(safePath)) {
            return res.status(404).json({
                success: false,
                error: "File not found"
            });
        }

        const stats = fs.statSync(safePath);
        if (stats.size > MAX_FILE_SIZE) {
            return res.status(413).json({
                success: false,
                error: "File too large to read (max 5MB)"
            });
        }

        const content = fs.readFileSync(safePath, "utf8");

        res.json({
            success: true,
            content
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// Delete File
router.delete("/delete/:filename", (req, res) => {
    try {
        const filename = req.params.filename;
        const { safePath, error } = sanitizePath(filename);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        if (!fs.existsSync(safePath)) {
            return res.status(404).json({
                success: false,
                error: "File not found"
            });
        }

        fs.unlinkSync(safePath);

        res.json({
            success: true,
            message: "File Deleted Successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

// List Files in directory
router.get("/list", (req, res) => {
    try {
        const dir = req.query.dir || ".";
        const { safePath, error } = sanitizePath(dir);

        if (error) {
            return res.status(400).json({ success: false, error });
        }

        if (!fs.existsSync(safePath) || !fs.statSync(safePath).isDirectory()) {
            return res.status(404).json({
                success: false,
                error: "Directory not found"
            });
        }

        const items = fs.readdirSync(safePath).map(name => {
            const fullPath = path.join(safePath, name);
            const stat = fs.statSync(fullPath);
            return {
                name,
                type: stat.isDirectory() ? "directory" : "file",
                size: stat.isFile() ? stat.size : undefined
            };
        });

        res.json({ success: true, items });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
        });
    }
});

module.exports = router;