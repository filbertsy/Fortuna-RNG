const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const rngs = require("../../data/rngs");

const catalogue = new Map(rngs.map((rng) => [rng.id, rng]));
const PAGE_SIZE = 12;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("View your globally shared RNG collection.")
        .addIntegerOption((option) =>
            option.setName("page")
                .setDescription("Collection page")
                .setMinValue(1)
                .setMaxValue(1000)
        )
        .addUserOption((option) =>
            option.setName("user")
                .setDescription("View another player's public collection")
        ),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const page = interaction.options.getInteger("page") || 1;
        ensurePlayer(target.id);

        const db = getDatabase();
        const rows = db.prepare(`
            SELECT rng_id, quantity
            FROM rng_inventory
            WHERE user_id = ?
            ORDER BY quantity DESC, rng_id ASC
        `).all(target.id);

        const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
        if (page > totalPages) {
            return interaction.reply({
                content: `That page does not exist. This collection has ${totalPages} page(s).`,
                flags: MessageFlags.Ephemeral
            });
        }

        const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
        const description = visible.length
            ? visible.map((row, index) => {
                const rng = catalogue.get(row.rng_id);
                const name = rng?.name || row.rng_id;
                const rarity = rng?.rarity || "Unknown";
                return `**${(page - 1) * PAGE_SIZE + index + 1}. ${name}** — ${rarity} · ×${formatNumber(row.quantity)}`;
            }).join("\n")
            : "No discoveries yet. Use `/roll` to begin your collection.";

        const embed = baseEmbed(`${target.username}'s collection`, description)
            .addFields(
                { name: "Unique RNGs", value: `${formatNumber(rows.length)}/300`, inline: true },
                { name: "Page", value: `${page}/${totalPages}`, inline: true }
            );

        await interaction.reply({
            embeds: [embed],
            flags: target.id === interaction.user.id ? MessageFlags.Ephemeral : undefined
        });
    }
};
