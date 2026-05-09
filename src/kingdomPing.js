const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const pendingPings = new Map();

function registerKingdomPing(client) {
  client.on('messageCreate', async (message) => {
    if (!message.author.bot) return;

    for (const [key, pingData] of pendingPings.entries()) {
      const { kingdomId, targetChannelId, customMessage, guildId } = pingData;

      if (message.guildId !== guildId) continue;

      const embedDescription = message.embeds?.[0]?.description || '';
      const embedTitle = message.embeds?.[0]?.title || '';
      const fullText = embedTitle + ' ' + embedDescription;

      const match = fullText.match(/Kingdom\s+(\d+)/i);
      if (!match) continue;

      const announcedKingdom = match[1];
      if (announcedKingdom !== kingdomId) continue;

      try {
        const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
        if (targetChannel) {
          await targetChannel.send(customMessage);
        }
      } catch (err) {
        console.error('Failed to send Kingdom Ping:', err);
      }

      pendingPings.delete(key);
    }
  });
}

const command = new SlashCommandBuilder()
  .setName('kingdom-ping')
  .setDescription('Wait for a Kingdom announcement and send a custom message')
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel to send the message in')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('kingdom-id')
      .setDescription('The Kingdom number to watch for (e.g. 4130)')
      .setRequired(true)
  )
  .addStringOption(opt =>
    opt.setName('message')
      .setDescription('The message to send when the Kingdom opens')
      .setRequired(true)
  );

async function execute(interaction) {
  const channel = interaction.options.getChannel('channel');
  const kingdomId = interaction.options.getString('kingdom-id').trim();
  const customMessage = interaction.options.getString('message');

  if (!/^\d+$/.test(kingdomId)) {
    return interaction.reply({ content: 'Kingdom ID must be a number (e.g. `4130`).', ephemeral: true });
  }

  const key = `${interaction.guildId}-${kingdomId}-${interaction.user.id}`;

  pendingPings.set(key, {
    kingdomId,
    targetChannelId: channel.id,
    customMessage,
    guildId: interaction.guildId,
  });

  await interaction.reply({
    content: `Got it! I'll send your message in ${channel} when Kingdom **${kingdomId}** opens.`,
    ephemeral: true,
  });
}

module.exports = { command, execute, registerKingdomPing };
