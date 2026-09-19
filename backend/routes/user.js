const express = require("express");
const UserModel = require("../database/userModel");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /user/profile
router.get("/profile", authMiddleware, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: "USER_NOT_FOUND", message: "User not found" }
            });
        }
        res.json({
            success: true,
            user
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: { code: "PROFILE_ERROR", message: err.message }
        });
    }
});

// PUT /user/profile
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const { name, settings } = req.body;
        const updated = await UserModel.updateProfile(req.user.id, { name, settings });
        res.json({
            success: true,
            user: updated,
            message: "Profile updated successfully"
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: { code: "UPDATE_FAILED", message: err.message }
        });
    }
});

module.exports = router;
