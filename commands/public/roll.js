const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");
const crypto = require("node:crypto");

const { getDatabase } = require("../../database/database");
const rngs = require("../../data/rngs");

const GOLD = 0xD6B66C;
const MAX_RANDOM_BYTES = 64;

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

            if (
                !entry.id ||
                !entry.name ||
                odds < 1n
            ) {
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
        .sort((a, b) => a.odds < b.odds ? -1 : a.odds > b.odds ? 1 : 0);
}

function selectRng(catalogue) {
    // Test rare entries first. Each entry keeps its own one-in-X chance.
    for (const entry of catalogue) {
        if (randomBigInt(entry.odds) === 0n) {
            return entry;
        }
    }

    return catalogue[0];
}

function formatOdds(odds) {
    return `1 in ${odds.toLocaleString("en-US")}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roll")
        .setDescription("Test your fortune and discover a random RNG."),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const catalogue = normalizeCatalogue(rngs);
            const result = selectRng(catalogue);
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

                db.prepare(`
                    INSERT INTO rng_inventory (user_id, rng_id, quantity)
                    VALUES (?, ?, 1)
                    ON CONFLICT(user_id, rng_id) DO UPDATE SET
                        quantity = quantity + 1
                `).run(userId, result.id);

                db.prepare(`
                    INSERT INTO roll_history
                        (user_id, rng_id, result_name, odds, rolled_at)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    userId,
                    result.id,
                    result.name,
                    result.odds.toString(),
                    timestamp
                );
            });

            saveRoll();

            const embed = new EmbedBuilder()
                .setColor(result.color)
                .setTitle(result.name)
                .setDescription(result.description)
                .addFields(
                    { name: "Rarity", value: result.rarity, inline: true },
                    { name: "Odds", value: formatOdds(result.odds), inline: true }
                )
                .setFooter({ text: "Fortuna RNG • Does fortune favor you?" })
                .setTimestamp(new Date(timestamp));

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[Fortuna RNG] /roll failed:", error);

            await interaction.editReply({
                content: "Your roll could not be completed. No roll was charged; try again shortly.",
                embeds: []
            });
        }
    }
};
