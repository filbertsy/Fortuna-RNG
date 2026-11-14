const test = require("node:test");
const assert = require("node:assert/strict");

const rngs = require("../data/rngs");
const { ALL_ITEMS, TOOLS, POTIONS } = require("../data/shop");

test("RNG catalogue contains 1,000 valid unique entries", () => {
    assert.equal(rngs.length, 1000);

    const ids = new Set();
    const names = new Set();
    for (const entry of rngs) {
        assert.equal(typeof entry.id, "string");
        assert.ok(entry.id.length > 0);
        assert.ok(!ids.has(entry.id), `Duplicate RNG ID: ${entry.id}`);
        ids.add(entry.id);

        assert.equal(typeof entry.name, "string");
        assert.ok(entry.name.length > 0);
        assert.ok(!names.has(entry.name), `Duplicate RNG name: ${entry.name}`);
        names.add(entry.name);
        assert.ok(BigInt(entry.odds) >= 1n);
        assert.equal(typeof entry.rarity, "string");
        assert.equal(typeof entry.color, "number");
    }
});

test("milestone odds reach one quadrillion", () => {
    const fortuna = rngs.find((entry) => entry.id === "fortuna");
    assert.ok(fortuna);
    assert.equal(BigInt(fortuna.odds), 1000000000000000n);
});

test("shop item IDs are unique and prices are valid", () => {
    const ids = new Set();
    assert.equal(ALL_ITEMS.length, TOOLS.length + POTIONS.length);

    for (const item of ALL_ITEMS) {
        assert.ok(!ids.has(item.id), `Duplicate shop item ID: ${item.id}`);
        ids.add(item.id);
        assert.ok(Number.isSafeInteger(item.price) && item.price > 0);
        assert.ok(Number.isFinite(item.multiplier) && item.multiplier >= 1);
    }
});

test("permanent tools and potions expose their required fields", () => {
    for (const tool of TOOLS) {
        assert.equal(typeof tool.description, "string");
    }
    for (const potion of POTIONS) {
        assert.ok(Number.isSafeInteger(potion.durationMs) && potion.durationMs > 0);
    }
});
