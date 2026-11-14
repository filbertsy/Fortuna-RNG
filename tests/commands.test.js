const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function collect(directory) {
    const found = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) found.push(...collect(fullPath));
        else if (entry.isFile() && entry.name.endsWith(".js")) found.push(fullPath);
    }
    return found;
}

test("every command loads and exposes a valid unique slash-command definition", () => {
    const root = path.join(__dirname, "..", "commands");
    const files = collect(root);
    const names = new Set();

    assert.ok(files.length > 0, "No command modules were found.");

    for (const file of files) {
        const command = require(file);
        assert.ok(command.data, `${file} is missing data.`);
        assert.equal(typeof command.execute, "function", `${file} is missing execute().`);

        const definition = command.data.toJSON();
        assert.match(definition.name, /^[a-z0-9_-]{1,32}$/);
        assert.ok(!names.has(definition.name), `Duplicate slash command: /${definition.name}`);
        names.add(definition.name);
    }
});
