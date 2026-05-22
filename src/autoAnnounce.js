const { EmbedBuilder } = require('discord.js');

const SOURCE_CHANNEL_ID = '1492068518236258445';
const TARGET_CHANNEL_ID = '1492091669288452238';

function extractKingdomNumber(message) {
  const parts = [
    message.content || '',
  ];

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

  const openingPatterns = [
    /Kingdom\s*(\d+)\s+is\s+now\s+open/i,
    /Kingdom\s*(\d+)\s+(?:has\s+)?opened/i,
    /Kingdom\s*(\d+)/i,
  ];

  for (const text of parts) {
    for (const pattern of openingPatterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
  }
  return null;
}

function registerAutoAnnounce(client) {
  client.on('messageCreate', async (message) => {
    if (message.channelId !== SOURCE_CHANNEL_ID) return;

    const isBot = message.author?.bot;
    const isWebhook = !!message.webhookId;
    if (!isBot && !isWebhook) return;

    const kingdomNumber = extractKingdomNumber(message);
    if (!kingdomNumber) return;

    console.log(`[AutoAnnounce] Kingdom ${kingdomNumber} detected — sending announcement...`);

    try {
      const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
      if (!targetChannel) {
        console.warn('[AutoAnnounce] Target channel not found.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`🚨 Kingdom ${kingdomNumber} Is Now Open! 🚨`)
        .setDescription(
          `Kingdom **${kingdomNumber}** has just opened!\nGet ready and move in fast!`
        )
        .setTimestamp()
        .setFooter({ text: `Kingdom ${kingdomNumber} • Auto Announcement` });

      await targetChannel.send({ embeds: [embed] });
      console.log(`[AutoAnnounce] Announcement sent for Kingdom ${kingdomNumber}.`);
    } catch (err) {
      console.error('[AutoAnnounce] Failed to send announcement:', err);
    }
  });
}

module.exports = { registerAutoAnnounce };
