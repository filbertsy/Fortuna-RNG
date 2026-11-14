const { getDatabase } = require("../database/database");
const { TOOLS, POTIONS } = require("../data/shop");

const SCALE = 10000n;

function getLuck(userId, now = Date.now()) {
    const db = getDatabase();
    const player = db.prepare("SELECT selected_guild_id FROM players WHERE user_id = ?").get(userId);
    const guildId = player?.selected_guild_id ?? null;

    const equipped = db.prepare(`
        SELECT tool_id FROM player_tools
        WHERE user_id = ? AND equipped = 1
    `).all(userId);

    const active = db.prepare(`
        SELECT potion_id FROM active_potions
        WHERE user_id = ? AND expires_at > ? AND source_guild_id IS ?
    `).all(userId, now, guildId);

    let multiplier = 1;
    for (const row of equipped) {
        const tool = TOOLS.find((item) => item.id === row.tool_id);
        if (tool) multiplier += tool.multiplier - 1;
    }
    for (const row of active) {
        const potion = POTIONS.find((item) => item.id === row.potion_id);
        if (potion) multiplier += potion.multiplier - 1;
    }

    return {
        multiplier,
        scaled: BigInt(Math.max(1, Math.floor(multiplier * Number(SCALE)))),
        equippedCount: equipped.length,
        activePotionCount: active.length,
        guildId
    };
}

module.exports = { getLuck, SCALE };
