const express = require("express");
const fs = require("fs");

const router = express.Router();

router.post("/create", (req, res) => {
    try {
        const { filename } = req.body;

        fs.writeFileSync(filename, "");

        res.json({
            message: "File Created Successfully",
        });
    } catch (err) {
        res.status(500).json({
            error: err.message,
        });
    }
});

router.get("/read/:filename", (req, res) => {
    try {
        const filename = req.params.filename;

        if (!fs.existsSync(filename)) {

            return res.status(404).json({
                message: "File not found"
            });

        }

        const file = fs.readFileSync(filename, "utf8");

        res.json({
            content: file
        });

        res.json({
            content: file,
        });
    } catch (err) {
        res.status(404).json({
            error: "File not found",
        });
    }
});

router.delete("/delete/:filename", (req, res) => {
    try {
        const filename = req.params.filename;

        if (!fs.existsSync(filename)) {

            return res.status(404).json({
                message: "File not found"
            });

        }

        fs.unlinkSync(filename);

        res.json({
            message: "File Deleted"
        });

        res.json({
            message: "File Deleted Successfully",
        });
    } catch (err) {
        res.status(404).json({
            error: "File not found",
        });
    }
});

module.exports = router;