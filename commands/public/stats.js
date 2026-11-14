const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const rngs = require("../../data/rngs");

const catalogue = new Map(rngs.map((rng) => [rng.id, rng]));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("View global Fortuna RNG statistics.")
        .addUserOption((option) =>
            option.setName("user").setDescription("Player to inspect")
        ),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const player = ensurePlayer(target.id);
        const db = getDatabase();

        const collection = db.prepare(`
            SELECT COUNT(*) AS unique_count, COALESCE(SUM(quantity), 0) AS total_items
            FROM rng_inventory WHERE user_id = ?
        `).get(target.id);

        const rarest = db.prepare(`
            SELECT rng_id, result_name, odds
            FROM roll_history
            WHERE user_id = ?
            ORDER BY LENGTH(odds) DESC, odds DESC
            LIMIT 1
        `).get(target.id);

        const rarestRng = rarest ? catalogue.get(rarest.rng_id) : null;
        const embed = baseEmbed(`${target.username}'s statistics`, "All values are shared across every server.")
            .addFields(
                { name: "Total rolls", value: formatNumber(player.total_rolls), inline: true },
                { name: "Coins", value: formatNumber(player.coins), inline: true },
                { name: "Daily streak", value: formatNumber(player.daily_streak), inline: true },
                { name: "Unique discoveries", value: formatNumber(collection.unique_count), inline: true },
                { name: "Total items", value: formatNumber(collection.total_items), inline: true },
                { name: "Rarest recorded", value: rarest ? `${rarestRng?.name || rarest.result_name}\n1 in ${BigInt(rarest.odds).toLocaleString("en-US")}` : "No rolls yet", inline: false }
            );

        await interaction.reply({
            embeds: [embed],
            flags: target.id === interaction.user.id ? MessageFlags.Ephemeral : undefined
        });
    }
};
