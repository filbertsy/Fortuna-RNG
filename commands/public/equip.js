const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed } = require("../../utils/game");
const { getItem } = require("../../data/shop");
const { autocompleteItems } = require("../../utils/shop");
module.exports = {
    data: new SlashCommandBuilder().setName("equip").setDescription("Equip one of your permanent luck tools.")
        .addStringOption((o) => o.setName("tool").setDescription("Choose an owned tool").setRequired(true).setAutocomplete(true)),
    async autocomplete(interaction) { await interaction.respond(autocompleteItems(interaction, "tool")); },
    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "Equip tools inside a server so your active server loadout is clear.", flags: MessageFlags.Ephemeral });
        const id = interaction.options.getString("tool", true);
        const tool = getItem(id);
        if (!tool || tool.category !== "tool") return interaction.reply({ content: "That is not a valid tool.", flags: MessageFlags.Ephemeral });
        const db = getDatabase();
        ensurePlayer(interaction.user.id);
        try {
            db.transaction(() => {
                const owned = db.prepare("SELECT equipped FROM player_tools WHERE user_id = ? AND tool_id = ?").get(interaction.user.id, id);
                if (!owned) throw new Error("You do not own that tool.");
                if (owned.equipped) throw new Error("That tool is already equipped.");
                const count = db.prepare("SELECT COUNT(*) AS count FROM player_tools WHERE user_id = ? AND equipped = 1").get(interaction.user.id).count;
                if (count >= 2) throw new Error("You can equip only two different permanent tools.");
                db.prepare("UPDATE player_tools SET equipped = 1 WHERE user_id = ? AND tool_id = ?").run(interaction.user.id, id);
                db.prepare("UPDATE players SET selected_guild_id = ? WHERE user_id = ?").run(interaction.guildId, interaction.user.id);
            })();
            await interaction.reply({ embeds: [baseEmbed("Tool equipped", "**" + tool.name + "** is now equipped.\nLuck multiplier: **" + tool.multiplier.toFixed(2) + "×**")], flags: MessageFlags.Ephemeral });
        } catch (error) { await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral }); }
    }
};