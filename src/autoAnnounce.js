const { EmbedBuilder } = require('discord.js');

const SOURCE_CHANNEL_ID = '1492068518236258445';
const TARGET_CHANNEL_ID = '1492091669288452238';

function extractKingdomNumber(message) {
  const parts = [
    message.content || '',
    message.embeds?.[0]?.title || '',
    message.embeds?.[0]?.description || '',
    message.embeds?.[0]?.footer?.text || '',
  ];

  for (const text of parts) {
    const match = text.match(/Kingdom\s*(\d+)/i);
    if (match) return match[1];
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
