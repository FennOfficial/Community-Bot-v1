const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show Kingdom Bot live statistics');

async function execute(interaction) {
  await interaction.deferReply();

  const client = interaction.client;

  const serverCount = client.guilds.cache.size;

  const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

  const uptimeMs = client.uptime;
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const uptimeParts = [];
  if (days > 0) uptimeParts.push(`${days}d`);
  if (hours > 0) uptimeParts.push(`${hours}h`);
  if (minutes > 0) uptimeParts.push(`${minutes}m`);
  uptimeParts.push(`${seconds}s`);
  const uptimeStr = uptimeParts.join(' ');

  const ping = Math.round(client.ws.ping);

  const embed = new EmbedBuilder()
    .setTitle('📊 Kingdom Bot Statistics')
    .setColor(0xFFD700)
    .addFields(
      { name: '🏰 Servers', value: serverCount.toLocaleString(), inline: true },
      { name: '👥 Total Members', value: memberCount.toLocaleString(), inline: true },
      { name: '📡 Ping', value: `${ping}ms`, inline: true },
      { name: '⏱️ Uptime', value: uptimeStr, inline: true },
    )
    .setFooter({ text: 'Kingdom Bot • Rise of Kingdoms' })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

module.exports = { command, execute };
