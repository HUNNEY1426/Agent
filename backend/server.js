require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const fileRoutes = require("./routes/file");
const shellRoutes = require("./routes/shell");
const aiRoutes = require("./routes/ai");
const pdfRoutes = require("./routes/pdf");
const historyRoutes = require("./routes/history");

const app = express();

// Allowed Origins for CORS with Credentials
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, CLI) or matching origins
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Permissive for local development with credentials
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "x-cli-agent"]
}));

// Cookie parser for reading HttpOnly JWT cookies
app.use(cookieParser());

// Request size limit to prevent abuse
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/ai", aiRoutes);
app.use("/file", fileRoutes);
app.use("/shell", shellRoutes);
app.use("/pdf", pdfRoutes);
app.use("/history", historyRoutes);

app.get("/", (req, res) => {
    res.json({
        status: "running",
        message: "AI Terminal Agent Server with Authentication",
        version: "2.1.0"
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.message);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || "INTERNAL_ERROR",
            message: err.message || "An unexpected error occurred"
        }
    });
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
            console.error(`Port ${PORT} is already in use by another process.`);
            process.exit(1);
        } else {
            console.error("Server error:", err.message);
        }
    });
}

module.exports = app;