const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, baseEmbed } = require("../../utils/game");
const rngs = require("../../data/rngs");

const catalogue = new Map(rngs.map((entry) => [entry.id, entry]));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("favorite")
        .setDescription("Manage your favorite RNG discoveries.")
        .addSubcommand((sub) =>
            sub.setName("add")
                .setDescription("Favorite an RNG by its catalogue ID")
                .addStringOption((option) => option.setName("rng_id").setDescription("RNG ID").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("remove")
                .setDescription("Remove an RNG from your favorites")
                .addStringOption((option) => option.setName("rng_id").setDescription("RNG ID").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("list").setDescription("Show your favorite discoveries")
        ),

    async execute(interaction) {
        const db = getDatabase();
        const userId = interaction.user.id;
        ensurePlayer(userId);
        const action = interaction.options.getSubcommand();

        if (action === "list") {
            const rows = db.prepare("SELECT rng_id FROM player_favorites WHERE user_id = ? ORDER BY created_at DESC").all(userId);
            const text = rows.length
                ? rows.map((row) => `• ${catalogue.get(row.rng_id)?.name || row.rng_id}`).join("\n")
                : "You have no favorites yet.";
            return interaction.reply({
                embeds: [baseEmbed("Your favorites", text)],
                flags: MessageFlags.Ephemeral
            });
        }

        const rngId = interaction.options.getString("rng_id", true).trim();
        const rng = catalogue.get(rngId);
        if (!rng) {
            return interaction.reply({ content: "Unknown RNG ID. Check the catalogue data for a valid ID.", flags: MessageFlags.Ephemeral });
        }

        if (action === "add") {
            const owned = db.prepare("SELECT 1 FROM rng_inventory WHERE user_id = ? AND rng_id = ?").get(userId, rngId);
            if (!owned) {
                return interaction.reply({ content: "You can only favorite RNGs you have discovered.", flags: MessageFlags.Ephemeral });
            }
            db.prepare("INSERT OR IGNORE INTO player_favorites (user_id, rng_id) VALUES (?, ?)").run(userId, rngId);
            return interaction.reply({
                embeds: [baseEmbed("Favorite saved", `**${rng.name}** is now one of your favorites.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        db.prepare("DELETE FROM player_favorites WHERE user_id = ? AND rng_id = ?").run(userId, rngId);
        await interaction.reply({
            embeds: [baseEmbed("Favorite removed", `**${rng.name}** was removed from your favorites.`)],
            flags: MessageFlags.Ephemeral
        });
    }
};
