const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { baseEmbed } = require("../../utils/game");
const rngs = require("../../data/rngs");

const catalogue = new Map(rngs.map((entry) => [entry.id, entry]));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rng")
        .setDescription("Inspect an RNG from the global catalogue.")
        .addStringOption((option) =>
            option.setName("rng_id")
                .setDescription("Catalogue ID, such as fortune_0001 or fortuna")
                .setRequired(true)
        ),

    async execute(interaction) {
        const id = interaction.options.getString("rng_id", true).trim();
        const entry = catalogue.get(id);
        if (!entry) {
            return interaction.reply({ content: "That RNG ID was not found.", flags: MessageFlags.Ephemeral });
        }

        const embed = baseEmbed(entry.name, entry.description)
            .setColor(entry.color)
            .addFields(
                { name: "Rarity", value: entry.rarity, inline: true },
                { name: "Odds", value: `1 in ${BigInt(entry.odds).toLocaleString("en-US")}`, inline: true },
                { name: "Catalogue ID", value: `\`${entry.id}\``, inline: true }
            );
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
