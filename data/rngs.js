const PREFIXES = [
    "Abandoned", "Absolute", "Abyssal", "Ancient", "Angelic", "Arcane", "Astral", "Aural", "Azure", "Benevolent",
    "Blackened", "Blessed", "Boundless", "Celestial", "Chaotic", "Chronicle", "Crimson", "Crowned", "Crystalline", "Dawn",
    "Deathless", "Divine", "Dreaming", "Eternal", "Ethereal", "Everlasting", "Fabled", "Fallen", "Fated", "Feral",
    "Fierce", "Forgotten", "Fortunate", "Frozen", "Golden", "Grim", "Hallowed", "Heavenly", "Hidden", "Hollow",
    "Infinite", "Luminous", "Lunar", "Majestic", "Merciless", "Midnight", "Mystic", "Nebulous", "Nether", "Oblivion",
    "Omniscient", "Onyx", "Phantom", "Radiant", "Reckless", "Relic", "Ruinous", "Sacred", "Scarlet", "Seraphic",
    "Shattered", "Silent", "Silver", "Solar", "Spectral", "Stellar", "Stormborn", "Sunken", "Timeless", "Tranquil",
    "Twilight", "Unbound", "Unforgiving", "Unknown", "Unseen", "Untamed", "Venerated", "Void", "Wandering", "Whispering",
    "Wild", "Winter", "Wondrous", "Wrathful", "Zealous", "Zero", "Distant", "Fractured", "Lucid", "Mortal",
    "Primordial", "Resonant", "Shining", "Veiled", "Violet", "Waking", "Astral", "Frostbitten", "Starforged", "Moonlit",
    "Everfrost", "Sunforged", "Dreambound", "Graceless", "Nameless", "Unwritten", "Last", "First", "Lost", "Infinite",
    "Forsaken", "Mirrored", "Harmonic", "Paradoxical", "Empyrean", "Transcendent", "Cosmic", "Universal", "Omniversal", "Fortuna's"
];

const UNIQUE_PREFIXES = [...new Set(PREFIXES)];

const NOUNS = [
    "Aegis", "Afterglow", "Anomaly", "Apocalypse", "Artifact", "Ascension", "Ashes", "Aurora", "Beacon", "Beginning",
    "Blessing", "Bloom", "Calamity", "Catalyst", "Cipher", "Comet", "Convergence", "Crescent", "Crown", "Dawn",
    "Daybreak", "Decree", "Destiny", "Devotion", "Dimension", "Dominion", "Echo", "Eclipse", "Elegy", "Ember",
    "Empyrean", "Enigma", "Eon", "Eternity", "Eventide", "Exodus", "Fable", "Fate", "Flame", "Flower",
    "Fortune", "Genesis", "Glory", "Grace", "Horizon", "Illusion", "Infinity", "Inheritance", "Judgment", "Legacy",
    "Light", "Lotus", "Lullaby", "Majesty", "Memory", "Miracle", "Mirage", "Moon", "Mystery", "Nebula",
    "Oath", "Oblivion", "Odyssey", "Oracle", "Origin", "Paradigm", "Paradox", "Passage", "Phantom", "Phoenix",
    "Pinnacle", "Promise", "Prophecy", "Providence", "Radiance", "Rebirth", "Reckoning", "Relic", "Remnant", "Requiem",
    "Revelation", "Rhapsody", "Rift", "Ruin", "Sanctuary", "Serenity", "Silence", "Solstice", "Sovereign", "Spectrum",
    "Spirit", "Star", "Stardust", "Symphony", "Tempest", "Throne", "Tide", "Tragedy", "Utopia", "Vanguard",
    "Veil", "Verdict", "Vesper", "Virtue", "Vision", "Voyage", "Whisper", "Wonder", "World", "Wraith",
    "Zenith", "Zero", "Abyss", "Arc", "Covenant", "Dream", "Essence", "Reverie", "Sanctum", "Singularity"
];

const MILESTONES = [
    { id: "boundless", name: "Boundless", odds: "1000000", rarity: "Boundless", color: 0x8C75D7, description: "A fortune beyond every known limit." },
    { id: "universal", name: "Universal", odds: "1000000000", rarity: "Universal", color: 0x62B7D8, description: "A discovery spanning an entire universe." },
    { id: "omniversal", name: "Omniversal", odds: "1000000000000", rarity: "Omniversal", color: 0xD58BE8, description: "A fortune reaching beyond universes." },
    { id: "fortuna", name: "Fortuna", odds: "1000000000000000", rarity: "Fortuna", color: 0xD6B66C, description: "The rarest known fortune. Does fortune favor you?" }
];

function rarityForOdds(odds) {
    if (odds <= 9) return { rarity: "Common", color: 0xA8A8A8 };
    if (odds <= 24) return { rarity: "Uncommon", color: 0x75B77A };
    if (odds <= 49) return { rarity: "Rare", color: 0x5596D8 };
    if (odds <= 99) return { rarity: "Epic", color: 0xA477D5 };
    if (odds <= 249) return { rarity: "Legendary", color: 0xD6B66C };
    if (odds <= 499) return { rarity: "Mythic", color: 0xD978A8 };
    if (odds <= 999) return { rarity: "Divine", color: 0xE5A95D };
    if (odds <= 4999) return { rarity: "Celestial", color: 0x77C8D4 };
    if (odds <= 24999) return { rarity: "Astral", color: 0x8B83DF };
    if (odds <= 99999) return { rarity: "Transcendent", color: 0xC18BE5 };
    return { rarity: "Cosmic", color: 0xD58BE8 };
}

const generated = [];
const TARGET_GENERATED = 996;

for (let i = 0; i < TARGET_GENERATED; i += 1) {
    const prefix = UNIQUE_PREFIXES[i % UNIQUE_PREFIXES.length];
    const noun = NOUNS[Math.floor(i / UNIQUE_PREFIXES.length) % NOUNS.length];
    const cycle = Math.floor(i / (UNIQUE_PREFIXES.length * NOUNS.length));
    const name = cycle === 0 ? `${prefix} ${noun}` : `${prefix} ${noun} ${cycle + 1}`;

    // Spread regular discoveries across 2..999,999 without unsafe Number odds.
    const odds = Math.max(2, Math.round(2 * Math.pow(999999 / 2, i / (TARGET_GENERATED - 1))));
    const tier = rarityForOdds(odds);

    generated.push({
        id: `fortune_${String(i + 1).padStart(4, "0")}`,
        name,
        odds: String(odds),
        rarity: tier.rarity,
        color: tier.color,
        description: `A ${tier.rarity.toLowerCase()} discovery. Its odds are one in ${odds.toLocaleString("en-US")}.`
    });
}

module.exports = [...generated, ...MILESTONES];
