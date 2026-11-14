const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { TOOLS, POTIONS } = require("../../data/shop");
const { baseEmbed, formatNumber } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription("Browse permanent tools and temporary potions.")
        .addStringOption((option) =>
            option.setName("category")
                .setDescription("Items to browse")
                .addChoices(
                    { name: "All items", value: "all" },
                    { name: "Permanent tools", value: "tools" },
                    { name: "Potions", value: "potions" }
                )
        ),

    async execute(interaction) {
        const category = interaction.options.getString("category") || "all";
        const sections = [];

        if (category === "all" || category === "tools") {
            sections.push({
                name: "Permanent tools",
                value: TOOLS.map((item) =>
                    `**${item.name}** · ${item.multiplier.toFixed(2)}× luck\n` +
                    `ID: \`${item.id}\` · ${formatNumber(item.price)} coins\n${item.description}`
                ).join("\n\n")
            });
        }

        if (category === "all" || category === "potions") {
            sections.push({
                name: "Potions",
                value: POTIONS.map((item) =>
                    `**${item.name}** · ${item.multiplier.toFixed(2)}× luck · ${Math.round(item.durationMs / 60000)} min\n` +
                    `ID: \`${item.id}\` · ${formatNumber(item.price)} coins\n${item.description}`
                ).join("\n\n")
            });
        }

        const embed = baseEmbed("Fortuna shop", "Use `/buy item:<id>` to purchase an item.")
            .addFields(sections);
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
