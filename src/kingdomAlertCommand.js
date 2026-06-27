const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addWatch, removeWatch, removeAllWatches, listWatchesForGuild } = require('./kingdomWatchlist');

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Manage kingdom opening alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Watch for a kingdom to open — auto-pings when ROKSTATS announces it')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number (e.g. 4125)')
          .setRequired(true)
          .setMinValue(1)
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to send pings to (default: this channel)')
          .setRequired(false)
      )
      .addRoleOption(opt =>
        opt.setName('ping')
          .setDescription('Role to ping (default: @everyone)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('See all kingdoms being watched in this server')
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Remove a kingdom watch (leave kd blank to disable all)')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number to stop watching (leave blank = disable all)')
          .setRequired(false)
          .setMinValue(1)
      )
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'add') {
    const kd = interaction.options.getInteger('kd');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const role = interaction.options.getRole('ping');

    addWatch(kd, guildId, channel.id, role?.id ?? null);

    const embed = new EmbedBuilder()
      .setTitle('👁️ Kingdom Watch Set')
      .setColor(0xFFD700)
      .setDescription(`The bot will automatically send **5 pings** the moment ROKSTATS announces **Kingdom ${kd}** is open.`)
      .addFields(
        { name: '🏰 Kingdom', value: `KD **${kd}**`, inline: true },
        { name: '🔔 Channel', value: `${channel}`, inline: true },
        { name: '📢 Ping', value: role ? `${role}` : '@everyone', inline: true },
      )
      .setFooter({ text: 'Use /kingdom-alert disable kd:' + kd + ' to cancel' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'list') {
    const watches = listWatchesForGuild(guildId);

    if (watches.length === 0) {
      return interaction.reply({
        content: '📋 No kingdoms are being watched. Use `/kingdom-alert add kd:<number>` to set one up.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Kingdom Watch List')
      .setColor(0x5865F2)
      .setDescription(
        watches.map(w =>
          `• **KD ${w.kd}** → <#${w.channelId}> ${w.roleId ? `<@&${w.roleId}>` : '@everyone'}`
        ).join('\n')
      )
      .setFooter({ text: 'Pings fire automatically when ROKSTATS announces the kingdom is open' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'disable') {
    const kd = interaction.options.getInteger('kd');

    if (kd) {
      const removed = removeWatch(kd, guildId);
      if (!removed) {
        return interaction.reply({
          content: `ℹ️ KD **${kd}** wasn't being watched in this server.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: `✅ No longer watching for KD **${kd}**.`,
        ephemeral: true,
      });
    }

    const count = removeAllWatches(guildId);
    if (count === 0) {
      return interaction.reply({
        content: '⚠️ No active kingdom watches found in this server.',
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: `✅ Disabled all **${count}** kingdom watch${count !== 1 ? 'es' : ''} for this server.`,
      ephemeral: true,
    });
  }
}

module.exports = { command, execute };
