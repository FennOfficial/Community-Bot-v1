const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all Kingdom Bot commands');

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('👑 Kingdom Bot — Command List')
    .setColor(0xFFD700)
    .setDescription('All available commands for your Rise of Kingdoms community.')
    .addFields(
      {
        name: '📢 Kingdom Announcements',
        value: [
          '`/kingdom-ping` — **Admin only.** Set a ping role and message for when a kingdom opens. The bot will watch the announcements channel and ping your role automatically.',
        ].join('\n'),
      },
      {
        name: '⚔️ KvK Tracker',
        value: [
          '`/kvk register` — Register yourself or another player for the current KvK season.',
          '`/kvk score` — Update kill points, deaths, and T4/T5 kill counts for a player.',
          '`/kvk leaderboard` — View the top 10 players ranked by kill points this season.',
          '`/kvk reset` — **Admin only.** Reset all KvK scores for a new season.',
        ].join('\n'),
      },
      {
        name: '📅 Events',
        value: [
          '`/events` — Show upcoming Rise of Kingdoms global events with countdowns.',
        ].join('\n'),
      },
      {
        name: '📋 Project Registry',
        value: [
          '`/project-registration` — Register a new migration/project. *(Main server only)*',
          '`/project-list` — Browse all registered projects. *(Main server only)*',
          '`/project-edit` — Edit one of your projects. *(Main server only)*',
          '`/project-search` — Search projects by name or kingdom. *(Main server only)*',
          '`/delete-project` — Delete one of your projects. *(Main server only)*',
        ].join('\n'),
      },
      {
        name: '📊 Bot Info',
        value: [
          '`/stats` — Show live bot statistics: servers, members, ping, and uptime.',
          '`/help` — Show this command list.',
        ].join('\n'),
      },
    )
    .setFooter({ text: 'Kingdom Bot • Rise of Kingdoms' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { command, execute };
