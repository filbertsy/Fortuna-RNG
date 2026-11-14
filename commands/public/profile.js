const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("profile")
        .setDescription("View a global Fortuna RNG player profile.")
        .addUserOption((option) =>
            option.setName("user").setDescription("Player to inspect")
        ),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const player = ensurePlayer(target.id);
        const db = getDatabase();
        const unique = db.prepare("SELECT COUNT(*) AS count FROM rng_inventory WHERE user_id = ?").get(target.id).count;
        const joined = Math.floor(player.created_at / 1000);

        const embed = baseEmbed(`${target.username}`, "Fortuna RNG global profile.")
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "Coins", value: formatNumber(player.coins), inline: true },
                { name: "Total rolls", value: formatNumber(player.total_rolls), inline: true },
                { name: "Unique RNGs", value: formatNumber(unique), inline: true },
                { name: "Daily streak", value: formatNumber(player.daily_streak), inline: true },
                { name: "Account created", value: `<t:${joined}:D>`, inline: true }
            );

        await interaction.reply({
            embeds: [embed],
            flags: target.id === interaction.user.id ? MessageFlags.Ephemeral : undefined
        });
    }
};
