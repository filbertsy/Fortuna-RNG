require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const {
    Client,
    Collection,
    Events,
    REST,
    Routes,
    MessageFlags
} = require("discord.js");

const { getDatabase, closeDatabase } = require("./database/database");

const REQUIRED_ENV = ["DISCORD_TOKEN", "CLIENT_ID", "OWNER_ID"];

function validateEnvironment() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variable(s): ${missing.join(", ")}`
        );
    }

    if (!/^\d{17,20}$/.test(process.env.CLIENT_ID.trim())) {
        throw new Error("CLIENT_ID must be a valid Discord application ID.");
    }
}

function findCommandFiles(directory) {
    if (!fs.existsSync(directory)) return [];

    const files = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...findCommandFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith(".js")) {
            files.push(fullPath);
        }
    }

    return files.sort();
}

function loadCommands(client) {
    const commandsDirectory = path.join(__dirname, "commands");
    const commandFiles = findCommandFiles(commandsDirectory);
    const payload = [];

    for (const filePath of commandFiles) {
        let command;

        try {
            delete require.cache[require.resolve(filePath)];
            command = require(filePath);
        } catch (error) {
            throw new Error(
                `Could not load command "${path.relative(__dirname, filePath)}": ${error.message}`,
                { cause: error }
            );
        }

        if (!command?.data || typeof command.execute !== "function") {
            throw new Error(
                `Command "${path.relative(__dirname, filePath)}" must export data and an execute() function.`
            );
        }

        const definition = command.data.toJSON();

        if (!definition.name || typeof definition.name !== "string") {
            throw new Error(
                `Command "${path.relative(__dirname, filePath)}" has an invalid name.`
            );
        }

        if (client.commands.has(definition.name)) {
            throw new Error(`Duplicate command name: /${definition.name}`);
        }

        client.commands.set(definition.name, command);
        payload.push(definition);
        console.log(`[Fortuna RNG] Loaded command: /${definition.name}`);
    }

    if (payload.length === 0) {
        throw new Error("No slash commands were found in the commands directory.");
    }

    return payload;
}

async function registerGlobalCommands(token, clientId, commands) {
    const rest = new REST({ version: "10" }).setToken(token);

    await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
    );

    console.log(
        `[Fortuna RNG] Registered ${commands.length} global slash command(s).`
    );
}

function createClient() {
    const client = new Client({
        intents: []
    });

    client.commands = new Collection();

    client.once(Events.ClientReady, (readyClient) => {
        console.log(`[Fortuna RNG] Online as ${readyClient.user.tag}`);
        console.log("[Fortuna RNG] Scope: global");
        console.log("[Fortuna RNG] Does fortune favor you?");
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            await interaction.reply({
                content: "That command is not available right now.",
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
            return;
        }

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(
                `[Fortuna RNG] / ${interaction.commandName} execution error:`,
                error
            );

            const response = {
                content: "Something went wrong while running that command. Please try again.",
                embeds: []
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(response).catch(() => {});
            } else {
                await interaction.reply({
                    ...response,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }
    });

    client.on(Events.Error, (error) => {
        console.error("[Fortuna RNG] Discord client error:", error);
    });

    return client;
}

async function start() {
    validateEnvironment();

    // Open the database and apply the schema before accepting interactions.
    getDatabase();
    console.log("[Fortuna RNG] Database initialized.");

    const client = createClient();
    const commands = loadCommands(client);

    await registerGlobalCommands(
        process.env.DISCORD_TOKEN,
        process.env.CLIENT_ID.trim(),
        commands
    );

    await client.login(process.env.DISCORD_TOKEN);

    let shuttingDown = false;

    async function shutdown(signal) {
        if (shuttingDown) return;
        shuttingDown = true;

        console.log(`[Fortuna RNG] Received ${signal}; shutting down.`);

        try {
            client.destroy();
            closeDatabase();
        } finally {
            process.exit(0);
        }
    }

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
    console.error("[Fortuna RNG] Unhandled promise rejection:", reason);
});

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
