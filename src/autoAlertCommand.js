const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');
const { getWatches, listWatchesForGuild } = require('./kingdomWatchlist');

const SOURCE_CHANNEL_ID = '1492068518236258445';

const command = new SlashCommandBuilder()
  .setName('auto-alert')
  .setDescription('Auto-detect kingdom openings and trigger 5 pings automatically')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Configure auto-detection from the ROKSTATS channel')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to send the 5 kingdom pings to')
          .setRequired(true)
      )
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Role to ping (default: @everyone)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Stop auto-detecting kingdom openings')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Check current auto-alert configuration')
  )
  .addSubcommand(sub =>
    sub.setName('watchlist')
      .setDescription('See all kingdoms currently being watched in this server')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'setup') {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');

    db.setAutoAlertConfig(guildId, {
      target_channel_id: channel.id,
      role_id: role?.id ?? null,
      enabled: 1,
    });

    const embed = new EmbedBuilder()
      .setTitle('✅ Auto Kingdom Alert Configured')
      .setColor(0xFFD700)
      .setDescription('The bot will now watch for kingdom opening messages and automatically send 5 pings.')
      .addFields(
        { name: '📡 Watching', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true },
        { name: '🔔 Pinging in', value: `${channel}`, inline: true },
        { name: '👥 Mention', value: role ? `${role}` : '@everyone', inline: true },
      )
      .setFooter({ text: 'Detects messages like "Kingdom 4103 is now open!"' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'disable') {
    db.disableAutoAlert(guildId);
    return interaction.reply({ content: '✅ Auto kingdom alerts have been disabled.', ephemeral: true });
  }

  if (sub === 'status') {
    const config = db.getAutoAlertConfig(guildId);
    if (!config || !config.enabled) {
      return interaction.reply({ content: '⚠️ Auto kingdom alerts are not configured. Use `/auto-alert setup`.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📡 Auto Alert Status')
      .setColor(0x57F287)
      .addFields(
        { name: 'Status', value: '🟢 Active', inline: true },
        { name: 'Watching', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true },
        { name: 'Pinging in', value: `<#${config.target_channel_id}>`, inline: true },
        { name: 'Mention', value: config.role_id ? `<@&${config.role_id}>` : '@everyone', inline: true },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'watchlist') {
    const watches = listWatchesForGuild(guildId);
    if (watches.length === 0) {
      return interaction.reply({
        content: '📋 No kingdoms are being watched in this server. Use `/kingdom-alert kd:4125` to add one.',
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

function extractKingdomNumber(message) {
  const parts = [message.content || ''];

  for (const embed of (message.embeds || [])) {
    parts.push(
      embed.title || '',
      embed.description || '',
      embed.footer?.text || '',
      embed.author?.name || '',
    );
    for (const field of (embed.fields || [])) {
      parts.push(field.name || '', field.value || '');
    }
  }

  const patterns = [
    /Kingdom\s*(\d+)\s+is\s+now\s+open/i,
    /Kingdom\s*(\d+)\s+(?:has\s+)?opened/i,
    /Kingdom\s*(\d+)/i,
  ];

  for (const text of parts) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
  }
  return null;
}

const activePings = new Map();

async function handleAutoAlert(message) {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.author?.bot && !message.webhookId) return;

  const kdNumber = extractKingdomNumber(message);
  if (!kdNumber) return;

  console.log(`[AutoAlert] Kingdom ${kdNumber} detected in source channel.`);

  async function firePings(channelId, roleId, label) {
    const alertKey = channelId;
    if (activePings.has(alertKey)) {
      console.log(`[AutoAlert] Skipping ${label} — alert already running in channel ${channelId}.`);
      return;
    }

    const channel = await message.client.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const mention = roleId ? `<@&${roleId}>` : '@everyone';
    const pingMessage = `${mention} **(${kdNumber}) Kingdom Has Now Open** 🏰⚔️`;

    let count = 0;
    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        if (!activePings.has(alertKey)) return;
        try {
          await channel.send(pingMessage);
        } catch (err) {
          console.error(`[AutoAlert] Failed ping ${count + 1} for ${label}:`, err);
        }
        count++;
        if (count < 5) {
          scheduleNext();
        } else {
          activePings.delete(alertKey);
          console.log(`[AutoAlert] Finished 5 pings for KD ${kdNumber} (${label})`);
        }
      }, count === 0 ? 0 : 12000);

      activePings.set(alertKey, timeout);
    };

    scheduleNext();
  }

  const allGuilds = db.getAllAutoAlertConfigs();
  for (const config of allGuilds) {
    if (!config.enabled) continue;
    try {
      await firePings(config.target_channel_id, config.role_id, `guild-auto:${config.guild_id}`);
    } catch (err) {
      console.error(`[AutoAlert] Error for guild ${config.guild_id}:`, err);
    }
  }

  const watches = getWatches(kdNumber);
  for (const watch of watches) {
    try {
      await firePings(watch.channelId, watch.roleId, `watch:guild-${watch.guildId}-kd${kdNumber}`);
    } catch (err) {
      console.error(`[AutoAlert] Error for watch entry guild ${watch.guildId} kd ${kdNumber}:`, err);
    }
  }
}

module.exports = { command, execute, handleAutoAlert };
