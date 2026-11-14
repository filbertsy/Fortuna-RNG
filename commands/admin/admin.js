const {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags
} = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed, isAdmin, isOwner } = require("../../utils/game");
const { getItem } = require("../../data/shop");
const rngs = require("../../data/rngs");

const catalogue = new Map(rngs.map((entry) => [entry.id, entry]));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Fortuna RNG global administration.")
        .addSubcommand((sub) =>
            sub.setName("add-admin")
                .setDescription("Add a global Fortuna administrator (owner only).")
                .addUserOption((option) => option.setName("user").setDescription("Account to authorize").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("remove-admin")
                .setDescription("Remove a global Fortuna administrator (owner only).")
                .addUserOption((option) => option.setName("user").setDescription("Account to revoke").setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("list-admins")
                .setDescription("List global Fortuna administrators.")
        )
        .addSubcommand((sub) =>
            sub.setName("grant-coins")
                .setDescription("Grant global coins to a player.")
                .addUserOption((option) => option.setName("user").setDescription("Player").setRequired(true))
                .addIntegerOption((option) => option.setName("amount").setDescription("Coins to grant").setMinValue(1).setMaxValue(1000000000).setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("give-rng")
                .setDescription("Grant an RNG discovery to a player.")
                .addUserOption((option) => option.setName("user").setDescription("Player").setRequired(true))
                .addStringOption((option) => option.setName("rng_id").setDescription("Catalogue ID").setRequired(true))
                .addIntegerOption((option) => option.setName("quantity").setDescription("Quantity").setMinValue(1).setMaxValue(1000000))
        )
        .addSubcommand((sub) =>
            sub.setName("set-stock")
                .setDescription("Set this server's shop stock. Use -1 for unlimited.")
                .addStringOption((option) => option.setName("item_id").setDescription("Shop item ID").setRequired(true))
                .addIntegerOption((option) => option.setName("stock").setDescription("Stock amount").setMinValue(-1).setMaxValue(1000000).setRequired(true))
        )
        .addSubcommand((sub) =>
            sub.setName("announce")
                .setDescription("Send a Fortuna announcement to a channel.")
                .addChannelOption((option) => option.setName("channel").setDescription("Destination").addChannelTypes(ChannelType.GuildText).setRequired(true))
                .addStringOption((option) => option.setName("message").setDescription("Announcement text").setMaxLength(1800).setRequired(true))
        ),

    async execute(interaction) {
        const action = interaction.options.getSubcommand();
        const ownerOnly = ["add-admin", "remove-admin", "list-admins"].includes(action);
        if (ownerOnly ? !isOwner(interaction.user.id) : !isAdmin(interaction.user.id)) {
            return interaction.reply({
                content: ownerOnly ? "Only the configured bot owner can change the admin whitelist." : "You are not authorized to use Fortuna administration.",
                flags: MessageFlags.Ephemeral
            });
        }

        const db = getDatabase();

        if (action === "add-admin") {
            const target = interaction.options.getUser("user", true);
            if (target.bot) {
                return interaction.reply({ content: "Bot accounts cannot be added as administrators.", flags: MessageFlags.Ephemeral });
            }
            db.prepare("INSERT OR IGNORE INTO bot_admins (user_id, added_by) VALUES (?, ?)").run(target.id, interaction.user.id);
            return interaction.reply({
                embeds: [baseEmbed("Administrator authorized", `${target.tag} can now use global Fortuna administration.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "remove-admin") {
            const target = interaction.options.getUser("user", true);
            db.prepare("DELETE FROM bot_admins WHERE user_id = ?").run(target.id);
            return interaction.reply({
                embeds: [baseEmbed("Administrator access revoked", `Global admin access was removed from ${target.tag}.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "list-admins") {
            const rows = db.prepare("SELECT user_id FROM bot_admins ORDER BY added_at ASC").all();
            const lines = rows.length ? rows.map((row) => `• <@${row.user_id}>`).join("\n") : "No additional administrators are configured.";
            return interaction.reply({
                embeds: [baseEmbed("Global administrators", `**Owner:** <@${process.env.OWNER_ID || "0"}>\n${lines}`)],
                allowedMentions: { parse: [] },
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "grant-coins") {
            const target = interaction.options.getUser("user", true);
            const amount = interaction.options.getInteger("amount", true);
            ensurePlayer(target.id);
            db.prepare("UPDATE players SET coins = coins + ? WHERE user_id = ?").run(amount, target.id);
            const balance = db.prepare("SELECT coins FROM players WHERE user_id = ?").get(target.id).coins;
            return interaction.reply({
                embeds: [baseEmbed("Coins granted", `Granted **${formatNumber(amount)}** coins to ${target.tag}.\nNew balance: **${formatNumber(balance)}**.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "give-rng") {
            const target = interaction.options.getUser("user", true);
            const rngId = interaction.options.getString("rng_id", true).trim();
            const quantity = interaction.options.getInteger("quantity") || 1;
            const rng = catalogue.get(rngId);
            if (!rng) {
                return interaction.reply({ content: "Unknown RNG ID.", flags: MessageFlags.Ephemeral });
            }

            ensurePlayer(target.id);
            db.prepare(`
                INSERT INTO rng_inventory (user_id, rng_id, quantity)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, rng_id) DO UPDATE SET quantity = quantity + excluded.quantity
            `).run(target.id, rngId, quantity);

            return interaction.reply({
                embeds: [baseEmbed("RNG granted", `Granted **${quantity}× ${rng.name}** to ${target.tag}.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "set-stock") {
            if (!interaction.guildId) {
                return interaction.reply({ content: "Shop stock can only be configured inside a server.", flags: MessageFlags.Ephemeral });
            }
            const itemId = interaction.options.getString("item_id", true).trim().toLowerCase();
            const stock = interaction.options.getInteger("stock", true);
            const item = getItem(itemId);
            if (!item) {
                return interaction.reply({ content: "Unknown shop item ID.", flags: MessageFlags.Ephemeral });
            }
            db.prepare(`
                INSERT INTO guild_shop_stock (guild_id, item_id, category, stock)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(guild_id, item_id, category) DO UPDATE SET stock = excluded.stock
            `).run(interaction.guildId, item.id, item.category, stock);
            return interaction.reply({
                embeds: [baseEmbed("Shop stock updated", `**${item.name}** stock is now ${stock === -1 ? "unlimited" : formatNumber(stock)} for this server.`)],
                flags: MessageFlags.Ephemeral
            });
        }

        if (action === "announce") {
            const channel = interaction.options.getChannel("channel", true);
            const message = interaction.options.getString("message", true);
            await channel.send({ content: message, allowedMentions: { parse: [] } });
            return interaction.reply({
                embeds: [baseEmbed("Announcement sent", `Your announcement was sent to ${channel}.`)],
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
