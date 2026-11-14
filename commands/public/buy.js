const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ensurePlayer, formatNumber, baseEmbed } = require("../../utils/game");
const { getItem } = require("../../data/shop");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Purchase a tool or potion with global coins.")
        .addStringOption((option) =>
            option.setName("item")
                .setDescription("Item ID from /shop")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option.setName("quantity")
                .setDescription("How many potions to buy")
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const item = getItem(interaction.options.getString("item", true).trim().toLowerCase());
        if (!item) {
            return interaction.reply({
                content: "That item ID does not exist. Check `/shop` for valid IDs.",
                flags: MessageFlags.Ephemeral
            });
        }

        const quantity = item.category === "tool" ? 1 : (interaction.options.getInteger("quantity") || 1);
        const db = getDatabase();
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        ensurePlayer(userId);

        try {
            const purchase = db.transaction(() => {
                const player = db.prepare("SELECT coins FROM players WHERE user_id = ?").get(userId);
                if (item.category === "tool") {
                    const owned = db.prepare("SELECT 1 FROM player_tools WHERE user_id = ? AND tool_id = ?").get(userId, item.id);
                    if (owned) throw new Error("You already own this permanent tool.");

                    const count = db.prepare("SELECT COUNT(*) AS count FROM player_tools WHERE user_id = ?").get(userId).count;
                    if (count >= 64) throw new Error("Your tool storage is full (64 tools).");
                } else {
                    const owned = db.prepare("SELECT quantity FROM player_potions WHERE user_id = ? AND potion_id = ?").get(userId, item.id);
                    const total = db.prepare("SELECT COALESCE(SUM(quantity), 0) AS count FROM player_potions WHERE user_id = ?").get(userId).count;
                    if (total + quantity > 100) throw new Error("Your potion storage limit is 100.");
                }

                const totalPrice = item.price * quantity;
                if (!Number.isSafeInteger(totalPrice)) throw new Error("Purchase total is too large.");
                if (player.coins < totalPrice) throw new Error("You do not have enough coins.");

                const stock = guildId
                    ? db.prepare("SELECT stock FROM guild_shop_stock WHERE guild_id = ? AND item_id = ? AND category = ?").get(guildId, item.id, item.category)
                    : null;
                if (stock && stock.stock >= 0 && stock.stock < quantity) {
                    throw new Error("This server's shop is out of stock.");
                }

                db.prepare("UPDATE players SET coins = coins - ? WHERE user_id = ?").run(totalPrice, userId);

                if (item.category === "tool") {
                    db.prepare("INSERT INTO player_tools (user_id, tool_id, quantity, equipped) VALUES (?, ?, 1, 0)").run(userId, item.id);
                } else {
                    db.prepare(`
                        INSERT INTO player_potions (user_id, potion_id, quantity)
                        VALUES (?, ?, ?)
                        ON CONFLICT(user_id, potion_id) DO UPDATE SET quantity = quantity + excluded.quantity
                    `).run(userId, item.id, quantity);
                }

                if (stock && stock.stock >= 0) {
                    db.prepare("UPDATE guild_shop_stock SET stock = stock - ? WHERE guild_id = ? AND item_id = ? AND category = ?")
                        .run(quantity, guildId, item.id, item.category);
                }

                db.prepare(`
                    INSERT INTO shop_purchases (user_id, guild_id, item_id, category, quantity, price_paid)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(userId, guildId, item.id, item.category, quantity, totalPrice);

                return { totalPrice, balance: player.coins - totalPrice };
            });

            const result = purchase();
            const embed = baseEmbed("Purchase complete", `You purchased **${quantity}× ${item.name}**.`)
                .addFields(
                    { name: "Paid", value: formatNumber(result.totalPrice), inline: true },
                    { name: "Remaining coins", value: formatNumber(result.balance), inline: true }
                );
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } catch (error) {
            await interaction.reply({
                content: error.message || "Purchase failed.",
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
