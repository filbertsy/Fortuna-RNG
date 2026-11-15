const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed, formatDuration } = require("../../utils/game");
const { getItem } = require("../../data/shop");
const { autocompleteItems } = require("../../utils/shop");
module.exports = {
    data: new SlashCommandBuilder().setName("use").setDescription("Activate a potion from your inventory.")
        .addStringOption((o) => o.setName("potion").setDescription("Choose an owned potion").setRequired(true).setAutocomplete(true)),
    async autocomplete(interaction) { await interaction.respond(autocompleteItems(interaction, "potion")); },
    async execute(interaction) {
        const id = interaction.options.getString("potion", true);
        const potion = getItem(id);
        if (!potion || potion.category !== "potion") return interaction.reply({ content: "That is not a valid potion.", flags: MessageFlags.Ephemeral });
        const db = getDatabase();
        ensurePlayer(interaction.user.id);
        const now = Date.now();
        try {
            db.transaction(() => {
                db.prepare("DELETE FROM active_potions WHERE expires_at <= ?").run(now);
                const active = db.prepare("SELECT COUNT(*) AS count FROM active_potions WHERE user_id = ?").get(interaction.user.id).count;
                if (active >= 5) throw new Error("You can have at most five active potion stacks.");
                const owned = db.prepare("SELECT quantity FROM player_potions WHERE user_id = ? AND potion_id = ?").get(interaction.user.id, id);
                if (!owned || owned.quantity < 1) throw new Error("You do not have that potion.");
                db.prepare("UPDATE player_potions SET quantity = quantity - 1 WHERE user_id = ? AND potion_id = ?").run(interaction.user.id, id);
                db.prepare("DELETE FROM player_potions WHERE user_id = ? AND potion_id = ? AND quantity <= 0").run(interaction.user.id, id);
                const guild = db.prepare("SELECT selected_guild_id FROM players WHERE user_id = ?").get(interaction.user.id)?.selected_guild_id ?? null;
                db.prepare("INSERT INTO active_potions (user_id, potion_id, source_guild_id, expires_at) VALUES (?, ?, ?, ?)").run(interaction.user.id, id, guild, now + potion.durationMs);
            })();
            await interaction.reply({ embeds: [baseEmbed("Potion activated", "**" + potion.name + "** is active for " + formatDuration(potion.durationMs) + ".\nLuck multiplier: **" + potion.multiplier.toFixed(2) + "×**")], flags: MessageFlags.Ephemeral });
        } catch (error) { await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral }); }
    }
};