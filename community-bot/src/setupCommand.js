const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('alert-setup')
  .setDescription('Configure the kingdom opening announcements for this server')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel to post kingdom alerts in')
      .setRequired(true)
  )
  .addRoleOption(opt =>
    opt.setName('role')
      .setDescription('Role to mention (default: <@&1492314511900672020>)')
      .setRequired(false)
  );

const DEFAULT_ROLE_ID = '1492314511900672020';

async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  const role = interaction.options.getRole('role');
  const roleId = role?.id ?? DEFAULT_ROLE_ID;

  db.setKingdomAlertConfig(interaction.guildId, channel.id, roleId);

  const embed = new EmbedBuilder()
    .setTitle('✅ Kingdom Alert Configured')
    .setColor(0x57F287)
    .addFields(
      { name: '📢 Announce Channel', value: `${channel}`, inline: true },
      { name: '🔔 Role Mention', value: `<@&${roleId}>`, inline: true },
    )
    .setFooter({ text: 'Made by Ascendant Guardians' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { command, execute };
