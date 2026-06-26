const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addWatch, removeWatch, listWatchesForGuild } = require('./kingdomWatchlist');

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Manage kingdom opening alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Immediately spam 5 pings announcing a kingdom is NOW open')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom ID (e.g. 4103)')
          .setRequired(true)
          .setMinValue(1)
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to send alerts in (default: this channel)')
          .setRequired(false)
      )
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Role to ping (default: @everyone)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('stop')
      .setDescription('Cancel any running kingdom alert in a channel')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to stop the alert in (default: this channel)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('watch')
      .setDescription('Watch for a kingdom to open — pings automatically when ROKSTATS announces it')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number to watch (e.g. 4125)')
          .setRequired(true)
          .setMinValue(1)
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to ping in (default: auto-alert channel or this channel)')
          .setRequired(false)
      )
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Role to ping (default: @everyone)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('unwatch')
      .setDescription('Remove a kingdom from your watch list')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number to stop watching')
          .setRequired(true)
          .setMinValue(1)
      )
  )
  .addSubcommand(sub =>
    sub.setName('watchlist')
      .setDescription('See all kingdoms currently being watched in this server')
  );

const activePings = new Map();

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const kd = interaction.options.getInteger('kd');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const role = interaction.options.getRole('role');
    const mention = role ? `<@&${role.id}>` : '@everyone';
    const alertKey = `${interaction.guildId}-${channel.id}`;

    if (activePings.has(alertKey)) {
      return interaction.reply({
        content: `⚠️ An alert is already running in ${channel}. Use \`/kingdom-alert stop\` to cancel it first.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `✅ Starting **5 kingdom alerts** for KD **${kd}** in ${channel} — one every 12 seconds.`,
      ephemeral: true,
    });

    const message = `${mention} **(${kd}) Kingdom Has Now Open** 🏰⚔️`;
    let count = 0;

    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        if (!activePings.has(alertKey)) return;

        try {
          await channel.send(message);
        } catch (err) {
          console.error(`[KingdomAlert] Failed to send ping ${count + 1}:`, err);
        }

        count++;
        if (count < 5) {
          scheduleNext();
        } else {
          activePings.delete(alertKey);
          console.log(`[KingdomAlert] Finished 5 pings for KD ${kd} in ${channel.id}`);
        }
      }, count === 0 ? 0 : 12000);

      activePings.set(alertKey, timeout);
    };

    scheduleNext();
    return;
  }

  if (sub === 'stop') {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const alertKey = `${interaction.guildId}-${channel.id}`;

    if (!activePings.has(alertKey)) {
      return interaction.reply({
        content: `ℹ️ No active kingdom alert running in ${channel}.`,
        ephemeral: true,
      });
    }

    clearTimeout(activePings.get(alertKey));
    activePings.delete(alertKey);

    return interaction.reply({
      content: `🛑 Kingdom alert in ${channel} has been **stopped**.`,
      ephemeral: true,
    });
  }

  if (sub === 'watch') {
    const kd = interaction.options.getInteger('kd');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const role = interaction.options.getRole('role');

    addWatch(kd, interaction.guildId, channel.id, role?.id ?? null);

    const embed = new EmbedBuilder()
      .setTitle('👁️ Kingdom Watch Set')
      .setColor(0xFFD700)
      .setDescription(`The bot will automatically send **5 pings** the moment ROKSTATS announces **Kingdom ${kd}** is open.`)
      .addFields(
        { name: '🏰 Watching For', value: `KD **${kd}**`, inline: true },
        { name: '🔔 Pinging in', value: `${channel}`, inline: true },
        { name: '👥 Mention', value: role ? `${role}` : '@everyone', inline: true },
      )
      .setFooter({ text: 'Use /kingdom-alert unwatch to cancel' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'unwatch') {
    const kd = interaction.options.getInteger('kd');
    const removed = removeWatch(kd, interaction.guildId);

    if (!removed) {
      return interaction.reply({
        content: `ℹ️ You weren't watching KD **${kd}** in this server.`,
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: `✅ No longer watching for KD **${kd}**.`,
      ephemeral: true,
    });
  }

  if (sub === 'watchlist') {
    const watches = listWatchesForGuild(interaction.guildId);

    if (watches.length === 0) {
      return interaction.reply({
        content: '📋 No kingdoms are being watched in this server. Use `/kingdom-alert watch` to add one.',
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
}

module.exports = { command, execute };
