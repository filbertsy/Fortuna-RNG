const crypto = require("node:crypto");
const { getDatabase } = require("../database/database");
const { ALL_ITEMS, RARITIES } = require("../data/shop");

const ROTATION_MS = 24 * 60 * 60 * 1000;
const STOCK_SIZE = 12;
const WEIGHTS = [
    ["mythic", 52], ["secret", 28], ["fortunas_blessings", 13],
    ["heavenly", 5], ["divinity", 2]
];

function chooseRarity() {
    let roll = crypto.randomInt(100);
    for (const entry of WEIGHTS) {
        roll -= entry[1];
        if (roll < 0) return entry[0];
    }
    return "mythic";
}

function generateRotation() {
    const selected = [];
    const used = new Set();

    for (let slot = 0; slot < STOCK_SIZE; slot += 1) {
        let rarityKey = chooseRarity();
        let candidates = ALL_ITEMS.filter((item) => RARITIES.find((rarity) => rarity.name === item.rarity)?.key === rarityKey && !used.has(item.id));

        if (!candidates.length) {
            const available = RARITIES.filter((rarity) =>
                rarity.key !== "legendary" &&
                ALL_ITEMS.some((item) => item.id.split("_")[1] === rarity.key && !used.has(item.id))
            );
            if (!available.length) break;
            rarityKey = available[crypto.randomInt(available.length)].key;
            candidates = ALL_ITEMS.filter((item) => RARITIES.find((rarity) => rarity.name === item.rarity)?.key === rarityKey && !used.has(item.id));
        }

        const item = candidates[crypto.randomInt(candidates.length)];
        used.add(item.id);
        let stock = 1;
        if (rarityKey === "mythic") stock = crypto.randomInt(3, 7);
        else if (rarityKey === "secret") stock = crypto.randomInt(2, 4);
        else if (rarityKey === "fortunas_blessings") stock = crypto.randomInt(1, 3);
        selected.push({ item, stock });
    }

    return selected;
}

function getGuildShop(guildId, now) {
    const db = getDatabase();
    const rotation = db.prepare("SELECT refreshed_at, expires_at FROM guild_shop_rotations WHERE guild_id = ?").get(guildId);
    const rows = db.prepare("SELECT item_id, category, stock FROM guild_shop_stock WHERE guild_id = ? ORDER BY item_id").all(guildId);
    const items = rows.map((row) => {
        const item = ALL_ITEMS.find((entry) => entry.id === row.item_id);
        return item ? { ...item, stock: row.stock, rotating: true } : null;
    }).filter(Boolean);
    return {
        items,
        refreshedAt: rotation ? rotation.refreshed_at : now,
        expiresAt: rotation ? rotation.expires_at : now + ROTATION_MS
    };
}

function ensureGuildShop(guildId, now = Date.now()) {
    if (!guildId) throw new Error("The shop is only available inside a server.");
    const db = getDatabase();
    const refresh = db.transaction(() => {
        const rotation = db.prepare("SELECT expires_at FROM guild_shop_rotations WHERE guild_id = ?").get(guildId);
        if (rotation && rotation.expires_at > now) return false;

        const selected = generateRotation();
        db.prepare("DELETE FROM guild_shop_stock WHERE guild_id = ?").run(guildId);
        const insert = db.prepare("INSERT INTO guild_shop_stock (guild_id, item_id, category, stock) VALUES (?, ?, ?, ?)");
        for (const entry of selected) insert.run(guildId, entry.item.id, entry.item.category, entry.stock);

        db.prepare(
            "INSERT INTO guild_shop_rotations (guild_id, refreshed_at, expires_at) VALUES (?, ?, ?) " +
            "ON CONFLICT(guild_id) DO UPDATE SET refreshed_at = excluded.refreshed_at, expires_at = excluded.expires_at"
        ).run(guildId, now, now + ROTATION_MS);
        return true;
    });
    const refreshed = refresh();
    return { refreshed, ...getGuildShop(guildId, now) };
}

function isRotating(item) {
    return item.rarity !== "Legendary";
}

function autocompleteItems(interaction, category) {
    const focused = interaction.options.getFocused().trim().toLowerCase();
    const db = getDatabase();
    const rows = category === "tool"
        ? db.prepare("SELECT tool_id AS item_id FROM player_tools WHERE user_id = ?").all(interaction.user.id)
        : db.prepare("SELECT potion_id AS item_id FROM player_potions WHERE user_id = ? AND quantity > 0").all(interaction.user.id);
    const owned = new Set(rows.map((row) => row.item_id));
    return ALL_ITEMS.filter((item) => item.category === category && owned.has(item.id))
        .filter((item) => (item.name + " " + item.id).toLowerCase().includes(focused))
        .slice(0, 25)
        .map((item) => ({ name: item.name + " [" + item.rarity + "]", value: item.id }));
}

module.exports = { ROTATION_MS, STOCK_SIZE, ensureGuildShop, getGuildShop, isRotating, autocompleteItems };
