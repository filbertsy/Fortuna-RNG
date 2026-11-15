const RARITIES = [
    { key: "legendary", name: "Legendary", count: 42, color: 0xD6B66C, toolBase: 1.15, potionBase: 1.20, toolPrice: 25000, potionPrice: 12000, durationMinutes: 10 },
    { key: "mythic", name: "Mythic", count: 42, color: 0xD978A8, toolBase: 1.35, potionBase: 1.40, toolPrice: 75000, potionPrice: 40000, durationMinutes: 15 },
    { key: "secret", name: "Secret", count: 42, color: 0x8B83DF, toolBase: 1.60, potionBase: 1.70, toolPrice: 250000, potionPrice: 150000, durationMinutes: 20 },
    { key: "fortunas_blessings", name: "Fortuna's Blessings", count: 42, color: 0xD6C27A, toolBase: 1.90, potionBase: 2.00, toolPrice: 1000000, potionPrice: 600000, durationMinutes: 30 },
    { key: "heavenly", name: "Heavenly", count: 42, color: 0xA9D8F2, toolBase: 2.30, potionBase: 2.50, toolPrice: 5000000, potionPrice: 3000000, durationMinutes: 45 },
    { key: "divinity", name: "Divinity", count: 40, color: 0xF4E7B2, toolBase: 2.80, potionBase: 3.00, toolPrice: 25000000, potionPrice: 15000000, durationMinutes: 60 }
];

const TOOL_ARCHETYPES = [
    ["aegis", "Aegis", "A warding relic that steadies fortune."],
    ["compass", "Compass", "Its needle turns toward improbable outcomes."],
    ["hourglass", "Hourglass", "A grain of time seems to fall in your favor."],
    ["signet", "Signet", "An ancient seal recognized by chance itself."],
    ["astrolabe", "Astrolabe", "Maps a path through unlikely possibilities."],
    ["die", "Die", "A perfectly balanced die with an imperfect destiny."],
    ["monocle", "Monocle", "Reveals fortunate details hidden from ordinary sight."],
    ["pendulum", "Pendulum", "Swings in rhythm with favorable outcomes."],
    ["lantern", "Lantern", "Illuminates paths that probability tries to conceal."],
    ["quill", "Quill", "Records outcomes before fate can forget them."],
    ["crown", "Crown", "A royal symbol that commands a little more fortune."],
    ["gauntlet", "Gauntlet", "Channels a steady current of luck."],
    ["key", "Key", "Unlocks doors that should have remained unlikely."],
    ["orb", "Orb", "A contained sphere of concentrated possibility."],
    ["telescope", "Telescope", "Brings distant fortunes into clearer view."],
    ["hourglass_shard", "Hourglass Shard", "A splinter of time caught at a lucky moment."],
    ["feather", "Feather", "Falls toward the outcome most worth finding."],
    ["totem", "Totem", "A small monument to persistent good fortune."],
    ["mirror", "Mirror", "Reflects misfortune away from its bearer."],
    ["astrolabe_core", "Astrolabe Core", "The heart of a device built to chart destiny."],
    ["bell", "Bell", "Its clear tone calls favorable chances closer."],
    ["mask", "Mask", "Conceals your intent from unfavorable odds."],
    ["brooch", "Brooch", "A finely worked charm for fortunate journeys."],
    ["scepter", "Scepter", "Directs a measured current of royal luck."],
    ["lens", "Lens", "Focuses scattered probability into opportunity."],
    ["pocketwatch", "Pocketwatch", "Keeps perfect time with imperfect outcomes."],
    ["die_pair", "Pair of Dice", "Two silent dice that always seem almost ready."],
    ["wayfinder", "Wayfinder", "Finds the rare route through ordinary chances."],
    ["seal", "Seal", "Marks its owner as favored by fortune."],
    ["reliquary", "Reliquary", "Preserves a trace of an impossible discovery."],
    ["star_chart", "Star Chart", "Aligns your chances with distant constellations."],
    ["vial_holder", "Vial Holder", "Keeps every drop of fortune close at hand."],
    ["wristlet", "Wristlet", "A subtle band woven with lucky threads."],
    ["pocket_altar", "Pocket Altar", "A miniature shrine to patient fortune."],
    ["crystal", "Crystal", "Holds a clear view of branching possibilities."],
    ["fate_spindle", "Fate Spindle", "Draws a finer thread through the weave of chance."],
    ["star_compass", "Star Compass", "Points toward the rarest light in the dark."],
    ["echo_chime", "Echo Chime", "Repeats the sound of a fortunate possibility."],
    ["sigil", "Sigil", "A compact mark of carefully bound luck."],
    ["mantle_pin", "Mantle Pin", "A pin worn by those who walk beside fortune."],
    ["chronometer", "Chronometer", "Measures the moments when chance turns."],
    ["fate_engine", "Fate Engine", "A miniature mechanism tuned to favorable outcomes."]
];

const POTION_ARCHETYPES = [
    ["dawn", "Dawn", "A bright infusion that welcomes a fortunate beginning."],
    ["starlight", "Starlight", "A cool brew steeped beneath a clear night sky."],
    ["ember", "Ember", "A warm draught carrying a persistent spark of luck."],
    ["moonwater", "Moonwater", "A silver liquid gathered under a quiet moon."],
    ["aurora", "Aurora", "A shifting elixir filled with color and possibility."],
    ["comet", "Comet", "A swift, sparkling mixture for a sudden change in fortune."],
    ["serenity", "Serenity", "A calm potion that lets good chances find their way."],
    ["tempest", "Tempest", "A lively tonic stirred with storm-charged energy."],
    ["lotus", "Lotus", "A delicate infusion distilled from a mythical bloom."],
    ["phoenix", "Phoenix", "A fiery draught that renews a fading streak of luck."],
    ["nebula", "Nebula", "A deep-violet mixture of distant cosmic dust."],
    ["eclipse", "Eclipse", "A rare blend made during the meeting of sun and shadow."],
    ["horizon", "Horizon", "A golden tonic for fortunes just beyond reach."],
    ["mirage", "Mirage", "A shimmering drink that bends expectations."],
    ["reverie", "Reverie", "A dreamlike elixir with a gentle glow."],
    ["solstice", "Solstice", "A seasonal brew balanced between two turning points."],
    ["afterglow", "Afterglow", "A warm mixture that keeps a lucky moment alive."],
    ["crystal", "Crystal", "A clear potion with a bright, focused finish."],
    ["whisper", "Whisper", "A quiet draught said to carry secrets of chance."],
    ["sanctuary", "Sanctuary", "A soothing blend prepared in a secluded shrine."],
    ["genesis", "Genesis", "A vivid first-brew made from freshly gathered ingredients."],
    ["twilight", "Twilight", "A dusky potion balanced between light and dark."],
    ["everfrost", "Everfrost", "A crisp elixir cooled by an ageless winter."],
    ["sunfire", "Sunfire", "A radiant tonic with a warm golden shimmer."],
    ["dream", "Dream", "A soft, luminous mixture drawn from sleeping visions."],
    ["oath", "Oath", "A solemn brew sealed with a promise of good fortune."],
    ["blessing", "Blessing", "A gentle elixir prepared for a favored traveler."],
    ["fable", "Fable", "A sweet potion inspired by stories of impossible luck."],
    ["oracle", "Oracle", "A clear draught associated with hidden outcomes."],
    ["infinity", "Infinity", "A swirling mixture that seems to have no end."],
    ["paradox", "Paradox", "A strange brew whose ingredients should not coexist."],
    ["sanctum", "Sanctum", "A protected infusion from an ancient hidden chamber."],
    ["radiance", "Radiance", "A bright tonic that glimmers from within."],
    ["destiny", "Destiny", "A rich elixir prepared for a turning point."],
    ["miracle", "Miracle", "A rare blend made from almost impossible ingredients."],
    ["seraph", "Seraph", "A delicate celestial potion with a feather-light finish."],
    ["cosmos", "Cosmos", "A deep, star-filled brew distilled from the night."],
    ["providence", "Providence", "A balanced mixture said to favor the prepared."],
    ["eternity", "Eternity", "A timeless elixir with a slow, steady glow."],
    ["creation", "Creation", "A brilliant first-light potion of pure possibility."],
    ["covenant", "Covenant", "A sealed draught entrusted to the worthy."],
    ["zenith", "Zenith", "A radiant tonic brewed at the height of a rare alignment."]
];

function buildItems(category, archetypes) {
    const items = [];

    for (const rarity of RARITIES) {
        const available = archetypes.slice(0, rarity.count);

        available.forEach(([key, title, flavor], index) => {
            const itemNumber = String(index + 1).padStart(2, "0");
            const variation = index % 7;
            const multiplierBase = category === "tool" ? rarity.toolBase : rarity.potionBase;
            const multiplier = Number((multiplierBase + variation * 0.025).toFixed(3));
            const basePrice = category === "tool" ? rarity.toolPrice : rarity.potionPrice;
            const price = Math.round(basePrice * (1 + (index % 14) * 0.05));
            const id = category + "_" + rarity.key + "_" + itemNumber;

            const item = {
                id,
                name: rarity.name + " " + title,
                category,
                rarity: rarity.name,
                color: rarity.color,
                price,
                multiplier,
                description: flavor + " Luck multiplier: " + multiplier.toFixed(2) + "×."
            };

            if (category === "potion") {
                const durationMinutes = rarity.durationMinutes + (index % 5) * 2;
                item.durationMs = durationMinutes * 60 * 1000;
                item.description += " Duration: " + durationMinutes + " minutes.";
            }

            items.push(item);
        });
    }

    return items;
}

const TOOLS = buildItems("tool", TOOL_ARCHETYPES);
const POTIONS = buildItems("potion", POTION_ARCHETYPES);
const ALL_ITEMS = [...TOOLS, ...POTIONS];
const ITEM_BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]));

if (TOOLS.length !== 250 || POTIONS.length !== 250 || ITEM_BY_ID.size !== 500) {
    throw new Error("Fortuna shop catalogue must contain exactly 250 tools and 250 potions with unique IDs.");
}

function getItem(id) {
    return ITEM_BY_ID.get(String(id || "").trim().toLowerCase());
}

module.exports = { RARITIES, TOOLS, POTIONS, ALL_ITEMS, getItem };
