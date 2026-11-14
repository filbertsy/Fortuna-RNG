const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed } = require("../../utils/game");
const { TOOLS } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unequip")
        .setDescription("Unequip one of your permanent luck tools.")
        .addStringOption((option) => {
            option.setName("tool").setDescription("Tool ID").setRequired(true);
            for (const tool of TOOLS) option.addChoices({ name: tool.name, value: tool.id });
            return option;
        }),

    async execute(interaction) {
        const toolId = interaction.options.getString("tool", true);
        const db = getDatabase();
        const userId = interaction.user.id;
        ensurePlayer(userId);

        const owned = db.prepare("SELECT equipped FROM player_tools WHERE user_id = ? AND tool_id = ?").get(userId, toolId);
        if (!owned) {
            return interaction.reply({ content: "You do not own that tool.", flags: MessageFlags.Ephemeral });
        }
        if (!owned.equipped) {
            return interaction.reply({ content: "That tool is not equipped.", flags: MessageFlags.Ephemeral });
        }

        db.prepare("UPDATE player_tools SET equipped = 0 WHERE user_id = ? AND tool_id = ?").run(userId, toolId);
        await interaction.reply({
            embeds: [baseEmbed("Tool unequipped", "Your loadout has been updated.")],
            flags: MessageFlags.Ephemeral
        });
    }
};
