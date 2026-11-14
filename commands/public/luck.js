const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getLuck } = require("../../utils/luck");
const { baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("luck")
        .setDescription("Inspect your currently active luck multiplier."),

    async execute(interaction) {
        const result = getLuck(interaction.user.id);
        const embed = baseEmbed("Your active luck", `**${result.multiplier.toFixed(2)}×** total luck multiplier.\n\nLuck bonuses stack additively: each bonus adds its amount above 1×.`)
            .addFields(
                { name: "Equipped tools", value: String(result.equippedCount), inline: true },
                { name: "Active potions", value: String(result.activePotionCount), inline: true },
                { name: "Loadout scope", value: result.guildId ? "Selected server loadout" : "Global base loadout", inline: true }
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
