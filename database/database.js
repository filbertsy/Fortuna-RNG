const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

let database;

function getDatabase() {
    if (database) return database;

    const defaultPath = path.join(__dirname, "fortuna.sqlite");
    const databasePath = process.env.DATABASE_PATH
        ? path.resolve(process.env.DATABASE_PATH)
        : defaultPath;

    fs.mkdirSync(path.dirname(databasePath), { recursive: true });

    database = new Database(databasePath);
    database.pragma("journal_mode = WAL");
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    database.pragma("synchronous = NORMAL");

    initializeSchema(database);
    return database;
}

function hasColumn(db, table, column) {
    return db.prepare(`PRAGMA table_info(${table})`).all()
        .some((entry) => entry.name === column);
}

function addColumn(db, table, column, definition) {
    if (!hasColumn(db, table, column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
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

    addColumn(db, "players", "coins", "INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0)");
    addColumn(db, "players", "daily_streak", "INTEGER NOT NULL DEFAULT 0 CHECK (daily_streak >= 0)");
    addColumn(db, "players", "last_daily_at", "INTEGER");
    addColumn(db, "players", "selected_guild_id", "TEXT");

    db.exec(`
        CREATE TABLE IF NOT EXISTS player_favorites (
            user_id TEXT NOT NULL,
            rng_id TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            PRIMARY KEY (user_id, rng_id),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS player_tools (
            user_id TEXT NOT NULL,
            tool_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
            equipped INTEGER NOT NULL DEFAULT 0 CHECK (equipped IN (0, 1)),
            PRIMARY KEY (user_id, tool_id),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS player_potions (
            user_id TEXT NOT NULL,
            potion_id TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            PRIMARY KEY (user_id, potion_id),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS active_potions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            potion_id TEXT NOT NULL,
            source_guild_id TEXT,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_active_potions_user_expiry
            ON active_potions(user_id, expires_at);

        CREATE TABLE IF NOT EXISTS shop_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            guild_id TEXT,
            item_id TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            price_paid INTEGER NOT NULL,
            purchased_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            announce_channel_id TEXT,
            announce_threshold TEXT NOT NULL DEFAULT '10000',
            ping_everyone INTEGER NOT NULL DEFAULT 0 CHECK (ping_everyone IN (0, 1)),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
        );

        CREATE TABLE IF NOT EXISTS guild_shop_stock (
            guild_id TEXT NOT NULL,
            item_id TEXT NOT NULL,
            category TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT -1,
            PRIMARY KEY (guild_id, item_id, category)
        );

        CREATE TABLE IF NOT EXISTS server_momentum (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            momentum INTEGER NOT NULL DEFAULT 0 CHECK (momentum >= 0),
            updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            PRIMARY KEY (guild_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS player_achievements (
            user_id TEXT NOT NULL,
            achievement_id TEXT NOT NULL,
            unlocked_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
            PRIMARY KEY (user_id, achievement_id),
            FOREIGN KEY (user_id) REFERENCES players(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS option_guarantees (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            rolls_remaining INTEGER NOT NULL DEFAULT 0 CHECK (rolls_remaining >= 0),
            PRIMARY KEY (guild_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_players_coins ON players(coins DESC);
        CREATE INDEX IF NOT EXISTS idx_players_rolls ON players(total_rolls DESC);
        CREATE INDEX IF NOT EXISTS idx_purchases_user ON shop_purchases(user_id, purchased_at DESC);

        CREATE TRIGGER IF NOT EXISTS trg_players_updated_at
        AFTER UPDATE ON players
        FOR EACH ROW
        BEGIN
            UPDATE players SET updated_at = unixepoch() * 1000
            WHERE user_id = NEW.user_id;
        END;
    `);
}

function closeDatabase() {
    if (!database) return;
    database.close();
    database = undefined;
}

module.exports = { getDatabase, closeDatabase, initializeSchema };
