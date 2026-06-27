const { getWatches } = require('./kingdomWatchlist');

const SOURCE_CHANNEL_ID = '1492068518236258445';

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

const activePings = new Map();

async function handleAutoAlert(message) {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.author?.bot && !message.webhookId) return;

  const kdNumber = extractKingdomNumber(message);
  if (!kdNumber) return;

  console.log(`[AutoAlert] Kingdom ${kdNumber} detected in source channel.`);

  const watches = getWatches(kdNumber);
  if (watches.length === 0) return;

  for (const watch of watches) {
    const alertKey = watch.channelId;

    if (activePings.has(alertKey)) {
      console.log(`[AutoAlert] Skipping guild ${watch.guildId} KD ${kdNumber} — already pinging in that channel.`);
      continue;
    }

    activePings.set(alertKey, null);

    const channel = await message.client.channels.fetch(watch.channelId).catch(() => null);
    if (!channel) {
      activePings.delete(alertKey);
      continue;
    }

    const mention = watch.roleId ? `<@&${watch.roleId}>` : '@everyone';
    const pingMessage = `${mention} **(${kdNumber}) Kingdom Has Now Open** 🏰⚔️`;

    let count = 0;
    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        if (!activePings.has(alertKey)) return;
        try {
          await channel.send(pingMessage);
        } catch (err) {
          console.error(`[AutoAlert] Failed ping ${count + 1} for KD ${kdNumber} guild ${watch.guildId}:`, err);
        }
        count++;
        if (count < 5) {
          scheduleNext();
        } else {
          activePings.delete(alertKey);
          console.log(`[AutoAlert] Finished 5 pings for KD ${kdNumber} in guild ${watch.guildId}`);
        }
      }, count === 0 ? 0 : 12000);

      activePings.set(alertKey, timeout);
    };

    scheduleNext();
  }
}

module.exports = { handleAutoAlert };
