const { EmbedBuilder } = require("discord.js");
const { getDatabase } = require("../database/database");

const GOLD = 0xD6B66C;
const DARK = 0x202124;

function ensurePlayer(userId) {
    const db = getDatabase();
    db.prepare("INSERT OR IGNORE INTO players (user_id) VALUES (?)").run(userId);
    return db.prepare("SELECT * FROM players WHERE user_id = ?").get(userId);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours) return `${hours}h ${minutes}m`;
    if (minutes) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
}

function baseEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(GOLD)
        .setTitle(title)
        .setDescription(description || null)
        .setFooter({ text: "Fortuna RNG • Does fortune favor you?" })
        .setTimestamp();
}

function isOwner(userId) {
    return Boolean(process.env.OWNER_ID) && userId === process.env.OWNER_ID;
}

module.exports = {
    GOLD,
    DARK,
    ensurePlayer,
    formatNumber,
    formatDuration,
    baseEmbed,
    isOwner
};
