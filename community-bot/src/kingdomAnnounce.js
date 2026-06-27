const { EmbedBuilder } = require('discord.js');
const db = require('./database');

const SOURCE_CHANNEL_ID = '1492091669288452238';

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
    /Kingdom\s*#?(\d+)/i,
  ];

  for (const text of parts) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
  }
  return null;
}

function formatTimeDiff(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600) % 24;
  const d = Math.floor(seconds / 86400);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

async function handleKingdomAnnounce(message) {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.author?.bot && !message.webhookId) return;

  const kdNumber = extractKingdomNumber(message);
  if (!kdNumber) return;

  console.log(`[CommunityBot] Kingdom ${kdNumber} detected.`);

  const now = Math.floor(Date.now() / 1000);
  const last = db.getLastKingdom();
  db.recordKingdom(kdNumber);

  let timeSinceLast = '—';
  let estimatedNext = '—';

  if (last) {
    const diffSecs = now - last.opened_at;
    timeSinceLast = formatTimeDiff(diffSecs);
    estimatedNext = `<t:${now + diffSecs}:R>`;
  }

  const configs = db.getAllAlertConfigs();

  for (const config of configs) {
    try {
      const channel = await message.client.channels.fetch(config.announce_channel_id).catch(() => null);
      if (!channel) continue;

      const mention = config.role_id ? `<@&${config.role_id}>` : '';

      const embed = new EmbedBuilder()
        .setTitle('🏰 New Kingdom Alert')
        .setColor(0xFFD700)
        .setDescription(`**Kingdom ${kdNumber}** Is Now Open!`)
        .addFields(
          { name: '⏱️ Time Since Last Kingdom Open', value: timeSinceLast, inline: true },
          { name: '🕐 Est. Next Kingdom Open', value: estimatedNext, inline: true },
        )
        .setFooter({
          text: 'Made By 𝐀𝐬𝐜𝐞𝐧𝐝𝐚𝐧𝐭 𝐆𝐮𝐚𝐫𝐝𝐢𝐚𝐧𝐬・Powered By The King\'s Codex',
          iconURL: 'https://i.imgur.com/4MX9p1V.png',
        })
        .setTimestamp();

      const content = [
        mention,
        '[Join Ascendant Guardians](https://discord.gg/NyfpHVWGmm)',
      ].filter(Boolean).join('\n');

      await channel.send({ content, embeds: [embed] });
    } catch (err) {
      console.error(`[CommunityBot] Failed to announce KD ${kdNumber} in guild ${config.guild_id}:`, err);
    }
  }
}

module.exports = { handleKingdomAnnounce };
