const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const GIVEAWAY_EMOJI = '🎉';

const command = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a new giveaway')
      .addStringOption(opt => opt.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addStringOption(opt =>
        opt.setName('duration')
          .setDescription('Duration (e.g. 1h, 30m, 2d)')
          .setRequired(true)
      )
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default 1)').setRequired(false).setMinValue(1).setMaxValue(20))
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in (default: current channel)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('end')
      .setDescription('End a giveaway early and pick winners')
      .addStringOption(opt => opt.setName('message-id').setDescription('Message ID of the giveaway (leave blank for latest)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('reroll')
      .setDescription('Reroll a winner for a finished giveaway')
      .addStringOption(opt => opt.setName('message-id').setDescription('Message ID of the giveaway (leave blank for latest)').setRequired(false))
  );

function parseDuration(str) {
  const map = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  return parseInt(match[1]) * (map[match[2].toLowerCase()] ?? 0);
}

function buildGiveawayEmbed(prize, endTime, winnerCount, hostId, ended = false, winners = null) {
  const embed = new EmbedBuilder()
    .setTitle(`${GIVEAWAY_EMOJI} GIVEAWAY ${GIVEAWAY_EMOJI}`)
    .setColor(ended ? 0x95a5a6 : 0xFF6B6B)
    .addFields(
      { name: '🎁 Prize', value: prize, inline: true },
      { name: '🏆 Winners', value: `${winnerCount}`, inline: true },
      { name: '👤 Hosted by', value: `<@${hostId}>`, inline: true },
      { name: ended ? '⏱️ Ended' : '⏰ Ends', value: `<t:${endTime}:R> (<t:${endTime}:f>)`, inline: false },
    )
    .setFooter({ text: ended ? 'Giveaway ended' : `React with ${GIVEAWAY_EMOJI} to enter!` });

  if (ended && winners) {
    embed.addFields({ name: '🎉 Winners', value: winners.length ? winners.map(id => `<@${id}>`).join(', ') : 'No valid participants.' });
  }

  return embed;
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'start') {
    const prize = interaction.options.getString('prize');
    const durationStr = interaction.options.getString('duration');
    const winnerCount = interaction.options.getInteger('winners') ?? 1;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    const durationSecs = parseDuration(durationStr);
    if (!durationSecs) {
      return interaction.reply({ content: '❌ Invalid duration. Use format like `1h`, `30m`, `2d`.', ephemeral: true });
    }

    const endTime = Math.floor(Date.now() / 1000) + durationSecs;

    const embed = buildGiveawayEmbed(prize, endTime, winnerCount, interaction.user.id);
    const msg = await channel.send({ embeds: [embed] });
    await msg.react(GIVEAWAY_EMOJI);

    const result = db.createGiveaway({ guildId, channelId: channel.id, prize, endTime, winnerCount, hostId: interaction.user.id });
    db.setGiveawayMessageId(result.lastInsertRowid, msg.id);

    return interaction.reply({ content: `✅ Giveaway started in ${channel}!`, ephemeral: true });
  }

  if (sub === 'end' || sub === 'reroll') {
    const messageId = interaction.options.getString('message-id');
    const giveaway = messageId ? db.getGiveawayByMessage(messageId) : db.getLatestGiveaway(guildId);

    if (!giveaway) {
      return interaction.reply({ content: '❌ No giveaway found.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    await resolveGiveaway(interaction.client, giveaway);
    return interaction.editReply({ content: `✅ Giveaway ${sub === 'reroll' ? 'rerolled' : 'ended'}.` });
  }
}

async function resolveGiveaway(client, giveaway) {
  try {
    const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    if (!message) return;

    const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
    let users = [];
    if (reaction) {
      const fetched = await reaction.users.fetch();
      users = fetched.filter(u => !u.bot).map(u => u.id);
    }

    const winners = [];
    const pool = [...users];
    for (let i = 0; i < Math.min(giveaway.winner_count, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }

    db.endGiveaway(giveaway.id);

    const embed = buildGiveawayEmbed(giveaway.prize, giveaway.end_time, giveaway.winner_count, giveaway.host_id, true, winners);
    await message.edit({ embeds: [embed] });

    if (winners.length) {
      await channel.send(`🎉 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`);
    } else {
      await channel.send(`😔 No valid participants for **${giveaway.prize}**.`);
    }
  } catch (err) {
    console.error('[Giveaway] Failed to resolve:', err);
  }
}

async function checkGiveaways(client) {
  const expired = db.getActiveGiveaways();
  for (const giveaway of expired) {
    await resolveGiveaway(client, giveaway);
  }
}

module.exports = { command, execute, checkGiveaways };
