const express = require("express");
const { exec } = require("child_process");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Protect shell routes
router.use(authMiddleware);

router.post("/run", (req, res) => {
    const { command } = req.body;

    if (!command || typeof command !== "string") {
        return res.status(400).json({
            success: false,
            error: "Command is required"
        });
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                output: error.message
            });
        }

        if (stderr) {
            return res.status(500).json({
                output: stderr
            });
        }

        res.json({
            output: stdout
        });
    });
});

module.exports = router;