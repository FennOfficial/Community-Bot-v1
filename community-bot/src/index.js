const { Client, GatewayIntentBits, REST, Routes, Collection, ActivityType } = require('discord.js');
const http = require('http');
const https = require('https');

const { registerCommand, listCommand, customCommand, executeRegister, executeList, executeCustom, handleListButton } = require('./projectCommand');
const { command: setupCmd, execute: setupExec } = require('./setupCommand');
const { handleKingdomAnnounce } = require('./kingdomAnnounce');

const TOKEN = process.env.COMMUNITY_BOT_TOKEN;
if (!TOKEN) {
  console.error('[CommunityBot] COMMUNITY_BOT_TOKEN is not set. Exiting.');
  process.exit(1);
}

const CLIENT_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString('utf-8');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Community Bot is running.');
}).listen(5001, '0.0.0.0');

const SELF_URL = process.env.COMMUNITY_BOT_URL || '';
if (SELF_URL) {
  setInterval(() => {
    https.get(SELF_URL, (res) => { res.resume(); }).on('error', () => {});
  }, 4 * 60 * 1000);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const allCommands = [
  { data: registerCommand, execute: executeRegister },
  { data: listCommand,     execute: executeList     },
  { data: customCommand,   execute: executeCustom   },
  { data: setupCmd,        execute: setupExec       },
];

const commands = new Collection();
for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

async function registerCommands() {
  const rest = new REST().setToken(TOKEN);
  const body = allCommands.map(c => c.data.toJSON());
  try {
    console.log('[CommunityBot] Registering slash commands...');
    const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
    const entryPoints = existing.filter(c => c.type === 4);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [...body, ...entryPoints] });
    console.log('[CommunityBot] Slash commands registered.');
  } catch (err) {
    console.error('[CommunityBot] Failed to register commands:', err);
  }
}

client.once('ready', async () => {
  console.log(`[CommunityBot] Logged in as ${client.user.tag}`);
  await registerCommands();
  const count = client.guilds.cache.size;
  client.user.setPresence({
    status: 'online',
    activities: [{ name: `${count} server${count !== 1 ? 's' : ''} | /project-list`, type: ActivityType.Watching }],
  });
  console.log('[CommunityBot] Ready.');
});

client.on('messageCreate', async (message) => {
  await handleKingdomAnnounce(message);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`[CommunityBot] Error in /${interaction.commandName}:`, err);
      const msg = { content: '❌ An error occurred.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isButton()) {
    try {
      await handleListButton(interaction);
    } catch (err) {
      console.error('[CommunityBot] Button handler error:', err);
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(TOKEN);
