const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

const { getDatabase } = require("../../database/database");
const rngs = require("../../data/rngs");

const PAGE_SIZE = 10;
const COLLECTOR_LIFETIME = 15 * 60 * 1000;
const PREVIOUS_ID = "fortuna:inventory:previous";
const NEXT_ID = "fortuna:inventory:next";
const GOLD = 0xD6B66C;

const catalogue = new Map(rngs.map((rng) => [
    String(rng.id),
    {
        name: String(rng.name),
        odds: BigInt(rng.odds),
        rarity: String(rng.rarity ?? "Common"),
        color: Number.isInteger(rng.color) ? rng.color : GOLD
    }
]));

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

function formatOdds(odds) {
    return `1 in ${odds.toLocaleString("en-US")}`;
}

function getInventory(userId) {
    const db = getDatabase();
    const rows = db.prepare(`
        SELECT rng_id, quantity
        FROM rng_inventory
        WHERE user_id = ?
    `).all(userId);

    return rows.map((row) => {
        const rng = catalogue.get(row.rng_id);
        return {
            id: row.rng_id,
            name: rng?.name ?? `Unknown RNG (${row.rng_id})`,
            odds: rng?.odds ?? 0n,
            rarity: rng?.rarity ?? "Unknown",
            quantity: row.quantity
        };
    }).sort((a, b) => {
        if (a.odds !== b.odds) return a.odds > b.odds ? -1 : 1;
        return a.name.localeCompare(b.name);
    });
}

function createEmbed(user, items, page, totalCopies) {
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const start = page * PAGE_SIZE;
    const visible = items.slice(start, start + PAGE_SIZE);

    const description = visible.length
        ? visible.map((item, index) => {
            const position = start + index + 1;
            const odds = item.odds > 0n ? formatOdds(item.odds) : "Catalogue entry unavailable";
            return `**${position}. ${item.name}**\n└ ${item.rarity} • ${odds} • **×${formatNumber(item.quantity)}**`;
        }).join("\n\n")
        : "Your collection is empty. Use `/roll` to discover your first RNG.";

    return new EmbedBuilder()
        .setColor(GOLD)
        .setAuthor({ name: "FORTUNA RNG  •  COLLECTION" })
        .setTitle(`✦ ${user.username}'s RNG Inventory`)
        .setDescription(description)
        .addFields(
            { name: "✧ UNIQUE RNGS", value: `\`${formatNumber(items.length)}\``, inline: true },
            { name: "🎲 TOTAL COPIES", value: `\`${formatNumber(totalCopies)}\``, inline: true },
            { name: "📖 PAGE", value: `\`${page + 1} / ${pageCount}\``, inline: true }
        )
        .setFooter({ text: "Fortuna RNG  •  Rarest discoveries appear first" });
}

function createButtons(page, pageCount) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(PREVIOUS_ID)
            .setLabel("Previous")
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(NEXT_ID)
            .setLabel("Next")
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= pageCount - 1)
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("View your global RNG collection."),

    async execute(interaction) {
        const items = getInventory(interaction.user.id);
        const totalCopies = items.reduce((sum, item) => sum + item.quantity, 0);
        const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        let page = 0;

        await interaction.reply({
            embeds: [createEmbed(interaction.user, items, page, totalCopies)],
            components: [createButtons(page, pageCount)],
            flags: MessageFlags.Ephemeral
        });

        const reply = await interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({
            time: COLLECTOR_LIFETIME,
            filter: (buttonInteraction) =>
                [PREVIOUS_ID, NEXT_ID].includes(buttonInteraction.customId) &&
                buttonInteraction.user.id === interaction.user.id
        });

        collector.on("collect", async (buttonInteraction) => {
            page += buttonInteraction.customId === NEXT_ID ? 1 : -1;
            page = Math.max(0, Math.min(page, pageCount - 1));

            await buttonInteraction.update({
                embeds: [createEmbed(interaction.user, items, page, totalCopies)],
                components: [createButtons(page, pageCount)]
            });
        });

        collector.on("end", async () => {
            await interaction.editReply({ components: [] }).catch(() => {});
        });
    }
};
