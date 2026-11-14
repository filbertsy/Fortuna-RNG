const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");
const { getDatabase } = require("../../database/database");
const { baseEmbed } = require("../../utils/game");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("server-settings")
        .setDescription("Configure Fortuna RNG features for this server.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub.setName("channel")
                .setDescription("Set the rare-roll announcement channel")
                .addChannelOption((option) =>
                    option.setName("channel")
                        .setDescription("Text channel for rare discoveries")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("threshold")
                .setDescription("Set the minimum rarity announced (one in X)")
                .addIntegerOption((option) =>
                    option.setName("odds")
                        .setDescription("Minimum one-in-X odds")
                        .setMinValue(2)
                        .setMaxValue(1000000000000000)
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub.setName("ping")
                .setDescription("Enable or disable @everyone on rare announcements")
                .addBooleanOption((option) =>
                    option.setName("enabled")
                        .setDescription("Whether rare announcements ping everyone")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
        }

        const db = getDatabase();
        const subcommand = interaction.options.getSubcommand();
        db.prepare("INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)").run(interaction.guildId);

        if (subcommand === "channel") {
            const channel = interaction.options.getChannel("channel", true);
            db.prepare("UPDATE guild_settings SET announce_channel_id = ?, updated_at = ? WHERE guild_id = ?")
                .run(channel.id, Date.now(), interaction.guildId);
            return interaction.reply({
                embeds: [baseEmbed("Announcement channel updated", `Rare discoveries will be announced in ${channel}.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === "threshold") {
            const odds = interaction.options.getInteger("odds", true);
            db.prepare("UPDATE guild_settings SET announce_threshold = ?, updated_at = ? WHERE guild_id = ?")
                .run(String(odds), Date.now(), interaction.guildId);
            return interaction.reply({
                embeds: [baseEmbed("Announcement threshold updated", `Discoveries of **1 in ${odds.toLocaleString("en-US")}** or rarer will be announced.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (subcommand === "ping") {
            const enabled = interaction.options.getBoolean("enabled", true);
            db.prepare("UPDATE guild_settings SET ping_everyone = ?, updated_at = ? WHERE guild_id = ?")
                .run(enabled ? 1 : 0, Date.now(), interaction.guildId);
            return interaction.reply({
                embeds: [baseEmbed("Announcement ping updated", `@everyone pings are now **${enabled ? "enabled" : "disabled"}**.`)],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
