const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Manage kingdom opening alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Spam 5 pings over 1 minute announcing a kingdom is now open')
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
      )
  )
  .addSubcommand(sub =>
    sub.setName('stop')
      .setDescription('Cancel any running kingdom alert in a channel')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to stop the alert in (default: this channel)')
          .setRequired(false)
      )
  );

const activePings = new Map();

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    const kd = interaction.options.getInteger('kd');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const role = interaction.options.getRole('role');
    const mention = role ? `<@&${role.id}>` : '@everyone';
    const alertKey = `${interaction.guildId}-${channel.id}`;

    if (activePings.has(alertKey)) {
      return interaction.reply({
        content: `⚠️ An alert is already running in ${channel}. Use \`/kingdom-alert stop\` to cancel it first.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `✅ Starting **5 kingdom alerts** for KD **${kd}** in ${channel} — one every 12 seconds.`,
      ephemeral: true,
    });

    const message = `${mention} **(${kd}) Kingdom Has Now Open** 🏰⚔️`;
    let count = 0;

    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        if (!activePings.has(alertKey)) return;

        try {
          await channel.send(message);
        } catch (err) {
          console.error(`[KingdomAlert] Failed to send ping ${count + 1}:`, err);
        }

        count++;
        if (count < 5) {
          scheduleNext();
        } else {
          activePings.delete(alertKey);
          console.log(`[KingdomAlert] Finished 5 pings for KD ${kd} in ${channel.id}`);
        }
      }, count === 0 ? 0 : 12000);

      activePings.set(alertKey, timeout);
    };

    scheduleNext();
    return;
  }

  if (sub === 'stop') {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const alertKey = `${interaction.guildId}-${channel.id}`;

    if (!activePings.has(alertKey)) {
      return interaction.reply({
        content: `ℹ️ No active kingdom alert running in ${channel}.`,
        ephemeral: true,
      });
    }

    clearTimeout(activePings.get(alertKey));
    activePings.delete(alertKey);

    return interaction.reply({
      content: `🛑 Kingdom alert in ${channel} has been **stopped**.`,
      ephemeral: true,
    });
  }
}

module.exports = { command, execute };
