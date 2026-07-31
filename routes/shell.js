const express = require("express");
const { exec } = require("child_process");

const router = express.Router();

router.post("/run", (req, res) => {

    const { command } = req.body;

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