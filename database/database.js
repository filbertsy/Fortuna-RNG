const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

let database;

function getDatabase() {
    if (database) return database;

    const databaseDirectory = path.join(__dirname);
    fs.mkdirSync(databaseDirectory, { recursive: true });

    const databasePath = process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : path.join(databaseDirectory, "fortuna.sqlite");

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    database.pragma("synchronous = NORMAL");

    initializeSchema(database);
    return database;
}

function initializeSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS players (
            user_id TEXT PRIMARY KEY,
            total_rolls INTEGER NOT NULL DEFAULT 0 CHECK (total_rolls >= 0),
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        CREATE TABLE IF NOT EXISTS rng_inventory (
            user_id TEXT NOT NULL,
            rng_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            first_obtained_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            last_obtained_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            PRIMARY KEY (user_id, rng_id),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS roll_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            rng_id TEXT NOT NULL,
            result_name TEXT NOT NULL,
            odds TEXT NOT NULL,
            rolled_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_roll_history_user_time
            ON roll_history(user_id, rolled_at DESC);

        CREATE INDEX IF NOT EXISTS idx_rng_inventory_user
            ON rng_inventory(user_id);
    `);

    // Keep timestamps and inventory acquisition metadata consistent on updates.
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS trg_players_updated_at
        AFTER UPDATE OF total_rolls ON players
        FOR EACH ROW
        BEGIN
            UPDATE players
            SET updated_at = unixepoch() * 1000
            WHERE user_id = NEW.user_id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_rng_inventory_last_obtained
        AFTER UPDATE OF quantity ON rng_inventory
        FOR EACH ROW
        BEGIN
            UPDATE rng_inventory
            SET last_obtained_at = unixepoch() * 1000
            WHERE user_id = NEW.user_id AND rng_id = NEW.rng_id;
        END;
    `);
}

function closeDatabase() {
    if (!database) return;
    database.close();
    database = undefined;
}

module.exports = {
    getDatabase,
    closeDatabase,
    initializeSchema
};
