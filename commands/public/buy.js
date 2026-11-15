const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const { ALL_ITEMS, getItem } = require("../../data/shop");
const { ensureGuildShop, isRotating } = require("../../utils/shop");

module.exports = {
    data: new SlashCommandBuilder().setName("buy").setDescription("Purchase a tool or potion with global coins.")
        .addStringOption((o) => o.setName("item").setDescription("Search for an item").setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName("quantity").setDescription("Potion quantity").setMinValue(1).setMaxValue(100)),
    async autocomplete(interaction) {
        const q = interaction.options.getFocused().trim().toLowerCase();
        const available = interaction.inGuild()
            ? new Set([...ALL_ITEMS.filter((i) => i.rarity === "Legendary").map((i) => i.id),
                ...ensureGuildShop(interaction.guildId).items.map((i) => i.id)])
            : new Set(ALL_ITEMS.filter((i) => i.rarity === "Legendary").map((i) => i.id));
        await interaction.respond(ALL_ITEMS.filter((i) => available.has(i.id) && (i.name + " " + i.id).toLowerCase().includes(q)).slice(0, 25)
            .map((i) => ({ name: i.name + " · " + i.rarity + " · " + formatNumber(i.price), value: i.id })));
    },
    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "Purchases must be made inside a server.", flags: MessageFlags.Ephemeral });
        const item = getItem(interaction.options.getString("item", true));
        if (!item) return interaction.reply({ content: "Unknown item. Browse /shop and select a valid item.", flags: MessageFlags.Ephemeral });
        const quantity = item.category === "tool" ? 1 : (interaction.options.getInteger("quantity") || 1);
        const total = item.price * quantity;
        if (!Number.isSafeInteger(total)) return interaction.reply({ content: "Purchase total is too large.", flags: MessageFlags.Ephemeral });
        ensureGuildShop(interaction.guildId);
        const db = getDatabase();
        const userId = interaction.user.id;
        ensurePlayer(userId);
        try {
            const result = db.transaction(() => {
                const player = db.prepare("SELECT coins FROM players WHERE user_id = ?").get(userId);
                if (item.category === "tool") {
                    if (db.prepare("SELECT 1 FROM player_tools WHERE user_id = ? AND tool_id = ?").get(userId, item.id)) throw new Error("You already own this permanent tool.");
                    if (db.prepare("SELECT COUNT(*) AS count FROM player_tools WHERE user_id = ?").get(userId).count >= 64) throw new Error("Your tool storage is full (64 tools).");
                } else {
                    const owned = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS count FROM player_potions WHERE user_id = ?").get(userId).count;
                    if (owned + quantity > 100) throw new Error("Your potion storage limit is 100.");
                }
                if (player.coins < total) throw new Error("You do not have enough coins.");
                let stock = null;
                if (isRotating(item)) {
                    stock = db.prepare("SELECT stock FROM guild_shop_stock WHERE guild_id = ? AND item_id = ? AND category = ?").get(interaction.guildId, item.id, item.category);
                    if (!stock || stock.stock < quantity) throw new Error("That item is not in this server's current stock, or there is not enough remaining.");
                }
                db.prepare("UPDATE players SET coins = coins - ? WHERE user_id = ?").run(total, userId);
                if (item.category === "tool") {
                    db.prepare("INSERT INTO player_tools (user_id, tool_id, quantity, equipped) VALUES (?, ?, 1, 0)").run(userId, item.id);
                } else {
                    db.prepare("INSERT INTO player_potions (user_id, potion_id, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, potion_id) DO UPDATE SET quantity = quantity + excluded.quantity").run(userId, item.id, quantity);
                }
                if (stock) {
                    const changed = db.prepare("UPDATE guild_shop_stock SET stock = stock - ? WHERE guild_id = ? AND item_id = ? AND category = ? AND stock >= ?").run(quantity, interaction.guildId, item.id, item.category, quantity);
                    if (changed.changes !== 1) throw new Error("Stock changed before purchase completed. Try again.");
                }
                db.prepare("INSERT INTO shop_purchases (user_id, guild_id, item_id, category, quantity, price_paid) VALUES (?, ?, ?, ?, ?, ?)").run(userId, interaction.guildId, item.id, item.category, quantity, total);
                return { balance: player.coins - total };
            })();
            await interaction.reply({ embeds: [baseEmbed("Purchase complete", "You purchased **" + quantity + "× " + item.name + "**.")
                .addFields(
                    { name: "Rarity", value: item.rarity, inline: true },
                    { name: "Paid", value: formatNumber(total) + " coins", inline: true },
                    { name: "Remaining", value: formatNumber(result.balance) + " coins", inline: true }
                )], flags: MessageFlags.Ephemeral });
        } catch (error) {
            await interaction.reply({ content: error.message || "Purchase failed.", flags: MessageFlags.Ephemeral });
        }
    }
};