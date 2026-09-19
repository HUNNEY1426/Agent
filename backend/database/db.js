const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, "agent.db");

if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Failed to connect to SQLite database:", err.message);
    }
});

function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    passwordHash TEXT NOT NULL,
                    settings TEXT,
                    createdAt TEXT NOT NULL,
                    updatedAt TEXT NOT NULL
                )
            `, (err) => {
                if (err) {
                    return reject(err);
                }

                // Create index on email if not exists
                db.run(`
                    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
                `, (err2) => {
                    if (err2) return reject(err2);
                    resolve();
                });
            });
        });
    });
}

// Automatically initialize schema on module load
initDatabase().catch((err) => {
    console.error("Database initialization error:", err);
});

module.exports = {
    db,
    DB_PATH,
    initDatabase
};
