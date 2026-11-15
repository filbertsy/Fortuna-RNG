const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");
const crypto = require("node:crypto");

const { getDatabase } = require("../../database/database");
const { getLuck, SCALE } = require("../../utils/luck");
const rngs = require("../../data/rngs");

const GOLD = 0xD6B66C;
const MAX_RANDOM_BYTES = 64;
const ROLL_BUTTON_ID = "fortuna:roll_again";
const BUTTON_LIFETIME = 15 * 60 * 1000;

function randomBigInt(maxExclusive) {
    if (typeof maxExclusive !== "bigint" || maxExclusive <= 0n) {
        throw new TypeError("maxExclusive must be a positive BigInt.");
    }

    const bits = maxExclusive.toString(2).length;
    const byteLength = Math.ceil(bits / 8);
    if (byteLength > MAX_RANDOM_BYTES) {
        throw new RangeError("RNG odds exceed the supported random range.");
    }

    const mask = (1n << BigInt(bits)) - 1n;
    let value;

    do {
        value = BigInt(`0x${crypto.randomBytes(byteLength).toString("hex")}`) & mask;
    } while (value >= maxExclusive);

    return value;
}

function normalizeCatalogue(catalogue) {
    if (!Array.isArray(catalogue) || catalogue.length === 0) {
        throw new Error("The RNG catalogue is empty or invalid.");
    }

    return catalogue
        .map((entry) => {
            const odds = BigInt(entry.odds);

            if (!entry.id || !entry.name || odds < 1n) {
                throw new Error(`Invalid RNG catalogue entry: ${entry?.id ?? "unknown"}`);
            }

            return {
                id: String(entry.id),
                name: String(entry.name),
                odds,
                rarity: String(entry.rarity ?? "Common"),
                color: Number.isInteger(entry.color) ? entry.color : GOLD,
                description: String(entry.description ?? "A discovered fortune.")
            };
        })
        .sort((a, b) => a.odds > b.odds ? -1 : a.odds < b.odds ? 1 : 0);
}

function selectRng(catalogue, luckScale = SCALE) {
    for (const entry of catalogue) {
        const range = entry.odds * SCALE;
        if (luckScale >= range || randomBigInt(range) < luckScale) {
            return entry;
        }
    }

    return catalogue[catalogue.length - 1];
}

function formatOdds(odds) {
    return `1 in ${odds.toLocaleString("en-US")}`;
}

function createRollButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(ROLL_BUTTON_ID)
            .setLabel("Roll Again")
            .setEmoji("🎲")
            .setStyle(ButtonStyle.Primary)
    );
}

async function performRoll(interaction) {
    const catalogue = normalizeCatalogue(rngs);
    const luck = getLuck(interaction.user.id);
    const result = selectRng(catalogue, luck.scaled);
    const db = getDatabase();
    const userId = interaction.user.id;
    const timestamp = Date.now();

    const saveRoll = db.transaction(() => {
        db.prepare(`
            INSERT INTO players (user_id, total_rolls)
            VALUES (?, 1)
            ON CONFLICT(user_id) DO UPDATE SET
                total_rolls = total_rolls + 1
        `).run(userId);

        const alreadyOwned = db.prepare(
            "SELECT 1 FROM rng_inventory WHERE user_id = ? AND rng_id = ?"
        ).get(userId, result.id);
        const uniqueCount = db.prepare(
            "SELECT COUNT(*) AS count FROM rng_inventory WHERE user_id = ?"
        ).get(userId).count;
        const stored = Boolean(alreadyOwned) || uniqueCount < 300;

        if (stored) {
            db.prepare(`
                INSERT INTO rng_inventory (user_id, rng_id, quantity)
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, rng_id) DO UPDATE SET
                    quantity = quantity + 1
            `).run(userId, result.id);
        }

        db.prepare(`
            INSERT INTO roll_history
                (user_id, rng_id, result_name, odds, rolled_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, result.id, result.name, result.odds.toString(), timestamp);

        return stored;
    });

    const resultStored = saveRoll();

    const embed = new EmbedBuilder()
        .setColor(result.color)
        .setAuthor({ name: "FORTUNA RNG  •  YOUR FORTUNE" })
        .setTitle(`✦  ${result.name}`)
        .setDescription(`*${result.description}*\n\n> ${result.rarity} discovery`)
        .addFields(
            { name: "🎯  ODDS", value: `\`${formatOdds(result.odds)}\``, inline: true },
            { name: "🍀  LUCK", value: `\`${luck.multiplier.toFixed(2)}×\``, inline: true },
            { name: "✧  RARITY", value: `\`${result.rarity}\``, inline: true }
        )
        .setFooter({ text: "Fortuna RNG  •  Every roll writes your story" })
        .setTimestamp(new Date(timestamp));

    if (!resultStored) {
        embed.addFields({
            name: "📦  COLLECTION FULL",
            value: "Your collection has reached its 300 unique-RNG limit. This result was recorded in your roll history, but not added to your collection."
        });
    }

    await interaction.editReply({
        content: null,
        embeds: [embed],
        components: [createRollButton()]
    });

    if (interaction.guildId) {
        const settings = db.prepare(
            "SELECT announce_channel_id, announce_threshold, ping_everyone FROM guild_settings WHERE guild_id = ?"
        ).get(interaction.guildId);

        if (settings?.announce_channel_id && result.odds >= BigInt(settings.announce_threshold || "10000")) {
            try {
                const channel = await interaction.client.channels.fetch(settings.announce_channel_id);
                if (channel?.isTextBased() && channel.messages) {
                    await channel.send({
                        content: settings.ping_everyone
                            ? "@everyone A rare fortune has appeared!"
                            : "A rare fortune has appeared!",
                        embeds: [embed],
                        allowedMentions: { parse: settings.ping_everyone ? ["everyone"] : [] }
                    });
                }
            } catch (announcementError) {
                console.error("[Fortuna RNG] Rare announcement failed:", announcementError);
            }
        }
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Test your fortune and discover a random RNG."),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await performRoll(interaction);

            const reply = await interaction.fetchReply();
            const collector = reply.createMessageComponentCollector({
                time: BUTTON_LIFETIME,
                filter: (buttonInteraction) =>
                    buttonInteraction.customId === ROLL_BUTTON_ID &&
                    buttonInteraction.user.id === interaction.user.id
            });

            collector.on("collect", async (buttonInteraction) => {
                await buttonInteraction.deferUpdate();

                try {
                    await performRoll(interaction);
                } catch (error) {
                    console.error("[Fortuna RNG] Roll-again failed:", error);
                    await interaction.editReply({
                        content: "Your next roll could not be completed. Please try again.",
                        embeds: [],
                        components: [createRollButton()]
                    }).catch(() => {});
                }
            });

            collector.on("end", async () => {
                await interaction.editReply({ components: [] }).catch(() => {});
            });
        } catch (error) {
            console.error("[Fortuna RNG] /roll failed:", error);

            await interaction.editReply({
                content: "Your roll could not be completed. No roll was charged; try again shortly.",
                embeds: [],
                components: []
            });
        }
    }
};
