const TOOLS = [
    { id: "lucky_charm", name: "Lucky Charm", price: 2500, multiplier: 1.15, description: "A small charm that gently bends fortune." },
    { id: "fortune_compass", name: "Fortune Compass", price: 7500, multiplier: 1.3, description: "Points toward unlikely outcomes." },
    { id: "silver_dice", name: "Silver Dice", price: 18000, multiplier: 1.5, description: "Polished dice with a strange pull." },
    { id: "oracle_eye", name: "Oracle Eye", price: 45000, multiplier: 1.8, description: "A permanent glimpse beyond chance." },
    { id: "star_fragment", name: "Star Fragment", price: 100000, multiplier: 2.2, description: "A fragment of distant celestial luck." },
    { id: "fate_engine", name: "Fate Engine", price: 250000, multiplier: 3, description: "A machine that nudges probability." }
];

const POTIONS = [
    { id: "small_luck", name: "Small Luck Potion", price: 1000, multiplier: 1.25, durationMs: 10 * 60 * 1000, description: "A brief boost to your luck." },
    { id: "luck_potion", name: "Luck Potion", price: 3500, multiplier: 1.5, durationMs: 20 * 60 * 1000, description: "A stronger temporary boost." },
    { id: "grand_luck", name: "Grand Luck Potion", price: 12000, multiplier: 2, durationMs: 30 * 60 * 1000, description: "A powerful temporary boost." },
    { id: "fortune_elixir", name: "Fortune Elixir", price: 40000, multiplier: 3, durationMs: 45 * 60 * 1000, description: "A rare and potent elixir." }
];

const ALL_ITEMS = [
    ...TOOLS.map((item) => ({ ...item, category: "tool" })),
    ...POTIONS.map((item) => ({ ...item, category: "potion" }))
];

function getItem(id) {
    return ALL_ITEMS.find((item) => item.id === id);
}

module.exports = { TOOLS, POTIONS, ALL_ITEMS, getItem };
