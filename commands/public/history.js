const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("history")
        .setDescription("View recent global roll history.")
        .addUserOption((option) => option.setName("user").setDescription("Player to inspect"))
        .addIntegerOption((option) => option.setName("count").setDescription("Number of results").setMinValue(1).setMaxValue(15)),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const count = interaction.options.getInteger("count") || 10;
        ensurePlayer(target.id);

        const rows = getDatabase().prepare(`
            SELECT result_name, odds, rolled_at
            FROM roll_history
            WHERE user_id = ?
            ORDER BY rolled_at DESC, id DESC
            LIMIT ?
        `).all(target.id, count);

        const description = rows.length
            ? rows.map((row, index) =>
                `**${index + 1}. ${row.result_name}** — 1 in ${BigInt(row.odds).toLocaleString("en-US")} · <t:${Math.floor(row.rolled_at / 1000)}:R>`
            ).join("\n")
            : "No rolls recorded yet.";

        await interaction.reply({
            embeds: [baseEmbed(`${target.username}'s roll history`, description)],
            flags: target.id === interaction.user.id ? MessageFlags.Ephemeral : undefined
        });
    }
};
