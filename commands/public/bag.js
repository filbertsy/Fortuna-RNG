const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const { TOOLS, POTIONS } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bag")
        .setDescription("View your owned tools and potion stock."),

    async execute(interaction) {
        ensurePlayer(interaction.user.id);
        const db = getDatabase();
        const tools = db.prepare("SELECT tool_id, equipped FROM player_tools WHERE user_id = ? ORDER BY tool_id").all(interaction.user.id);
        const potions = db.prepare("SELECT potion_id, quantity FROM player_potions WHERE user_id = ? AND quantity > 0 ORDER BY potion_id").all(interaction.user.id);
        const now = Date.now();
        const active = db.prepare("SELECT potion_id, expires_at FROM active_potions WHERE user_id = ? AND expires_at > ? ORDER BY expires_at").all(interaction.user.id, now);

        const toolText = tools.length
            ? tools.map((row) => {
                const item = TOOLS.find((entry) => entry.id === row.tool_id);
                return `${row.equipped ? "🟡" : "⚪"} **${item?.name || row.tool_id}** · ${item?.multiplier.toFixed(2) || "?"}×`;
            }).join("\n")
            : "No permanent tools owned.";

        const potionText = potions.length
            ? potions.map((row) => {
                const item = POTIONS.find((entry) => entry.id === row.potion_id);
                return `**${item?.name || row.potion_id}** ×${formatNumber(row.quantity)}`;
            }).join("\n")
            : "No potions in storage.";

        const activeText = active.length
            ? active.map((row) => {
                const item = POTIONS.find((entry) => entry.id === row.potion_id);
                return `**${item?.name || row.potion_id}** · <t:${Math.floor(row.expires_at / 1000)}:R>`;
            }).join("\n")
            : "No active potions.";

        const embed = baseEmbed("Your item bag", "Tools and potion stock are shared globally. Active potions follow your selected loadout server.")
            .addFields(
                { name: `Permanent tools · ${tools.length}/64`, value: toolText, inline: false },
                { name: `Potion storage · ${potions.reduce((sum, row) => sum + row.quantity, 0)}/100`, value: potionText, inline: false },
                { name: `Active potion stacks · ${active.length}/5`, value: activeText, inline: false }
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
