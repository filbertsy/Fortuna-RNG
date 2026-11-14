const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Browse Fortuna RNG commands."),

    async execute(interaction) {
        const embed = baseEmbed("Fortuna RNG · Command guide", "Your account and collection are global. Your progress follows you between servers.")
            .addFields(
                { name: "Fortune", value: "`/roll` — roll for a discovery\n`/inventory` — view your collection\n`/stats` — inspect your statistics\n`/profile` — view a player profile", inline: false },
                { name: "Progression", value: "`/daily` — claim coins\n`/leaderboard` — global rankings", inline: false },
                { name: "Coming online as systems are added", value: "Shop, equipment, potions, achievements, favorites, server announcements, and administration.", inline: false }
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
