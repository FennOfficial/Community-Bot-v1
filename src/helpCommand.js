const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List all AG Tools commands');

const sections = [
  {
    name: '✅ Verification',
    value: [
      '`/verify setup` — Configure button or image verification',
      '`/verify panel` — Post the verification button in a channel',
    ].join('\n'),
  },
  {
    name: '🎫 Tickets',
    value: [
      '`/ticket setup` — Configure ticket system (category + staff role)',
      '`/ticket panel` — Post the "Open a Ticket" button',
    ].join('\n'),
  },
  {
    name: '👋 Welcome',
    value: [
      '`/welcome set` — Set welcome channel and message',
      '`/welcome disable` — Turn off welcome messages',
    ].join('\n'),
  },
  {
    name: '🎭 Auto-role',
    value: [
      '`/autorole add` — Assign a role automatically on join',
      '`/autorole remove` — Remove a role from auto-assign',
      '`/autorole list` — See all configured auto-roles',
    ].join('\n'),
  },
  {
    name: '🎉 Giveaway',
    value: [
      '`/giveaway start` — Start a giveaway in any channel',
      '`/giveaway end` — End the latest giveaway early',
      '`/giveaway reroll` — Pick a new winner',
    ].join('\n'),
  },
  {
    name: '💰 Points & Store',
    value: [
      '`/points give` — Give points to a member',
      '`/points take` — Deduct points from a member',
      '`/points balance` — Check a member\'s balance',
      '`/store add` — Add an item to the point store',
      '`/store remove` — Remove a store item',
      '`/store list` — Browse available items',
      '`/store buy` — Buy an item with points',
    ].join('\n'),
  },
  {
    name: '🏰 Kingdom Alerts',
    value: [
      '`/kingdom-alert set kd:<number> channel:#ch` — Watch for a KD to open; auto-sends alert when ROKSTATS announces it',
      '`/kingdom-alert set kd:<number> channel:#ch message:<text> spam:true` — Custom message + 5-ping spam mode',
      '`/kingdom-alert list` — See all active watches in this server',
      '`/kingdom-alert delete kd:<number>` — Remove a specific watch',
    ].join('\n'),
  },
];

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('⚔️ AG Tools — Command List')
    .setColor(0xFFD700)
    .setDescription('All available commands. Admin commands require the **Administrator** permission.')
    .addFields(sections)
    .setFooter({ text: 'Ascendant Guardians • AG Tools#1256' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { command, execute };
