const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed, formatDuration } = require("../../utils/game");
const { POTIONS } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("use")
        .setDescription("Activate a potion from your inventory.")
        .addStringOption((option) => {
            option.setName("potion").setDescription("Potion to activate").setRequired(true);
            for (const potion of POTIONS) option.addChoices({ name: potion.name, value: potion.id });
            return option;
        }),

    async execute(interaction) {
        const potionId = interaction.options.getString("potion", true);
        const potion = POTIONS.find((entry) => entry.id === potionId);
        const db = getDatabase();
        const userId = interaction.user.id;
        ensurePlayer(userId);
        const now = Date.now();

        try {
            const activate = db.transaction(() => {
                db.prepare("DELETE FROM active_potions WHERE expires_at <= ?").run(now);
                const activeCount = db.prepare("SELECT COUNT(*) AS count FROM active_potions WHERE user_id = ?").get(userId).count;
                if (activeCount >= 5) throw new Error("You can have at most five active potion stacks.");

                const owned = db.prepare("SELECT quantity FROM player_potions WHERE user_id = ? AND potion_id = ?").get(userId, potionId);
                if (!owned || owned.quantity < 1) throw new Error("You do not have that potion.");

                db.prepare("UPDATE player_potions SET quantity = quantity - 1 WHERE user_id = ? AND potion_id = ?").run(userId, potionId);
                db.prepare("DELETE FROM player_potions WHERE user_id = ? AND potion_id = ? AND quantity <= 0").run(userId, potionId);
                const selectedGuild = db.prepare(
                    "SELECT selected_guild_id FROM players WHERE user_id = ?"
                ).get(userId)?.selected_guild_id ?? null;

                db.prepare(`
                    INSERT INTO active_potions (user_id, potion_id, source_guild_id, expires_at)
                    VALUES (?, ?, ?, ?)
                `).run(userId, potionId, selectedGuild, now + potion.durationMs);
            });
            activate();

            await interaction.reply({
                embeds: [baseEmbed("Potion activated", `**${potion.name}** is active for ${formatDuration(potion.durationMs)}.\nLuck multiplier: **${potion.multiplier.toFixed(2)}×**`)],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
        }
    }
};
