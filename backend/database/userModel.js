const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const SALT_ROUNDS = 10;
const usersDB = [];

class UserModel {
    static async ensureReady() {
        return Promise.resolve();
    }

    static async hashPassword(password) {
        return await bcrypt.hash(password, SALT_ROUNDS);
    }

    static async comparePassword(password, hash) {
        if (!password || !hash) return false;
        return await bcrypt.compare(password, hash);
    }

    static formatUser(row) {
        if (!row) return null;
        let parsedSettings = {};
        if (typeof row.settings === 'string') {
            try {
                parsedSettings = JSON.parse(row.settings);
            } catch (e) {
                parsedSettings = {};
            }
        } else if (row.settings) {
            parsedSettings = row.settings;
        }
        
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            settings: parsedSettings,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };
    }

    static async createUser({ name, email, password, settings = {} }) {
        const trimmedEmail = (email || "").trim().toLowerCase();
        const trimmedName = (name || "").trim();

        if (!trimmedEmail) throw new Error("Email is required");
        if (!trimmedName) throw new Error("Name is required");
        if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

        const existing = await this.findByEmail(trimmedEmail);
        if (existing) {
            const err = new Error("Email is already registered");
            err.code = "EMAIL_EXISTS";
            throw err;
        }

        const passwordHash = await this.hashPassword(password);
        const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const now = new Date().toISOString();

        const newUser = {
            id: userId,
            name: trimmedName,
            email: trimmedEmail,
            passwordHash,
            settings,
            createdAt: now,
            updatedAt: now
        };

        usersDB.push(newUser);

        return this.formatUser(newUser);
    }

    static async findByEmail(email, includePassword = false) {
        const trimmedEmail = (email || "").trim().toLowerCase();
        if (!trimmedEmail) return null;

        const row = usersDB.find(u => u.email === trimmedEmail);
        if (!row) return null;

        if (includePassword) {
            return {
                id: row.id,
                name: row.name,
                email: row.email,
                passwordHash: row.passwordHash,
                settings: row.settings,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            };
        }
        return this.formatUser(row);
    }

    static async findById(id) {
        if (!id) return null;
        const row = usersDB.find(u => u.id === id);
        if (!row) return null;
        return this.formatUser(row);
    }

    static async updateProfile(id, { name, settings }) {
        const currentUserIndex = usersDB.findIndex(u => u.id === id);
        if (currentUserIndex === -1) {
            throw new Error("User not found");
        }

        const currentUser = usersDB[currentUserIndex];
        const now = new Date().toISOString();
        
        if (name !== undefined) currentUser.name = name.trim();
        if (settings !== undefined) currentUser.settings = { ...currentUser.settings, ...settings };
        currentUser.updatedAt = now;

        return this.formatUser(currentUser);
    }
}

module.exports = UserModel;
