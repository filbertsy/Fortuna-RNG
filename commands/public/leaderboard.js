const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { formatNumber, baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the global Fortuna RNG leaderboard.")
        .addStringOption((option) =>
            option.setName("category")
                .setDescription("Leaderboard category")
                .setRequired(true)
                .addChoices(
                    { name: "Total rolls", value: "rolls" },
                    { name: "Coins", value: "coins" },
                    { name: "Daily streak", value: "streak" }
                )
        ),

    async execute(interaction) {
        const category = interaction.options.getString("category", true);
        const columns = {
            rolls: { column: "total_rolls", label: "Total rolls" },
            coins: { column: "coins", label: "Coins" },
            streak: { column: "daily_streak", label: "Daily streak" }
        };
        const selected = columns[category];
        if (!selected) {
            return interaction.reply({ content: "Invalid leaderboard category.", flags: MessageFlags.Ephemeral });
        }

        const db = getDatabase();
        const rows = db.prepare(`
            SELECT user_id, ${selected.column} AS score
            FROM players
            WHERE ${selected.column} > 0
            ORDER BY ${selected.column} DESC, user_id ASC
            LIMIT 10
        `).all();

        const lines = rows.length
            ? rows.map((row, index) => {
                const medal = ["🥇", "🥈", "🥉"][index] || `**${index + 1}.**`;
                return `${medal} <@!${row.user_id}> — **${formatNumber(row.score)}**`;
            }).join("\n")
            : "No rankings yet. Start rolling to appear here.";

        const embed = baseEmbed(`Global leaderboard · ${selected.label}`, lines);
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
};
