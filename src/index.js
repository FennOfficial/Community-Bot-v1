const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { command: kingdomPingCmd, execute: kingdomPingExec, registerKingdomPing } = require('./kingdomPing');
const { projectRegistration, projectList, projectEdit, deleteProject, projectSearch } = require('./projectCommands');

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
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

async function registerCommands() {
  const rest = new REST().setToken(TOKEN);
  const body = allCommands.map(c => c.data.toJSON());

  try {
    console.log('Registering slash commands globally...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body });
    console.log('Slash commands registered successfully.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  registerKingdomPing(client);
});

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
