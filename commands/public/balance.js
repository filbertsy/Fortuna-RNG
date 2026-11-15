const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const { getDatabase } = require("../../database/database");

module.exports = {
    data: new SlashCommandBuilder().setName("balance").setDescription("View your global Fortuna coin balance."),
    async execute(interaction) {
        ensurePlayer(interaction.user.id);
        const player = getDatabase().prepare("SELECT coins, daily_streak FROM players WHERE user_id = ?").get(interaction.user.id);
        const embed = baseEmbed("Your Fortuna balance", "Your coins are shared across every server.")
            .addFields(
                { name: "🪙 COINS", value: "**" + formatNumber(player.coins) + "**", inline: true },
                { name: "🔥 DAILY STREAK", value: "**" + formatNumber(player.daily_streak) + "**", inline: true }
            );
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};