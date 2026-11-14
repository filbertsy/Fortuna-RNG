const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed } = require("../../utils/game");
const { TOOLS } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("equip")
        .setDescription("Equip one of your permanent luck tools.")
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

        const result = db.transaction(() => {
            const owned = db.prepare("SELECT 1 FROM player_tools WHERE user_id = ? AND tool_id = ?").get(userId, toolId);
            if (!owned) throw new Error("You do not own that tool.");

            const current = db.prepare("SELECT equipped FROM player_tools WHERE user_id = ? AND tool_id = ?").get(userId, toolId);
            if (current.equipped) throw new Error("That tool is already equipped.");

            const count = db.prepare("SELECT COUNT(*) AS count FROM player_tools WHERE user_id = ? AND equipped = 1").get(userId).count;
            if (count >= 2) throw new Error("You can equip only two different permanent tools.");

            db.prepare("UPDATE player_tools SET equipped = 1 WHERE user_id = ? AND tool_id = ?").run(userId, toolId);
            db.prepare("UPDATE players SET selected_guild_id = ? WHERE user_id = ?").run(interaction.guildId, userId);
        });

        try {
            result();
            const tool = TOOLS.find((entry) => entry.id === toolId);
            await interaction.reply({
                embeds: [baseEmbed("Tool equipped", `**${tool.name}** is now part of your active loadout.`)],
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            await interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
        }
    }
};
