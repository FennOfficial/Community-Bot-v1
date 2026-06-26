const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits
} = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('verify-setup')
  .setDescription('Configure the verification system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('button')
      .setDescription('Button click → instant role')
      .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post the verify button').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role to give on verify').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('Message above the button').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('image')
      .setDescription('User submits screenshot → admin approves')
      .addChannelOption(opt => opt.setName('verify-channel').setDescription('Channel where users post their screenshots').setRequired(true))
      .addChannelOption(opt => opt.setName('admin-channel').setDescription('Channel where admins see submissions').setRequired(true))
      .addRoleOption(opt => opt.setName('role').setDescription('Role to give on approval').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disable verification in this server')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'button') {
    const channel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const msg = interaction.options.getString('message') || 'Click the button below to verify yourself and gain access to the server.';

    const embed = new EmbedBuilder()
      .setTitle('✅ Verification')
      .setDescription(msg)
      .setColor(0x57F287);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_button_click')
        .setLabel('Verify Me')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

    const sent = await channel.send({ embeds: [embed], components: [row] });

    db.setVerificationConfig(guildId, {
      mode: 'button',
      verified_role_id: role.id,
      button_message_id: sent.id,
      verify_channel_id: channel.id,
    });

    return interaction.reply({ content: `✅ Button verification set up in ${channel}. Members who click it will get ${role}.`, ephemeral: true });
  }

  if (sub === 'image') {
    const verifyChannel = interaction.options.getChannel('verify-channel');
    const adminChannel = interaction.options.getChannel('admin-channel');
    const role = interaction.options.getRole('role');

    db.setVerificationConfig(guildId, {
      mode: 'image',
      verified_role_id: role.id,
      verify_channel_id: verifyChannel.id,
      admin_channel_id: adminChannel.id,
    });

    const embed = new EmbedBuilder()
      .setTitle('📸 Account Verification')
      .setDescription('To verify your account, please send a **screenshot** of your game account in this channel.\n\nAn admin will review and approve your submission shortly.')
      .setColor(0xFFD700);

    await verifyChannel.send({ embeds: [embed] });

    return interaction.reply({ content: `✅ Image verification set up.\n• Users post screenshots in ${verifyChannel}\n• Admins review in ${adminChannel}\n• Approved users get ${role}`, ephemeral: true });
  }

  if (sub === 'disable') {
    db.setVerificationConfig(guildId, { mode: 'disabled' });
    return interaction.reply({ content: '✅ Verification has been disabled.', ephemeral: true });
  }
}

async function handleVerifyButton(interaction) {
  const config = db.getVerificationConfig(interaction.guildId);
  if (!config || config.mode !== 'button' || !config.verified_role_id) {
    return interaction.reply({ content: '⚠️ Verification is not configured. Ask an admin to use `/verify-setup button`.', ephemeral: true });
  }

  const member = interaction.member;
  if (member.roles.cache.has(config.verified_role_id)) {
    return interaction.reply({ content: '✅ You are already verified!', ephemeral: true });
  }

  try {
    await member.roles.add(config.verified_role_id);
    return interaction.reply({ content: '✅ You have been verified! Welcome to the server.', ephemeral: true });
  } catch {
    return interaction.reply({ content: '❌ Failed to assign your role. Please contact an admin.', ephemeral: true });
  }
}

async function handleVerifyAccept(interaction) {
  const [, , userId] = interaction.customId.split('_');
  const config = db.getVerificationConfig(interaction.guildId);

  try {
    const member = await interaction.guild.members.fetch(userId);
    await member.roles.add(config.verified_role_id);

    const updated = EmbedBuilder.from(interaction.message.embeds[0])
      .setColor(0x57F287)
      .setFooter({ text: `✅ Approved by ${interaction.user.tag}` });

    await interaction.message.edit({ embeds: [updated], components: [] });
    await interaction.reply({ content: `✅ Verified <@${userId}> and assigned their role.`, ephemeral: true });

    try {
      const user = await interaction.client.users.fetch(userId);
      await user.send(`✅ Your verification in **${interaction.guild.name}** has been **approved**! You now have access.`).catch(() => {});
    } catch {}
  } catch {
    await interaction.reply({ content: '❌ Could not find or assign role to that user.', ephemeral: true });
  }
}

async function handleVerifyDecline(interaction) {
  const [, , userId] = interaction.customId.split('_');

  const updated = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(0xED4245)
    .setFooter({ text: `❌ Declined by ${interaction.user.tag}` });

  await interaction.message.edit({ embeds: [updated], components: [] });
  await interaction.reply({ content: `❌ Declined verification for <@${userId}>.`, ephemeral: true });

  try {
    const user = await interaction.client.users.fetch(userId);
    await user.send(`❌ Your verification in **${interaction.guild.name}** was **declined**. Please contact an admin if you believe this is a mistake.`).catch(() => {});
  } catch {}
}

async function handleImageSubmission(message) {
  if (message.author.bot) return;

  const config = db.getVerificationConfig(message.guildId);
  if (!config || config.mode !== 'image') return;
  if (message.channelId !== config.verify_channel_id) return;

  const images = message.attachments.filter(a => a.contentType?.startsWith('image/'));
  if (!images.size) return;

  try {
    const adminChannel = await message.client.channels.fetch(config.admin_channel_id).catch(() => null);
    if (!adminChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('📸 New Verification Submission')
      .setDescription(`**User:** ${message.author} (${message.author.tag})\n**ID:** ${message.author.id}`)
      .setImage(images.first().url)
      .setColor(0xFFD700)
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`verify_accept_${message.author.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`verify_decline_${message.author.id}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );

    await adminChannel.send({ embeds: [embed], components: [row] });
    await message.react('📨').catch(() => {});
  } catch (err) {
    console.error('[Verification] Failed to forward image:', err);
  }
}

module.exports = { command, execute, handleVerifyButton, handleVerifyAccept, handleVerifyDecline, handleImageSubmission };
