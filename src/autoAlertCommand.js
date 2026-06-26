const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

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

  const allGuilds = db.getAllAutoAlertConfigs();

  for (const config of allGuilds) {
    if (!config.enabled) continue;

    const alertKey = `${config.guild_id}-${config.target_channel_id}`;
    if (activePings.has(alertKey)) {
      console.log(`[AutoAlert] Skipping guild ${config.guild_id} — alert already running.`);
      continue;
    }

    try {
      const channel = await message.client.channels.fetch(config.target_channel_id).catch(() => null);
      if (!channel) continue;

      const mention = config.role_id ? `<@&${config.role_id}>` : '@everyone';
      const pingMessage = `${mention} **(${kdNumber}) Kingdom Has Now Open** 🏰⚔️`;

      let count = 0;
      const scheduleNext = () => {
        const timeout = setTimeout(async () => {
          if (!activePings.has(alertKey)) return;
          try {
            await channel.send(pingMessage);
          } catch (err) {
            console.error(`[AutoAlert] Failed ping ${count + 1} for guild ${config.guild_id}:`, err);
          }
          count++;
          if (count < 5) {
            scheduleNext();
          } else {
            activePings.delete(alertKey);
            console.log(`[AutoAlert] Finished 5 pings for KD ${kdNumber} in guild ${config.guild_id}`);
          }
        }, count === 0 ? 0 : 12000);

        activePings.set(alertKey, timeout);
      };

      scheduleNext();
    } catch (err) {
      console.error(`[AutoAlert] Error for guild ${config.guild_id}:`, err);
    }
  }
}

module.exports = { command, execute, handleAutoAlert };
