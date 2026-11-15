const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { baseEmbed } = require("../../utils/game");
const { ALL_ITEMS } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder().setName("unequip").setDescription("Remove one of your equipped tools.")
        .addStringOption((option) => option.setName("tool").setDescription("Choose an equipped tool").setRequired(true).setAutocomplete(true)),
    async autocomplete(interaction) {
        const q = interaction.options.getFocused().trim().toLowerCase();
        const rows = getDatabase().prepare("SELECT tool_id FROM player_tools WHERE user_id = ? AND equipped = 1").all(interaction.user.id);
        const equipped = new Set(rows.map((row) => row.tool_id));
        await interaction.respond(ALL_ITEMS.filter((item) => item.category === "tool" && equipped.has(item.id) &&
            (item.name + " " + item.id).toLowerCase().includes(q)).slice(0, 25)
            .map((item) => ({ name: item.name + " [" + item.rarity + "]", value: item.id })));
    },
    async execute(interaction) {
        const id = interaction.options.getString("tool", true);
        const item = ALL_ITEMS.find((entry) => entry.id === id && entry.category === "tool");
        if (!item) return interaction.reply({ content: "That is not a valid tool.", flags: MessageFlags.Ephemeral });
        const result = getDatabase().prepare("UPDATE player_tools SET equipped = 0 WHERE user_id = ? AND tool_id = ? AND equipped = 1")
            .run(interaction.user.id, id);
        if (!result.changes) return interaction.reply({ content: "That tool is not currently equipped.", flags: MessageFlags.Ephemeral });
        await interaction.reply({ embeds: [baseEmbed("Tool unequipped", "**" + item.name + "** is no longer active.")], flags: MessageFlags.Ephemeral });
    }
};