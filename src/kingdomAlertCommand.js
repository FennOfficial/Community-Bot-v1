const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { addWatch, removeWatch } = require('./kingdomWatchlist');

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Watch for a kingdom to open — pings automatically when ROKSTATS announces it')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(opt =>
    opt.setName('kd')
      .setDescription('Kingdom number to watch (e.g. 4125)')
      .setRequired(true)
      .setMinValue(1)
  )
  .addChannelOption(opt =>
    opt.setName('channel')
      .setDescription('Channel to send pings to (default: this channel)')
      .setRequired(false)
  )
  .addRoleOption(opt =>
    opt.setName('role')
      .setDescription('Role to ping (default: @everyone)')
      .setRequired(false)
  )
  .addBooleanOption(opt =>
    opt.setName('remove')
      .setDescription('Set to True to cancel the watch for this kingdom')
      .setRequired(false)
  );

async function execute(interaction) {
  const kd = interaction.options.getInteger('kd');
  const remove = interaction.options.getBoolean('remove') ?? false;
  const guildId = interaction.guildId;

  if (remove) {
    const removed = removeWatch(kd, guildId);
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

  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  const role = interaction.options.getRole('role');

  addWatch(kd, guildId, channel.id, role?.id ?? null);

  const embed = new EmbedBuilder()
    .setTitle('👁️ Kingdom Watch Set')
    .setColor(0xFFD700)
    .setDescription(`The bot will automatically send **5 pings** the moment ROKSTATS announces **Kingdom ${kd}** is open.`)
    .addFields(
      { name: '🏰 Watching For', value: `KD **${kd}**`, inline: true },
      { name: '🔔 Pinging in', value: `${channel}`, inline: true },
      { name: '👥 Mention', value: role ? `${role}` : '@everyone', inline: true },
    )
    .setFooter({ text: 'Run /kingdom-alert again with remove:True to cancel' });

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { command, execute };
