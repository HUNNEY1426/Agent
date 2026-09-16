const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { db, initDatabase } = require("./db");

const SALT_ROUNDS = 10;

class UserModel {
    static async ensureReady() {
        await initDatabase();
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
        if (row.settings) {
            try {
                parsedSettings = JSON.parse(row.settings);
            } catch (e) {
                parsedSettings = {};
            }
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
        await this.ensureReady();
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
        const settingsStr = JSON.stringify(settings);

        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO users (id, name, email, passwordHash, settings, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(sql, [userId, trimmedName, trimmedEmail, passwordHash, settingsStr, now, now], function (err) {
                if (err) {
                    if (err.message && err.message.includes("UNIQUE constraint failed")) {
                        const duplicateErr = new Error("Email is already registered");
                        duplicateErr.code = "EMAIL_EXISTS";
                        return reject(duplicateErr);
                    }
                    return reject(err);
                }
                resolve({
                    id: userId,
                    name: trimmedName,
                    email: trimmedEmail,
                    settings,
                    createdAt: now,
                    updatedAt: now
                });
            });
        });
    }

    static async findByEmail(email, includePassword = false) {
        await this.ensureReady();
        const trimmedEmail = (email || "").trim().toLowerCase();
        if (!trimmedEmail) return null;

        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
            db.get(sql, [trimmedEmail], (err, row) => {
                if (err) return reject(err);
                if (!row) return resolve(null);

                if (includePassword) {
                    let parsedSettings = {};
                    if (row.settings) {
                        try { parsedSettings = JSON.parse(row.settings); } catch (e) {}
                    }
                    return resolve({
                        id: row.id,
                        name: row.name,
                        email: row.email,
                        passwordHash: row.passwordHash,
                        settings: parsedSettings,
                        createdAt: row.createdAt,
                        updatedAt: row.updatedAt
                    });
                }
                resolve(UserModel.formatUser(row));
            });
        });
    }

    static async findById(id) {
        await this.ensureReady();
        if (!id) return null;

        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
            db.get(sql, [id], (err, row) => {
                if (err) return reject(err);
                resolve(UserModel.formatUser(row));
            });
        });
    }

    static async updateProfile(id, { name, settings }) {
        await this.ensureReady();
        const currentUser = await this.findById(id);
        if (!currentUser) {
            throw new Error("User not found");
        }

        const now = new Date().toISOString();
        const updatedName = name !== undefined ? name.trim() : currentUser.name;
        const updatedSettings = settings !== undefined
            ? { ...currentUser.settings, ...settings }
            : currentUser.settings;
        const settingsStr = JSON.stringify(updatedSettings);

        return new Promise((resolve, reject) => {
            const sql = `
                UPDATE users
                SET name = ?, settings = ?, updatedAt = ?
                WHERE id = ?
            `;
            db.run(sql, [updatedName, settingsStr, now, id], function (err) {
                if (err) return reject(err);
                resolve({
                    id,
                    name: updatedName,
                    email: currentUser.email,
                    settings: updatedSettings,
                    createdAt: currentUser.createdAt,
                    updatedAt: now
                });
            });
        });
    }
}

module.exports = UserModel;
