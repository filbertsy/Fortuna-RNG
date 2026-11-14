const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");

const DEFINITIONS = [
    { id: "first_roll", name: "First Fortune", description: "Complete your first roll.", test: (p, c) => p.total_rolls >= 1 },
    { id: "roll_100", name: "Getting Started", description: "Complete 100 rolls.", test: (p) => p.total_rolls >= 100 },
    { id: "roll_1000", name: "Persistent", description: "Complete 1,000 rolls.", test: (p) => p.total_rolls >= 1000 },
    { id: "roll_10000", name: "Fortune Seeker", description: "Complete 10,000 rolls.", test: (p) => p.total_rolls >= 10000 },
    { id: "collection_10", name: "Collector", description: "Discover 10 unique RNGs.", test: (p, c) => c >= 10 },
    { id: "collection_100", name: "Curator", description: "Discover 100 unique RNGs.", test: (p, c) => c >= 100 },
    { id: "coins_10000", name: "Coin Pile", description: "Hold 10,000 coins at once.", test: (p) => p.coins >= 10000 },
    { id: "coins_1000000", name: "Fortune's Favorite", description: "Hold 1,000,000 coins at once.", test: (p) => p.coins >= 1000000 },
    { id: "streak_7", name: "A Week of Fortune", description: "Reach a 7-day daily streak.", test: (p) => p.daily_streak >= 7 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("achievements")
        .setDescription("View your unlocked and locked achievements."),

    async execute(interaction) {
        const db = getDatabase();
        const player = ensurePlayer(interaction.user.id);
        const unique = db.prepare("SELECT COUNT(*) AS count FROM rng_inventory WHERE user_id = ?").get(interaction.user.id).count;
        const unlockedNow = DEFINITIONS.filter((entry) => entry.test(player, unique));

        const unlock = db.prepare("INSERT OR IGNORE INTO player_achievements (user_id, achievement_id) VALUES (?, ?)");
        const save = db.transaction(() => {
            for (const entry of unlockedNow) unlock.run(interaction.user.id, entry.id);
        });
        save();

        const saved = new Set(db.prepare("SELECT achievement_id FROM player_achievements WHERE user_id = ?").all(interaction.user.id).map((row) => row.achievement_id));
        const lines = DEFINITIONS.map((entry) =>
            `${saved.has(entry.id) ? "🏅" : "🔒"} **${entry.name}** — ${entry.description}`
        );

        const embed = baseEmbed("Achievements", `${saved.size}/${DEFINITIONS.length} unlocked\n\n${lines.join("\n")}`);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
