const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Spam 5 pings over 1 minute announcing a kingdom is now open')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
  );

const activePings = new Map();

async function execute(interaction) {
  const kd = interaction.options.getInteger('kd');
  const channel = interaction.options.getChannel('channel') ?? interaction.channel;
  const role = interaction.options.getRole('role');
  const mention = role ? `<@&${role.id}>` : '@everyone';
  const alertKey = `${interaction.guildId}-${channel.id}`;

  if (activePings.has(alertKey)) {
    return interaction.reply({
      content: `⚠️ An alert is already running in ${channel}. Wait for it to finish.`,
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `✅ Starting **5 kingdom alerts** for KD **${kd}** in ${channel} — sending one every 12 seconds.`,
    ephemeral: true,
  });

  const message = `${mention} **(${kd}) Kingdom Has Now Open** 🏰⚔️`;

  let count = 0;
  activePings.set(alertKey, true);

  const send = async () => {
    try {
      await channel.send(message);
    } catch (err) {
      console.error(`[KingdomAlert] Failed to send ping ${count + 1}:`, err);
    }

    count++;
    if (count < 5) {
      setTimeout(send, 12000);
    } else {
      activePings.delete(alertKey);
      console.log(`[KingdomAlert] Finished 5 pings for KD ${kd} in ${channel.id}`);
    }
  };

  send();
}

module.exports = { command, execute };
