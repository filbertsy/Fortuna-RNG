# Fortuna RNG

A global Discord RNG and collection game.

## Runtime

- Node.js 22+
- Discord.js 14
- SQLite via better-sqlite3

## Altare / Pterodactyl setup

- Install command: `npm install`
- Build command: leave blank
- Startup command: `node index.js`

Set these in the server's environment-variable panel:

- `DISCORD_TOKEN` — bot token
- `CLIENT_ID` — Discord application ID
- `OWNER_ID` — your Discord user ID; controls the global owner-only admin whitelist
- `DATABASE_PATH` — optional absolute database path

Do not commit real bot tokens or credentials to GitHub. The database is stored at `database/fortuna.sqlite` by default and is ignored by Git.

## Commands

### Fortune
- `/roll` — roll for a discovery
- `/rng` — inspect a catalogue entry
- `/inventory` — view the global RNG collection
- `/favorite` — add, remove, or list favorites
- `/history` — recent roll history

### Player
- `/profile` — profile
- `/stats` — statistics
- `/leaderboard` — global rankings
- `/achievements` — achievement milestones

### Economy
- `/daily` — daily coins
- `/shop` — browse tools and potions
- `/buy` — purchase an item
- `/bag` — owned tools and potions
- `/equip`, `/unequip` — manage permanent tools
- `/use` — activate a potion
- `/luck` — inspect active luck

### Server settings
- `/server-settings channel`
- `/server-settings threshold`
- `/server-settings ping`

### Administration
- `/admin add-admin`, `/admin remove-admin`, `/admin list-admins`
- `/admin grant-coins`, `/admin give-rng`
- `/admin set-stock`, `/admin announce`

## Scope rules

- Player accounts, coins, RNG collections, favorites, achievements, tools, and potion ownership are global by Discord user ID.
- Shop stock and rare-announcement settings are per server.
- Permanent tools are unique and at most two can be equipped.
- Potion copies stack in storage. Up to five active potion stacks can be running.
- Luck bonuses use additive stacking: `1 + sum(multiplier - 1)`.
- Active potions apply to the server selected by the player's most recent loadout change.
- The configured `OWNER_ID` is the only account that can modify the global admin whitelist. Server ownership does not grant Fortuna admin access.

## Development

Run the catalogue integrity tests with:

```bash
npm test
```

Global slash commands can take time to propagate after the bot registers them.
