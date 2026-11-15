const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { ALL_ITEMS, RARITIES } = require("../../data/shop");
const { ensureGuildShop } = require("../../utils/shop");
const PAGE_SIZE = 8;
const PREFIX = "fortuna:shop:";
const GOLD = 0xD6B66C;
const fmt = (n) => Number(n || 0).toLocaleString("en-US");

function getItems(category, rarity, rotating) {
    const base = ALL_ITEMS.filter((item) => item.rarity === "Legendary")
        .map((item) => ({ ...item, stock: -1, rotating: false }));
    return [...base, ...rotating]
        .filter((item) => category === "all" || (category === "tools" && item.category === "tool") || (category === "potions" && item.category === "potion"))
        .filter((item) => rarity === "all" || item.rarity === RARITIES.find((entry) => entry.key === rarity)?.name)
        .sort((a, b) => RARITIES.findIndex((r) => r.name === a.rarity) - RARITIES.findIndex((r) => r.name === b.rarity) || a.name.localeCompare(b.name));
}
function makeEmbed(guild, items, category, rarity, page, expiresAt) {
    const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const lines = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((item) => {
        const stock = item.rotating ? (item.stock ? "Stock: **" + item.stock + "**" : "**SOLD OUT**") : "Unlimited stock";
        const kind = item.category === "tool" ? "🛠️ Tool" : "🧪 Potion";
        const duration = item.durationMs ? " · " + Math.round(item.durationMs / 60000) + " min" : "";
        return "**" + item.name + "**\n" + kind + " · " + item.rarity + " · **" + fmt(item.price) + " coins**\n" +
            item.multiplier.toFixed(2) + "× luck" + duration + " · " + stock + "\nID: \u0060" + item.id + "\u0060";
    });
    const left = Math.max(0, expiresAt - Date.now());
    return new EmbedBuilder().setColor(GOLD).setAuthor({ name: "FORTUNA RNG  •  SERVER SHOP" })
        .setTitle("✦ Fortuna's Shop").setDescription(lines.join("\n\n") || "No items in this category.")
        .addFields(
            { name: "CATEGORY", value: "\u0060" + category.toUpperCase() + "\u0060", inline: true },
            { name: "PAGE", value: "\u0060" + (page + 1) + " / " + pages + "\u0060", inline: true },
            { name: "NEXT ROTATION", value: "\u0060" + Math.floor(left / 3600000) + "h " + Math.floor((left % 3600000) / 60000) + "m\u0060", inline: true }
        ).setFooter({ text: guild.name + " • /buy item:<id> • Legendary is always available" });
}
function makeButtons(page, pages, category, rarity) {
    const rarityButtons = [{ key: "all", name: "All rarities" }, ...RARITIES.map(({ key, name }) => ({ key, name }))];
    const rarityRows = [
        new ActionRowBuilder().addComponents(...rarityButtons.slice(0, 5).map(({ key, name }) =>
            new ButtonBuilder().setCustomId(PREFIX + "rarity:" + key).setLabel(name)
                .setStyle(key === rarity ? ButtonStyle.Primary : ButtonStyle.Secondary))),
        new ActionRowBuilder().addComponents(...rarityButtons.slice(5).map(({ key, name }) =>
            new ButtonBuilder().setCustomId(PREFIX + "rarity:" + key).setLabel(name)
                .setStyle(key === rarity ? ButtonStyle.Primary : ButtonStyle.Secondary)))
    ];
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(PREFIX + "prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
            new ButtonBuilder().setCustomId(PREFIX + "next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(page >= pages - 1)
        ),
        new ActionRowBuilder().addComponents(...["all", "tools", "potions"].map((value) =>
            new ButtonBuilder().setCustomId(PREFIX + "category:" + value).setLabel(value[0].toUpperCase() + value.slice(1))
                .setStyle(value === category ? ButtonStyle.Primary : ButtonStyle.Secondary))),
        ...rarityRows
    ];
}
module.exports = {
    data: new SlashCommandBuilder().setName("shop").setDescription("Browse tools and potions in the rotating server shop.")
        .addStringOption((o) => o.setName("category").setDescription("Choose what to browse").addChoices(
            { name: "Everything", value: "all" }, { name: "Tools", value: "tools" }, { name: "Potions", value: "potions" })),
    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "The shop is only available inside a server.", flags: MessageFlags.Ephemeral });
        const rotation = ensureGuildShop(interaction.guildId);
        let category = interaction.options.getString("category") || "all";
        let rarity = "all";
        let items = getItems(category, rarity, rotation.items);
        let page = 0;
        let pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        await interaction.reply({ embeds: [makeEmbed(interaction.guild, items, category, page, rotation.expiresAt)], components: makeButtons(page, pages, category, rarity), flags: MessageFlags.Ephemeral });
        const reply = await interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({ time: 900000, filter: (b) => b.customId.startsWith(PREFIX) && b.user.id === interaction.user.id });
        collector.on("collect", async (button) => {
            const parts = button.customId.slice(PREFIX.length).split(":");
            if (parts[0] === "category") { category = parts[1]; page = 0; }
            else if (parts[0] === "rarity") { rarity = parts[1]; page = 0; }
            else page += parts[0] === "next" ? 1 : -1;
            const current = ensureGuildShop(interaction.guildId);
            items = getItems(category, rarity, current.items);
            pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
            page = Math.max(0, Math.min(page, pages - 1));
            await button.update({ embeds: [makeEmbed(interaction.guild, items, category, rarity, page, current.expiresAt)], components: makeButtons(page, pages, category, rarity) });
        });
        collector.on("end", () => interaction.editReply({ components: [] }).catch(() => {}));
    }
};