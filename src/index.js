const { Client, GatewayIntentBits, REST, Routes, Collection, ActivityType } = require('discord.js');
const { command: kingdomPingCmd, execute: kingdomPingExec, registerKingdomPing } = require('./kingdomPing');
const { projectRegistration, projectList, projectEdit, deleteProject, projectSearch } = require('./projectCommands');
const { registerAutoAnnounce } = require('./autoAnnounce');
const { command: statsCmd, execute: statsExec } = require('./statsCommand');
const { command: helpCmd, execute: helpExec } = require('./helpCommand');
const { command: kvkCmd, execute: kvkExec } = require('./kvkCommand');
const { command: eventsCmd, execute: eventsExec } = require('./eventsCommand');
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Kingdom Bot is running.');
}).listen(5000, '0.0.0.0');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString('utf-8');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const commands = new Collection();

const allCommands = [
  { data: kingdomPingCmd, execute: kingdomPingExec },
  { data: projectRegistration.command, execute: projectRegistration.execute },
  { data: projectList.command, execute: projectList.execute },
  { data: projectEdit.command, execute: projectEdit.execute },
  { data: deleteProject.command, execute: deleteProject.execute },
  { data: projectSearch.command, execute: projectSearch.execute },
  { data: statsCmd, execute: statsExec },
  { data: helpCmd, execute: helpExec },
  { data: kvkCmd, execute: kvkExec },
  { data: eventsCmd, execute: eventsExec },
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

async function registerCommands() {
  const rest = new REST().setToken(TOKEN);
  const newCmds = allCommands.map(c => c.data.toJSON());

  try {
    console.log('Registering slash commands globally...');
    const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
    const entryPoints = existing.filter(c => c.type === 4);
    const body = [...newCmds, ...entryPoints];
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

function updatePresence() {
  const count = client.guilds.cache.size;
  client.user.setPresence({
    status: 'idle',
    activities: [{
      name: `over ${count} server${count !== 1 ? 's' : ''}`,
      type: ActivityType.Watching,
    }],
  });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  registerKingdomPing(client);
  registerAutoAnnounce(client);
  updatePresence();
  console.log(`Presence set: Watching over ${client.guilds.cache.size} servers`);
});

client.on('guildCreate', () => updatePresence());
client.on('guildDelete', () => updatePresence());

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const msg = { content: 'An error occurred while running this command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.login(TOKEN);
