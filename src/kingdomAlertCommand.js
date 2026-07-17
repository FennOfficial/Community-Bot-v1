const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

const command = new SlashCommandBuilder()
  .setName('kingdom-alert')
  .setDescription('Manage kingdom opening alerts')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Watch for a specific kingdom to open and auto-send a message')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number to watch (e.g. 1001)')
          .setRequired(true)
          .setMinValue(1)
      )
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to send the alert in')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('message')
          .setDescription('Custom message to send (optional — leave blank for default embed)')
          .setRequired(false)
      )
      .addBooleanOption(opt =>
        opt.setName('spam')
          .setDescription('Spam 5 pings 12s apart? (default: false)')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show all active kingdom alerts set in this server')
  )
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete a kingdom alert watch')
      .addIntegerOption(opt =>
        opt.setName('kd')
          .setDescription('Kingdom number to stop watching')
          .setRequired(true)
          .setMinValue(1)
      )
  );

function getWatchesForGuild(guildId) {
  return db.prepare(`SELECT * FROM kd_alert_watches WHERE guild_id = ? ORDER BY created_at DESC`).all(guildId);
}

function addWatch(guildId, userId, kdNumber, channelId, customMessage, spam) {
  db.prepare(`
    INSERT INTO kd_alert_watches (guild_id, user_id, kd_number, channel_id, custom_message, spam)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, String(kdNumber), channelId, customMessage ?? null, spam ? 1 : 0);
}

function deleteWatch(guildId, kdNumber) {
  const result = db.prepare(`
    DELETE FROM kd_alert_watches WHERE guild_id = ? AND kd_number = ?
  `).run(guildId, String(kdNumber));
  return result.changes > 0;
}

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'set') {
    const kd = interaction.options.getInteger('kd');
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message') ?? null;
    const spam = interaction.options.getBoolean('spam') ?? false;

    const existing = db.prepare(`SELECT id FROM kd_alert_watches WHERE guild_id = ? AND kd_number = ?`).get(guildId, String(kd));
    if (existing) {
      db.prepare(`UPDATE kd_alert_watches SET channel_id=?, custom_message=?, spam=?, user_id=? WHERE id=?`)
        .run(channel.id, message, spam ? 1 : 0, interaction.user.id, existing.id);
    } else {
      addWatch(guildId, interaction.user.id, kd, channel.id, message, spam);
    }

    const embed = new EmbedBuilder()
      .setTitle('👁️ Kingdom Alert Set')
      .setColor(0xFFD700)
      .setDescription(`The bot will send an alert the moment **Kingdom ${kd}** opens in the ROKSTATS channel.`)
      .addFields(
        { name: '🏰 Kingdom', value: `KD **${kd}**`, inline: true },
        { name: '🔔 Channel', value: `${channel}`, inline: true },
        { name: '📢 Spam Mode', value: spam ? '✅ Yes (5×)' : '❌ No (1×)', inline: true },
        { name: '💬 Message', value: message ?? '*Default embed*', inline: false },
      )
      .setFooter({ text: 'Use /kingdom-alert delete to cancel' });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'list') {
    const watches = getWatchesForGuild(guildId);
    if (watches.length === 0) {
      return interaction.reply({
        content: '📋 No kingdom alerts set. Use `/kingdom-alert set` to add one.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Kingdom Alert List')
      .setColor(0x5865F2)
      .setDescription(
        watches.map(w =>
          `• **KD ${w.kd_number}** → <#${w.channel_id}> | Spam: ${w.spam ? 'Yes' : 'No'}${w.custom_message ? ` | Msg: *${w.custom_message.slice(0, 40)}*` : ''}`
        ).join('\n')
      )
      .setFooter({ text: `${watches.length} active alert${watches.length !== 1 ? 's' : ''}` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'delete') {
    const kd = interaction.options.getInteger('kd');
    const removed = deleteWatch(guildId, kd);
    if (!removed) {
      return interaction.reply({ content: `ℹ️ No alert found for KD **${kd}** in this server.`, ephemeral: true });
    }
    return interaction.reply({ content: `✅ Kingdom alert for KD **${kd}** has been removed.`, ephemeral: true });
  }
}

module.exports = { command, execute };
