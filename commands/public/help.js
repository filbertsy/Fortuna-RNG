const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Browse Fortuna RNG commands."),

    async execute(interaction) {
        const embed = baseEmbed("Fortuna RNG · Command guide", "Your player account, coins, and RNG collection are global. Server announcement settings and shop stock are local to each server.")
            .addFields(
                { name: "Fortune", value: "`/roll` — roll for a discovery\n`/rng` — inspect a catalogue entry\n`/inventory` — browse your collection\n`/favorite` — manage favorites\n`/history` — recent rolls", inline: false },
                { name: "Player", value: "`/profile` — player profile\n`/stats` — global statistics\n`/leaderboard` — global rankings\n`/achievements` — progression milestones", inline: false },
                { name: "Economy", value: "`/daily` — claim coins\n`/shop` — browse tools and potions\n`/buy` — purchase an item\n`/bag` — view owned items\n`/equip` and `/unequip` — manage tools\n`/use` — activate a potion\n`/luck` — inspect active luck", inline: false },
                { name: "Server configuration", value: "`/server-settings channel` — rare announcement channel\n`/server-settings threshold` — rarity threshold\n`/server-settings ping` — @everyone setting", inline: false },
                { name: "Administration", value: "`/admin` — global owner/admin controls. The configured bot owner manages the global admin whitelist.", inline: false }
            );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};
