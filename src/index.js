const { Client, GatewayIntentBits, REST, Routes, Collection, ActivityType } = require('discord.js');
const http = require('http');
const https = require('https');

const {
  command: verifyCmd, execute: verifyExec,
  manageCommand: verifyManageCmd, executeManage: verifyManageExec,
  handleVerifyButton, handleVerifyAccept, handleVerifyDecline,
  handleImageSubmission,
  handleImgVerifyAdd, handleImgVerifyDelete,
  handleImgVerifyAddModal, handleImgVerifyDeleteModal,
} = require('./verificationCommand');
const { command: ticketCmd, execute: ticketExec, handleTicketOpen, handleTicketCloseBtn } = require('./ticketCommand');
const { command: welcomeCmd, execute: welcomeExec, handleMemberJoin: welcomeJoin } = require('./welcomeCommand');
const { command: autoroleCmd, execute: autoroleExec, handleMemberJoin: autoroleJoin } = require('./autoroleCommand');
const { command: giveawayCmd, execute: giveawayExec, checkGiveaways } = require('./giveawayCommand');
const { command: pointsCmd, storeCommand, executePoints, executeStore } = require('./pointsCommand');
const { command: kingdomAlertCmd, execute: kingdomAlertExec } = require('./kingdomAlertCommand');
const { handleKingdomDetector } = require('./kingdomDetector');
const { command: helpCmd, execute: helpExec } = require('./helpCommand');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = Buffer.from(TOKEN.split('.')[0], 'base64').toString('utf-8');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Ascendant Guardians is running.');
}).listen(5000, '0.0.0.0');

const SELF_URL = 'https://community-bot-v-1--mrversius.replit.app';
setInterval(() => {
  https.get(SELF_URL, (res) => { res.resume(); }).on('error', () => {});
}, 4 * 60 * 1000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const allCommands = [
  { data: verifyCmd, execute: verifyExec },
  { data: verifyManageCmd, execute: verifyManageExec },
  { data: ticketCmd, execute: ticketExec },
  { data: welcomeCmd, execute: welcomeExec },
  { data: autoroleCmd, execute: autoroleExec },
  { data: giveawayCmd, execute: giveawayExec },
  { data: pointsCmd, execute: executePoints },
  { data: storeCommand, execute: executeStore },
  { data: kingdomAlertCmd, execute: kingdomAlertExec },
  { data: helpCmd, execute: helpExec },
];

const commands = new Collection();
for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

async function registerCommands() {
  const rest = new REST().setToken(TOKEN);
  const body = allCommands.map(c => c.data.toJSON());
  try {
    console.log('Registering slash commands...');
    const existing = await rest.get(Routes.applicationCommands(CLIENT_ID));
    const entryPoints = existing.filter(c => c.type === 4);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [...body, ...entryPoints] });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to register commands:', err);
  }
}

function updatePresence() {
  const count = client.guilds.cache.size;
  client.user.setPresence({
    status: 'online',
    activities: [{ name: `${count} server${count !== 1 ? 's' : ''} | /help`, type: ActivityType.Watching }],
  });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  updatePresence();
  setInterval(() => checkGiveaways(client), 30 * 1000);
  console.log('Ascendant Guardians is ready.');
});

client.on('guildCreate', () => updatePresence());
client.on('guildDelete', () => updatePresence());

client.on('guildMemberAdd', async (member) => {
  await autoroleJoin(member);
  await welcomeJoin(member);
});

client.on('messageCreate', async (message) => {
  await handleImageSubmission(message);
  await handleKingdomDetector(message);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = commands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`Error in /${interaction.commandName}:`, err);
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
      if (interaction.customId === 'verify_button_click') return await handleVerifyButton(interaction);
      if (interaction.customId.startsWith('verify_accept_')) return await handleVerifyAccept(interaction);
      if (interaction.customId.startsWith('verify_decline_')) return await handleVerifyDecline(interaction);
      if (interaction.customId.startsWith('imgv_add_')) return await handleImgVerifyAdd(interaction);
      if (interaction.customId.startsWith('imgv_del_')) return await handleImgVerifyDelete(interaction);
      if (interaction.customId === 'ticket_open') return await handleTicketOpen(interaction);
      if (interaction.customId === 'ticket_close_btn') return await handleTicketCloseBtn(interaction);
    } catch (err) {
      console.error('Button handler error:', err);
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }

  if (interaction.isModalSubmit()) {
    try {
      if (interaction.customId.startsWith('imgv_add_modal_')) return await handleImgVerifyAddModal(interaction);
      if (interaction.customId.startsWith('imgv_del_modal_')) return await handleImgVerifyDeleteModal(interaction);
    } catch (err) {
      console.error('Modal handler error:', err);
      await interaction.reply({ content: '❌ Something went wrong.', ephemeral: true }).catch(() => {});
    }
  }
});

client.login(TOKEN);
