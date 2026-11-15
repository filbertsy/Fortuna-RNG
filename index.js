require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
    Client, Collection, Events, REST, Routes, MessageFlags
} = require("discord.js");
const { getDatabase, closeDatabase } = require("./database/database");

const REQUIRED_ENV = ["DISCORD_TOKEN", "CLIENT_ID", "OWNER_ID"];
const PUBLIC_COMMANDS = ["roll", "inventory", "shop", "buy", "equip", "use", "items", "daily", "balance", "unequip"];

function validateEnvironment() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
    if (missing.length) throw new Error("Missing required environment variable(s): " + missing.join(", "));
    if (!/^\d{17,20}$/.test(process.env.CLIENT_ID.trim())) throw new Error("CLIENT_ID must be a valid Discord application ID.");
    if (!/^\d{17,20}$/.test(process.env.OWNER_ID.trim())) throw new Error("OWNER_ID must be a valid Discord user ID.");
}

function loadCommands(client) {
    const payload = [];
    for (const name of PUBLIC_COMMANDS) {
        const filePath = path.join(__dirname, "commands", "public", name + ".js");
        if (!fs.existsSync(filePath)) throw new Error("Required command file is missing: " + filePath);
        let command;
        try {
            delete require.cache[require.resolve(filePath)];
            command = require(filePath);
        } catch (error) {
            throw new Error("Could not load command /" + name + ": " + error.message, { cause: error });
        }
        if (!command?.data || typeof command.execute !== "function") throw new Error("Command /" + name + " must export data and execute().");
        const definition = command.data.toJSON();
        if (client.commands.has(definition.name)) throw new Error("Duplicate command name: /" + definition.name);
        client.commands.set(definition.name, command);
        payload.push(definition);
        console.log("[Fortuna RNG] Loaded command: /" + definition.name);
    }
    return payload;
}

async function registerGlobalCommands(token, clientId, commands) {
    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("[Fortuna RNG] Registered " + commands.length + " global slash command(s).");
}

function createClient() {
    const client = new Client({ intents: [] });
    client.commands = new Collection();
    client.once(Events.ClientReady, (readyClient) => {
        console.log("[Fortuna RNG] Online as " + readyClient.user.tag);
        console.log("[Fortuna RNG] Scope: global");
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command || typeof command.autocomplete !== "function") {
                return interaction.respond([]).catch(() => {});
            }
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error("[Fortuna RNG] Autocomplete error for /" + interaction.commandName + ":", error);
                await interaction.respond([]).catch(() => {});
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;
        const command = client.commands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({ content: "That command is not available right now.", flags: MessageFlags.Ephemeral }).catch(() => {});
            return;
        }
        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error("[Fortuna RNG] /" + interaction.commandName + " execution error:", error);
            const response = { content: "Something went wrong while running that command. Please try again.", embeds: [] };
            if (interaction.deferred || interaction.replied) await interaction.editReply(response).catch(() => {});
            else await interaction.reply({ ...response, flags: MessageFlags.Ephemeral }).catch(() => {});
        }
    });

    client.on("shardReady", (shardId) => {
        console.log("[Fortuna RNG] Discord Gateway ready (shard " + shardId + ").");
    });
    client.on("shardDisconnect", (event, shardId) => {
        console.warn(
            "[Fortuna RNG] Discord Gateway disconnected (shard " + shardId +
            ", code " + event.code +
            ", clean " + event.wasClean +
            "): " + (event.reason || "no reason provided")
        );
    });
    client.on("shardReconnecting", (shardId) => {
        console.warn("[Fortuna RNG] Discord Gateway reconnecting (shard " + shardId + ").");
    });
    client.on("shardResume", (shardId, replayedEvents) => {
        console.log(
            "[Fortuna RNG] Discord Gateway resumed (shard " + shardId +
            ", replayed " + replayedEvents + " event(s))."
        );
    });
    client.on("shardError", (error, shardId) => {
        console.error("[Fortuna RNG] Discord Gateway error (shard " + shardId + "):", error);
    });
    client.on("invalidated", () => {
        console.error("[Fortuna RNG] Discord session invalidated. A restart may be required.");
    });
    client.on("warn", (warning) => {
        console.warn("[Fortuna RNG] Discord warning:", warning);
    });
    client.on(Events.Error, (error) => console.error("[Fortuna RNG] Discord client error:", error));
    return client;
}

async function start() {
    validateEnvironment();
    getDatabase();
    console.log("[Fortuna RNG] Database initialized.");
    const client = createClient();
    const commands = loadCommands(client);

    // Connect the Gateway first so a slow Discord command-registration request
    // cannot prevent the bot from coming online.
    await client.login(process.env.DISCORD_TOKEN);

    registerGlobalCommands(process.env.DISCORD_TOKEN, process.env.CLIENT_ID.trim(), commands)
        .catch((error) => {
            console.error("[Fortuna RNG] Global command registration failed:", error);
        });

    let shuttingDown = false;
    async function shutdown(signal) {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log("[Fortuna RNG] Received " + signal + "; shutting down.");
        try { client.destroy(); closeDatabase(); }
        finally { process.exit(0); }
    }
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => console.error("[Fortuna RNG] Unhandled promise rejection:", reason));
process.on("uncaughtException", (error) => {
    console.error("[Fortuna RNG] Uncaught exception:", error);
    closeDatabase();
    process.exit(1);
});
start().catch((error) => {
    console.error("[Fortuna RNG] Startup failed:", error);
    closeDatabase();
    process.exit(1);
});
