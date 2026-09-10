require("dotenv").config();

const express = require("express");
const fileRoutes = require("./routes/file");
const shellRoutes = require("./routes/shell");
const aiRoutes = require("./routes/ai");

const app = express();

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// Request size limit to prevent abuse
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/ai", aiRoutes);
app.use("/file", fileRoutes);
app.use("/shell", shellRoutes);

app.get("/", (req, res) => {
    res.json({
        status: "running",
        message: "AI Terminal Agent Server",
        version: "2.0.0"
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.message);
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred"
        }
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;