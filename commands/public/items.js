const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { getDatabase } = require("../../database/database");
const { ALL_ITEMS } = require("../../data/shop");
const PAGE_SIZE = 10;
const PREFIX = "fortuna:items:";
function ownedItems(userId) {
    const db = getDatabase();
    const tools = db.prepare("SELECT tool_id AS id, equipped, 1 AS quantity FROM player_tools WHERE user_id = ?").all(userId);
    const potions = db.prepare("SELECT potion_id AS id, 0 AS equipped, quantity FROM player_potions WHERE user_id = ? AND quantity > 0").all(userId);
    return [...tools, ...potions].map((row) => {
        const item = ALL_ITEMS.find((entry) => entry.id === row.id);
        return item ? { ...item, quantity: row.quantity, equipped: Boolean(row.equipped) } : null;
    }).filter(Boolean).sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
function makeEmbed(user, items, page) {
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const visible = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const lines = visible.map((item) => {
        const state = item.category === "tool" ? (item.equipped ? " · **EQUIPPED**" : " · Not equipped") : " · Quantity: **" + item.quantity + "**";
        const type = item.category === "tool" ? "🛠️ Tool" : "🧪 Potion";
        const duration = item.durationMs ? " · " + Math.round(item.durationMs / 60000) + " min" : "";
        return "**" + item.name + "**" + state + "\n" + type + " · " + item.rarity + " · " + item.multiplier.toFixed(2) + "× luck" + duration + "\nID: \u0060" + item.id + "\u0060";
    });
    return new EmbedBuilder().setColor(0xD6B66C).setAuthor({ name: "FORTUNA RNG  •  ITEM INVENTORY" })
        .setTitle("✦ " + user.username + "'s Items").setDescription(lines.join("\n\n") || "You do not own any tools or potions yet. Browse /shop.")
        .addFields({ name: "OWNED ITEMS", value: "\u0060" + items.length + "\u0060", inline: true },
            { name: "PAGE", value: "\u0060" + (page + 1) + " / " + pages + "\u0060", inline: true })
        .setFooter({ text: "Use /equip for tools • Use /use for potions" });
}
function makeButtons(page, pages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(PREFIX + "prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
        new ButtonBuilder().setCustomId(PREFIX + "next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(page >= pages - 1)
    );
}
module.exports = {
    data: new SlashCommandBuilder().setName("items").setDescription("View your global tools and potion inventory."),
    async execute(interaction) {
        const items = ownedItems(interaction.user.id);
        const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        let page = 0;
        await interaction.reply({ embeds: [makeEmbed(interaction.user, items, page)], components: [makeButtons(page, pages)], flags: MessageFlags.Ephemeral });
        const reply = await interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({ time: 900000, filter: (b) => b.customId.startsWith(PREFIX) && b.user.id === interaction.user.id });
        collector.on("collect", async (button) => {
            page += button.customId === PREFIX + "next" ? 1 : -1;
            page = Math.max(0, Math.min(page, pages - 1));
            await button.update({ embeds: [makeEmbed(interaction.user, items, page)], components: [makeButtons(page, pages)] });
        });
        collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
    }
};