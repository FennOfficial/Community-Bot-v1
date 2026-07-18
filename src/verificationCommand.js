const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, PermissionFlagsBits,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Tesseract = require('tesseract.js');
const db = require('./database');

// ─────────────────────────────────────────────
// Slash command definition
// ─────────────────────────────────────────────
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
      .setDescription('Auto-verify members by reading alliance from their screenshot')
      .addChannelOption(opt =>
        opt.setName('channel').setDescription('Channel where members post screenshots').setRequired(true)
      )
      .addRoleOption(opt =>
        opt.setName('role').setDescription('Verified role to assign on success').setRequired(true)
      )
      .addChannelOption(opt =>
        opt.setName('log-channel').setDescription('Log channel for approved/denied events (optional)').setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disable verification in this server')
  );

// ─────────────────────────────────────────────
// Shared UI builders
// ─────────────────────────────────────────────
function buildAllianceMenuEmbed(guildId) {
  const alliances = db.getImageVerifyAlliances(guildId);
  const list = alliances.length
    ? alliances.map(a => `• \`[${a.tag}]\` **${a.name}**${a.role_id ? `  →  <@&${a.role_id}>` : ''}`).join('\n')
    : '*No alliances registered yet. Click **Add** to register one.*';

  return new EmbedBuilder()
    .setTitle('👑 Kingdom Verification Menu')
    .setDescription(`**List Alliance**\n${list}`)
    .setColor(0xFFD700)
    .setFooter({ text: 'Admins only • Changes apply immediately' });
}

function buildAllianceMenuRow(guildId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`imgv_add_${guildId}`)
      .setLabel('Add')
      .setStyle(ButtonStyle.Success)
      .setEmoji('➕'),
    new ButtonBuilder()
      .setCustomId(`imgv_del_${guildId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️'),
  );
}

// ─────────────────────────────────────────────
// OCR via tesseract.js (offline, no API limits)
// ─────────────────────────────────────────────
function downloadImage(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));

    const ext = url.split('?')[0].match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[1] || 'jpg';
    const tmpFile = path.join(os.tmpdir(), `rok_verify_${Date.now()}.${ext}`);
    const file = fs.createWriteStream(tmpFile);
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    }, (res) => {
      // Follow HTTP redirects
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        file.close();
        fs.unlink(tmpFile, () => {});
        return downloadImage(res.headers.location, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(tmpFile, () => {});
        return reject(new Error(`HTTP ${res.statusCode} — ${url.slice(0, 80)}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(tmpFile); });
      file.on('error', (e) => { fs.unlink(tmpFile, () => {}); reject(e); });
    });

    req.on('error', (e) => { fs.unlink(tmpFile, () => {}); reject(e); });
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

async function performOCR(imageUrl) {
  let tmpFile = null;
  try {
    console.log(`[OCR] Downloading: ${imageUrl.slice(0, 100)}`);
    tmpFile = await downloadImage(imageUrl);
    console.log(`[OCR] Running tesseract on: ${tmpFile}`);
    const { data: { text } } = await Tesseract.recognize(tmpFile, 'eng', { logger: () => {} });
    console.log(`[OCR] Extracted ${text?.length ?? 0} chars`);
    return text || null;
  } catch (e) {
    console.error(`[OCR] FAILED — ${e.message}`);
    return null;
  } finally {
    if (tmpFile) fs.unlink(tmpFile, () => {});
  }
}

// Parse ROK Governor Profile OCR output.
// Based on the Governor Profile layout:
//   Governor(ID: 84156168)
//   Shagie X Lxae              ← player name (line right after)
//   Alliance
//   [VFoV]V For Vendetta       ← [TAG]Alliance Name
//
// Tesseract commonly garbles ']' as 'I', 'l', '|', ')' — fallback handles this.
function parseROKProfile(text) {
  if (!text) return null;

  // ── Governor ID ──────────────────────────────
  const governorID = text.match(/Governor\s*\(?\s*ID[:\s]*([0-9]+)\)?/i)?.[1] || null;

  // ── Governor (player) name ────────────────────
  // Anchored to the closing ')' of the Governor(ID:...) line,
  // then takes the very next non-empty line as the name.
  let playerName = null;
  const lines = text.split(/[\r\n]+/);
  for (let i = 0; i < lines.length; i++) {
    if (/Governor\s*\(?\s*ID/i.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        const candidate = lines[j].trim();
        if (
          candidate.length > 1 &&
          !/^[\d,\.]+$/.test(candidate) &&
          !/^(alliance|kill|power|civilization|acclaim)/i.test(candidate)
        ) {
          // Strip common OCR noise chars and trailing edit/copy icons
          playerName = candidate.replace(/[✦◆○●✎✏⊙☆★]/g, '').trim();
          break;
        }
      }
      break;
    }
  }

  // ── Alliance tag & name ───────────────────────
  // First try clean regex — proper closing bracket
  let allianceTag = null;
  let allianceName = null;

  const cleanMatch = text.match(/\[([A-Za-z0-9]{1,5})\]\s*(.{1,60})/);
  if (cleanMatch) {
    allianceTag = cleanMatch[1].toUpperCase();
    allianceName = cleanMatch[2].split(/\s{2,}|\t/)[0].trim(); // stop at big whitespace (table columns)
  } else {
    // Fallback: tesseract often reads ']' as 'I', 'l', '|', ')', '1'
    const noisyMatch = text.match(/\[([A-Za-z0-9]{1,5})[\|Il\)1]/);
    if (noisyMatch) {
      allianceTag = noisyMatch[1].toUpperCase();
    }
  }

  return { governorID, playerName, allianceTag, allianceName };
}

// ─────────────────────────────────────────────
// /verify-setup command executor
// ─────────────────────────────────────────────
async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  // ── Button mode (unchanged) ──────────────────
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

    return interaction.reply({
      content: `✅ Button verification set up in ${channel}. Members who click it will get ${role}.`,
      ephemeral: true,
    });
  }

  // ── Image / Auto-verify mode ─────────────────
  if (sub === 'image') {
    const verifyChannel = interaction.options.getChannel('channel');
    const role = interaction.options.getRole('role');
    const logChannel = interaction.options.getChannel('log-channel') ?? null;

    db.setImageVerifyConfig(guildId, {
      verify_channel_id: verifyChannel.id,
      verified_role_id: role.id,
      log_channel_id: logChannel?.id ?? null,
    });

    // Post panel in verify channel
    const panelEmbed = new EmbedBuilder()
      .setTitle('📸 Account Verification 📸')
      .setDescription(
        'To verify your account, please send a **screenshot** of your game account in this channel.\n\n' +
        'This is **Auto-verification**, please provide a clear image of your account.'
      )
      .setColor(0xFFD700)
      .setFooter({ text: 'Ascendant Guardians • Auto Verification' });

    await verifyChannel.send({ embeds: [panelEmbed] });

    // Send alliance management menu as the slash command reply (single message, not duplicate)
    const menuEmbed = buildAllianceMenuEmbed(guildId);
    const menuRow = buildAllianceMenuRow(guildId);

    await interaction.reply({
      content: `✅ Auto-verification set up!\n• Members submit screenshots in ${verifyChannel}\n• Verified role: ${role}${logChannel ? `\n• Log channel: ${logChannel}` : ''}\n\nManage alliances below:`,
      embeds: [menuEmbed],
      components: [menuRow],
    });

    const menuMsg = await interaction.fetchReply();
    db.updateImageVerifyConfigMenu(guildId, interaction.channelId, menuMsg.id);
  }

  // ── Disable ──────────────────────────────────
  if (sub === 'disable') {
    db.setVerificationConfig(guildId, { mode: 'disabled' });
    return interaction.reply({ content: '✅ Verification has been disabled.', ephemeral: true });
  }
}

// ─────────────────────────────────────────────
// Button: "Verify Me" (button mode, unchanged)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// Manual accept/decline (legacy button mode)
// ─────────────────────────────────────────────
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
    await interaction.client.users.fetch(userId)
      .then(u => u.send(`✅ Your verification in **${interaction.guild.name}** has been **approved**!`))
      .catch(() => {});
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
  await interaction.client.users.fetch(userId)
    .then(u => u.send(`❌ Your verification in **${interaction.guild.name}** was **declined**. Please contact an admin.`))
    .catch(() => {});
}

// ─────────────────────────────────────────────
// Alliance menu — [Add] button → open modal
// ─────────────────────────────────────────────
async function handleImgVerifyAdd(interaction) {
  const guildId = interaction.guildId;
  const modal = new ModalBuilder()
    .setCustomId(`imgv_add_modal_${guildId}`)
    .setTitle('Add Alliance');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('alliance_tag')
        .setLabel('Alliance Tag (e.g. AG, KOC)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(5)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('alliance_name')
        .setLabel('Alliance Name (full name)')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(80)
        .setRequired(true)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('alliance_role')
        .setLabel('Alliance Role ID (optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('Right-click role → Copy ID, or leave blank')
    ),
  );

  await interaction.showModal(modal);
}

// ─────────────────────────────────────────────
// Alliance menu — [Delete] button → open modal
// ─────────────────────────────────────────────
async function handleImgVerifyDelete(interaction) {
  const guildId = interaction.guildId;
  const modal = new ModalBuilder()
    .setCustomId(`imgv_del_modal_${guildId}`)
    .setTitle('Delete Alliance');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('alliance_tag')
        .setLabel('Alliance Tag to remove')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(5)
        .setRequired(true)
    ),
  );

  await interaction.showModal(modal);
}

// ─────────────────────────────────────────────
// Helpers to refresh the menu message
// ─────────────────────────────────────────────
async function refreshMenu(client, guildId) {
  const config = db.getImageVerifyConfig(guildId);
  if (!config?.menu_channel_id || !config?.menu_message_id) return;
  try {
    const ch = await client.channels.fetch(config.menu_channel_id);
    const msg = await ch.messages.fetch(config.menu_message_id);
    await msg.edit({
      embeds: [buildAllianceMenuEmbed(guildId)],
      components: [buildAllianceMenuRow(guildId)],
    });
  } catch {
    // Menu message may have been deleted — ignore
  }
}

// ─────────────────────────────────────────────
// Add modal submit
// ─────────────────────────────────────────────
async function handleImgVerifyAddModal(interaction) {
  const guildId = interaction.guildId;
  const tag = interaction.fields.getTextInputValue('alliance_tag').trim().toUpperCase();
  const name = interaction.fields.getTextInputValue('alliance_name').trim();
  const roleIdRaw = interaction.fields.getTextInputValue('alliance_role').trim();
  const roleId = roleIdRaw || null;

  if (!/^[A-Z0-9]{1,5}$/.test(tag)) {
    return interaction.reply({ content: '❌ Alliance tag must be 1–5 uppercase letters/numbers (e.g. `AG`).', ephemeral: true });
  }

  db.addImageVerifyAlliance(guildId, tag, name, roleId);
  await refreshMenu(interaction.client, guildId);
  return interaction.reply({
    content: `✅ Alliance **[${tag}] ${name}** has been added.${roleId ? ` Alliance role: <@&${roleId}>` : ''}`,
    ephemeral: true,
  });
}

// ─────────────────────────────────────────────
// Delete modal submit
// ─────────────────────────────────────────────
async function handleImgVerifyDeleteModal(interaction) {
  const guildId = interaction.guildId;
  const tag = interaction.fields.getTextInputValue('alliance_tag').trim().toUpperCase();

  const removed = db.deleteImageVerifyAlliance(guildId, tag);
  await refreshMenu(interaction.client, guildId);

  if (!removed) {
    return interaction.reply({ content: `ℹ️ No alliance with tag **[${tag}]** found.`, ephemeral: true });
  }
  return interaction.reply({ content: `✅ Alliance **[${tag}]** has been removed.`, ephemeral: true });
}

// ─────────────────────────────────────────────
// Auto-verification: image posted in verify ch
// ─────────────────────────────────────────────
async function handleImageSubmission(message) {
  if (message.author.bot) return;

  // ── Legacy button mode (old admin-review flow) ──
  const oldConfig = db.getVerificationConfig(message.guildId);
  if (oldConfig?.mode === 'image' && message.channelId === oldConfig.verify_channel_id) {
    const images = message.attachments.filter(a => a.contentType?.startsWith('image/'));
    if (!images.size) return;
    const adminChannel = await message.client.channels.fetch(oldConfig.admin_channel_id).catch(() => null);
    if (!adminChannel) return;
    const embed = new EmbedBuilder()
      .setTitle('📸 New Verification Submission')
      .setDescription(`**User:** ${message.author} (${message.author.tag})\n**ID:** ${message.author.id}`)
      .setImage(images.first().url)
      .setColor(0xFFD700)
      .setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`verify_accept_${message.author.id}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`verify_decline_${message.author.id}`).setLabel('Decline').setStyle(ButtonStyle.Danger).setEmoji('❌'),
    );
    await adminChannel.send({ embeds: [embed], components: [row] });
    await message.react('📨').catch(() => {});
    return;
  }

  // ── New auto-OCR mode ────────────────────────
  const config = db.getImageVerifyConfig(message.guildId);
  if (!config) return;
  if (message.channelId !== config.verify_channel_id) return;

  const images = message.attachments.filter(a => a.contentType?.startsWith('image/'));
  if (!images.size) {
    // Non-image message in verify channel — delete it silently
    await message.delete().catch(() => {});
    return;
  }

  const imageUrl = images.first().url;
  const member = message.member;
  const guildName = message.guild.name;

  // Delete the submission immediately
  await message.delete().catch(() => {});

  // Status message in verify channel (auto-deleted later)
  const statusMsg = await message.channel.send({
    content: `🔍 <@${message.author.id}> — Analyzing your screenshot, please wait...`,
  }).catch(() => null);

  try {
    const ocrText = await performOCR(imageUrl);

    if (!ocrText) {
      await statusMsg?.delete().catch(() => {});
      await message.author.send(
        `❌ **Verification Failed** in **${guildName}**\n\nWe couldn't read your screenshot. Please make sure the image is clear and try again.`
      ).catch(() => {});
      await logEvent(message.client, config, '❌ OCR Failed', message.author, null, null, 'Could not extract text from image.');
      return;
    }

    const parsed = parseROKProfile(ocrText);
    const alliances = db.getImageVerifyAlliances(message.guildId);

    const matched = parsed?.allianceTag
      ? alliances.find(a => a.tag.toUpperCase() === parsed.allianceTag.toUpperCase())
      : null;

    const playerName = parsed?.playerName || message.author.username;

    await statusMsg?.delete().catch(() => {});

    if (!matched) {
      const knownTags = alliances.map(a => `\`[${a.tag}]\``).join(', ') || '*None set*';
      await message.author.send(
        `❌ **Verification Failed** in **${guildName}**\n\n` +
        `Your alliance was not found in our registered list.\n` +
        `**Detected tag:** \`[${parsed?.allianceTag || 'none'}]\`\n` +
        `**Registered alliances:** ${knownTags}\n\n` +
        `If you believe this is a mistake, please contact an admin.`
      ).catch(() => {});
      await logEvent(message.client, config, '❌ Alliance Not Matched', message.author, null,
        ocrText.slice(0, 300),
        `Detected tag: [${parsed?.allianceTag || 'none'}] | Name: ${parsed?.playerName || 'none'}`
      );
      return;
    }

    // ── Give verified role ───────────────────────
    try {
      await member.roles.add(config.verified_role_id);
    } catch {
      await message.author.send(`❌ **Verification** — Role assignment failed in **${guildName}**. Please contact an admin.`).catch(() => {});
      return;
    }

    // ── Give alliance-specific role if set ────────
    if (matched.role_id) {
      await member.roles.add(matched.role_id).catch(() => {});
    }

    // ── Rename nickname: [TAG] PlayerName ─────────
    const newNick = `[${matched.tag}] ${playerName}`.slice(0, 32);
    await member.setNickname(newNick).catch(() => {});

    // ── DM success ────────────────────────────────
    await message.author.send(
      `✅ **Verification Approved** in **${guildName}**!\n\n` +
      `Welcome, **${newNick}**!\n` +
      `Your alliance **[${matched.tag}] ${matched.name}** was verified.\n` +
      `Your nickname has been updated to \`${newNick}\`.`
    ).catch(() => {});

    // ── Log ───────────────────────────────────────
    await logEvent(message.client, config, '✅ Verified', message.author, matched,
      ocrText.slice(0, 300),
      `In-game name: ${playerName} | Nickname set to: ${newNick}`
    );

  } catch (err) {
    console.error('[ImageVerify] Error during auto-verification:', err);
    await statusMsg?.delete().catch(() => {});
  }
}

// ─────────────────────────────────────────────
// Log helper
// ─────────────────────────────────────────────
async function logEvent(client, config, title, user, alliance, rawText, notes) {
  if (!config.log_channel_id) return;
  try {
    const ch = await client.channels.fetch(config.log_channel_id);
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(title.startsWith('✅') ? 0x57F287 : 0xED4245)
      .addFields(
        { name: 'Member', value: `${user} (${user.tag})`, inline: true },
        { name: 'ID', value: user.id, inline: true },
      )
      .setTimestamp();

    if (alliance) {
      embed.addFields({ name: 'Alliance', value: `[${alliance.tag}] ${alliance.name}`, inline: true });
    }
    if (notes) {
      embed.addFields({ name: 'Notes', value: notes.slice(0, 500) });
    }

    await ch.send({ embeds: [embed] });
  } catch {
    // Log channel might be inaccessible
  }
}

// ─────────────────────────────────────────────
// /verify-manage command
// ─────────────────────────────────────────────
const manageCommand = new SlashCommandBuilder()
  .setName('verify-manage')
  .setDescription('Reopen the alliance management menu')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function executeManage(interaction) {
  const config = db.getImageVerifyConfig(interaction.guildId);
  if (!config) {
    return interaction.reply({
      content: '⚠️ Image verification is not set up yet. Use `/verify-setup image` first.',
      ephemeral: true,
    });
  }

  const embed = buildAllianceMenuEmbed(interaction.guildId);
  const row = buildAllianceMenuRow(interaction.guildId);

  await interaction.reply({ embeds: [embed], components: [row] });
  const msg = await interaction.fetchReply();
  db.updateImageVerifyConfigMenu(interaction.guildId, interaction.channelId, msg.id);
}

module.exports = {
  command,
  execute,
  manageCommand,
  executeManage,
  handleVerifyButton,
  handleVerifyAccept,
  handleVerifyDecline,
  handleImageSubmission,
  handleImgVerifyAdd,
  handleImgVerifyDelete,
  handleImgVerifyAddModal,
  handleImgVerifyDeleteModal,
};
