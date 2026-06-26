const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('welcome')
  .setDescription('Configure welcome messages for new members')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Set up welcome messages')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to send welcome messages in').setRequired(true))
      .addStringOption(opt =>
        opt.setName('message')
          .setDescription('Welcome message. Use {user} for mention, {server} for server name, {count} for member count')
          .setRequired(false)
      )
      .addBooleanOption(opt => opt.setName('dm').setDescription('Also DM the user? (default: false)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disable welcome messages')
  )
  .addSubcommand(sub =>
    sub.setName('test')
      .setDescription('Preview the current welcome message')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') || 'Welcome to **{server}**, {user}! 🎉 You are member #{count}.';
    const dm = interaction.options.getBoolean('dm') ?? false;

    db.setWelcomeConfig(guildId, { channel_id: channel.id, message, dm: dm ? 1 : 0, enabled: 1 });

    const embed = new EmbedBuilder()
      .setTitle('✅ Welcome Messages Configured')
      .setColor(0x57F287)
      .addFields(
        { name: 'Channel', value: `${channel}`, inline: true },
        { name: 'DM User', value: dm ? 'Yes' : 'No', inline: true },
        { name: 'Message', value: message },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'disable') {
    db.setWelcomeConfig(guildId, { enabled: 0 });
    return interaction.reply({ content: '✅ Welcome messages have been disabled.', ephemeral: true });
  }

  if (sub === 'test') {
    const config = db.getWelcomeConfig(guildId);
    if (!config?.enabled) return interaction.reply({ content: '⚠️ Welcome messages are not configured.', ephemeral: true });

    const preview = buildWelcomeMessage(config.message, interaction.member, interaction.guild);
    const embed = new EmbedBuilder()
      .setTitle('👋 Welcome Message Preview')
      .setDescription(preview)
      .setColor(0x5865F2)
      .setThumbnail(interaction.user.displayAvatarURL());

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

function buildWelcomeMessage(template, member, guild) {
  return template
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{server}/g, guild.name)
    .replace(/{count}/g, guild.memberCount);
}

async function handleMemberJoin(member) {
  const config = db.getWelcomeConfig(member.guild.id);
  if (!config || !config.enabled) return;

  const text = buildWelcomeMessage(config.message, member, member.guild);

  const embed = new EmbedBuilder()
    .setDescription(text)
    .setColor(0x57F287)
    .setThumbnail(member.user.displayAvatarURL())
    .setTimestamp();

  if (config.channel_id) {
    const channel = await member.client.channels.fetch(config.channel_id).catch(() => null);
    if (channel) await channel.send({ embeds: [embed] }).catch(() => {});
  }

  if (config.dm) {
    await member.user.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { command, execute, handleMemberJoin };
