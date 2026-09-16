const express = require("express");
const jwt = require("jsonwebtoken");
const UserModel = require("../database/userModel");
const { authMiddleware, JWT_SECRET } = require("../middleware/authMiddleware");

const router = express.Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// POST /auth/signup
router.post("/signup", async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Name is required" }
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Email is required" }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Please enter a valid email address" }
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Password must be at least 6 characters" }
            });
        }

        if (confirmPassword !== undefined && password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Passwords do not match" }
            });
        }

        const user = await UserModel.createUser({
            name: name.trim(),
            email: email.trim(),
            password
        });

        const token = generateToken(user);
        res.cookie("token", token, COOKIE_OPTIONS);

        return res.status(201).json({
            success: true,
            user,
            token,
            message: "Account created successfully"
        });
    } catch (err) {
        if (err.code === "EMAIL_EXISTS") {
            return res.status(409).json({
                success: false,
                error: { code: "EMAIL_EXISTS", message: "An account with this email already exists" }
            });
        }
        return res.status(400).json({
            success: false,
            error: { code: "SIGNUP_FAILED", message: err.message || "Failed to create account" }
        });
    }
});

// POST /auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim() || !password) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "Email and password are required" }
            });
        }

        const userWithPassword = await UserModel.findByEmail(email.trim(), true);

        if (!userWithPassword) {
            return res.status(401).json({
                success: false,
                error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
            });
        }

        const isMatch = await UserModel.comparePassword(password, userWithPassword.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
            });
        }

        const safeUser = {
            id: userWithPassword.id,
            name: userWithPassword.name,
            email: userWithPassword.email,
            settings: userWithPassword.settings,
            createdAt: userWithPassword.createdAt,
            updatedAt: userWithPassword.updatedAt
        };

        const token = generateToken(safeUser);
        res.cookie("token", token, COOKIE_OPTIONS);

        return res.json({
            success: true,
            user: safeUser,
            token,
            message: "Logged in successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { code: "LOGIN_FAILED", message: "Login failed due to an internal error" }
        });
    }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/"
    });
    return res.json({
        success: true,
        message: "Logged out successfully"
    });
});

// GET /auth/me
router.get("/me", authMiddleware, (req, res) => {
    return res.json({
        success: true,
        user: req.user
    });
});

module.exports = router;
