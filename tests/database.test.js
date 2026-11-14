const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("database initializes all global and server-scoped tables", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "fortuna-rng-test-"));
    process.env.DATABASE_PATH = path.join(directory, "test.sqlite");

    const { getDatabase, closeDatabase } = require("../database/database");

    try {
        const db = getDatabase();
        const tables = new Set(
            db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name)
        );

        for (const name of [
            "players", "rng_inventory", "roll_history", "player_favorites",
            "player_tools", "player_potions", "active_potions", "shop_purchases",
            "guild_settings", "guild_shop_stock", "server_momentum",
            "player_achievements", "option_guarantees", "bot_admins"
        ]) {
            assert.ok(tables.has(name), `Missing table: ${name}`);
        }

        db.prepare("INSERT INTO players (user_id, coins) VALUES (?, ?)").run("test-user", 250);
        db.prepare("INSERT INTO player_potions (user_id, potion_id, quantity) VALUES (?, ?, ?)").run("test-user", "luck_potion", 3);
        assert.equal(db.prepare("SELECT coins FROM players WHERE user_id = ?").get("test-user").coins, 250);
        assert.equal(db.prepare("SELECT quantity FROM player_potions WHERE user_id = ? AND potion_id = ?").get("test-user", "luck_potion").quantity, 3);
    } finally {
        closeDatabase();
        fs.rmSync(directory, { recursive: true, force: true });
        delete process.env.DATABASE_PATH;
    }
});
