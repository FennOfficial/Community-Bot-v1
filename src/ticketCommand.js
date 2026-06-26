const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType
} = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Ticket system management')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Set up the ticket system')
      .addChannelOption(opt => opt.setName('panel-channel').setDescription('Channel to post the ticket panel').setRequired(true))
      .addRoleOption(opt => opt.setName('support-role').setDescription('Role that can see tickets').setRequired(true))
      .addChannelOption(opt => opt.setName('category').setDescription('Category to create ticket channels in').setRequired(false))
      .addChannelOption(opt => opt.setName('log-channel').setDescription('Channel to log ticket events').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('close')
      .setDescription('Close the current ticket channel')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'setup') {
    const panelChannel = interaction.options.getChannel('panel-channel');
    const supportRole = interaction.options.getRole('support-role');
    const category = interaction.options.getChannel('category');
    const logChannel = interaction.options.getChannel('log-channel');

    const embed = new EmbedBuilder()
      .setTitle('🎫 Support Tickets')
      .setDescription('Need help? Click the button below to open a private support ticket.\nOur team will assist you as soon as possible.')
      .setColor(0x5865F2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_open')
        .setLabel('Open a Ticket')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎫')
    );

    const sent = await panelChannel.send({ embeds: [embed], components: [row] });

    db.setTicketConfig(guildId, {
      support_role_id: supportRole.id,
      category_id: category?.id ?? null,
      log_channel_id: logChannel?.id ?? null,
      panel_channel_id: panelChannel.id,
      panel_message_id: sent.id,
    });

    return interaction.reply({ content: `✅ Ticket system set up in ${panelChannel}. Support role: ${supportRole}.`, ephemeral: true });
  }

  if (sub === 'close') {
    const ticket = db.getTicketByChannel(interaction.channelId);
    if (!ticket) {
      return interaction.reply({ content: '❌ This channel is not a ticket.', ephemeral: true });
    }

    await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
    db.closeTicket(interaction.channelId);

    const config = db.getTicketConfig(guildId);
    if (config?.log_channel_id) {
      const logChannel = await interaction.client.channels.fetch(config.log_channel_id).catch(() => null);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle('🎫 Ticket Closed')
          .setDescription(`**Channel:** ${interaction.channel.name}\n**User:** <@${ticket.user_id}>\n**Closed by:** ${interaction.user}`)
          .setColor(0xED4245)
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    }

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  }
}

async function handleTicketOpen(interaction) {
  const guildId = interaction.guildId;
  const config = db.getTicketConfig(guildId);
  if (!config) {
    return interaction.reply({ content: '⚠️ Tickets are not configured properly.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const permissionOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: config.support_role_id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  try {
    const channelOptions = {
      name: channelName,
      type: ChannelType.GuildText,
      permissionOverwrites,
    };
    if (config.category_id) channelOptions.parent = config.category_id;

    const channel = await interaction.guild.channels.create(channelOptions);
    db.openTicket(guildId, interaction.user.id, channel.id);

    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket Opened')
      .setDescription(`Hello ${interaction.user}! A staff member will be with you shortly.\n\nTo close this ticket, use \`/ticket close\` or click the button below.`)
      .setColor(0x5865F2)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close_btn')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    );

    await channel.send({ content: `<@${interaction.user.id}> <@&${config.support_role_id}>`, embeds: [embed], components: [row] });

    if (config.log_channel_id) {
      const logChannel = await interaction.client.channels.fetch(config.log_channel_id).catch(() => null);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🎫 Ticket Opened')
          .setDescription(`**User:** ${interaction.user} (${interaction.user.tag})\n**Channel:** ${channel}`)
          .setColor(0x57F287)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    await interaction.editReply({ content: `✅ Your ticket has been opened: ${channel}` });
  } catch (err) {
    console.error('[Ticket] Failed to create ticket:', err);
    await interaction.editReply({ content: '❌ Failed to create ticket channel. Make sure I have the right permissions.' });
  }
}

async function handleTicketCloseBtn(interaction) {
  const ticket = db.getTicketByChannel(interaction.channelId);
  if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });

  await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
  db.closeTicket(interaction.channelId);

  const config = db.getTicketConfig(interaction.guildId);
  if (config?.log_channel_id) {
    const logChannel = await interaction.client.channels.fetch(config.log_channel_id).catch(() => null);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket Closed')
        .setDescription(`**Channel:** ${interaction.channel.name}\n**User:** <@${ticket.user_id}>\n**Closed by:** ${interaction.user}`)
        .setColor(0xED4245)
        .setTimestamp();
      await logChannel.send({ embeds: [embed] });
    }
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

module.exports = { command, execute, handleTicketOpen, handleTicketCloseBtn };
