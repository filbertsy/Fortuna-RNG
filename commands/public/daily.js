const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, formatDuration, baseEmbed } = require("../../utils/game");

const DAY = 24 * 60 * 60 * 1000;
const STREAK_WINDOW = 48 * 60 * 60 * 1000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your global daily coin reward."),

    async execute(interaction) {
        const db = getDatabase();
        const now = Date.now();
        const userId = interaction.user.id;
        const player = ensurePlayer(userId);

        if (player.last_daily_at && now - player.last_daily_at < DAY) {
            const remaining = DAY - (now - player.last_daily_at);
            const embed = baseEmbed("Daily already claimed", `Your next reward is available in **${formatDuration(remaining)}**.`);
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const streak = player.last_daily_at && now - player.last_daily_at <= STREAK_WINDOW
            ? player.daily_streak + 1
            : 1;
        const reward = Math.min(500 + (streak - 1) * 50, 1500);

        const claim = db.transaction(() => {
            db.prepare(`
                UPDATE players
                SET coins = coins + ?, daily_streak = ?, last_daily_at = ?
                WHERE user_id = ?
            `).run(reward, streak, now, userId);
        });
        claim();

        const embed = baseEmbed("Daily reward claimed", "Your fortune has paid out.")
            .addFields(
                { name: "Coins", value: `+**${formatNumber(reward)}**`, inline: true },
                { name: "Streak", value: `**${formatNumber(streak)}** day(s)`, inline: true },
                { name: "Balance", value: `**${formatNumber(player.coins + reward)}**`, inline: true }
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
