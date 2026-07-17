const { EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'data.db'));

const SOURCE_CHANNEL_ID = '1492068518236258445';

function extractKingdomNumber(message) {
  const parts = [message.content || ''];
  for (const embed of (message.embeds || [])) {
    parts.push(
      embed.title || '',
      embed.description || '',
      embed.footer?.text || '',
      embed.author?.name || '',
    );
    for (const field of (embed.fields || [])) {
      parts.push(field.name || '', field.value || '');
    }
  }

  const patterns = [
    /Kingdom\s*(\d+)\s+is\s+now\s+open/i,
    /Kingdom\s*(\d+)\s+(?:has\s+)?opened/i,
    /Kingdom\s*#?(\d+)/i,
  ];

  for (const text of parts) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
  }
  return null;
}

function formatDuration(seconds) {
  if (seconds <= 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.length ? parts.join(' ') : '< 1m';
}

function getTimingStats() {
  const rows = db.prepare(`SELECT opened_at FROM kd_history ORDER BY opened_at DESC LIMIT 20`).all();

  let timeSinceLast = '—';
  let avgTime = '—';

  if (rows.length >= 1) {
    const now = Math.floor(Date.now() / 1000);
    timeSinceLast = formatDuration(now - rows[0].opened_at);
  }

  if (rows.length >= 2) {
    const intervals = [];
    for (let i = 0; i < rows.length - 1; i++) {
      intervals.push(rows[i].opened_at - rows[i + 1].opened_at);
    }
    const avgSecs = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    avgTime = formatDuration(avgSecs);
  }

  return { timeSinceLast, avgTime };
}

function recordOpening(kdNumber) {
  db.prepare(`INSERT INTO kd_history (kd_number) VALUES (?)`).run(String(kdNumber));
}

function getWatchesForKd(kdNumber) {
  return db.prepare(`SELECT * FROM kd_alert_watches WHERE kd_number = ?`).all(String(kdNumber));
}

const activeSpams = new Map();

async function sendAlert(client, watch, kdNumber, timeSinceLast, avgTime) {
  const alertKey = `${watch.guild_id}-${watch.channel_id}-${kdNumber}`;
  if (activeSpams.has(alertKey)) return;

  activeSpams.set(alertKey, null);

  const channel = await client.channels.fetch(watch.channel_id).catch(() => null);
  if (!channel) {
    activeSpams.delete(alertKey);
    return;
  }

  let content;
  if (watch.custom_message) {
    content = watch.custom_message.replace('{kd}', kdNumber);
  } else {
    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(`Kingdom ${kdNumber} is now open!`)
      .addFields(
        { name: 'Time since last KD opening', value: `**${timeSinceLast}**`, inline: false },
        { name: 'Total Avg time for KD openings', value: `**${avgTime}**`, inline: false },
      )
      .setFooter({ text: 'Powered by ROKSTATS • Ascendant Guardians' })
      .setTimestamp();

    const sendEmbed = async () => channel.send({ embeds: [embed] });

    if (!watch.spam) {
      await sendEmbed().catch(() => {});
      activeSpams.delete(alertKey);
      return;
    }

    let count = 0;
    const scheduleNext = () => {
      const timeout = setTimeout(async () => {
        if (!activeSpams.has(alertKey)) return;
        await sendEmbed().catch(err => console.error(`[KDDetector] Spam ping ${count + 1} failed:`, err));
        count++;
        if (count < 5) {
          scheduleNext();
        } else {
          activeSpams.delete(alertKey);
        }
      }, count === 0 ? 0 : 12000);
      activeSpams.set(alertKey, timeout);
    };
    scheduleNext();
    return;
  }

  const sendText = async () => channel.send({ content }).catch(() => {});

  if (!watch.spam) {
    await sendText();
    activeSpams.delete(alertKey);
    return;
  }

  let count = 0;
  const scheduleNext = () => {
    const timeout = setTimeout(async () => {
      if (!activeSpams.has(alertKey)) return;
      await sendText().catch(err => console.error(`[KDDetector] Spam ping ${count + 1} failed:`, err));
      count++;
      if (count < 5) {
        scheduleNext();
      } else {
        activeSpams.delete(alertKey);
      }
    }, count === 0 ? 0 : 12000);
    activeSpams.set(alertKey, timeout);
  };
  scheduleNext();
}

async function handleKingdomDetector(message) {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;
  if (!message.author?.bot && !message.webhookId) return;

  const kdNumber = extractKingdomNumber(message);
  if (!kdNumber) return;

  console.log(`[KDDetector] Kingdom ${kdNumber} detected.`);

  const { timeSinceLast, avgTime } = getTimingStats();
  recordOpening(kdNumber);

  const watches = getWatchesForKd(kdNumber);
  if (watches.length === 0) return;

  for (const watch of watches) {
    try {
      await sendAlert(message.client, watch, kdNumber, timeSinceLast, avgTime);
    } catch (err) {
      console.error(`[KDDetector] Error sending alert for KD ${kdNumber} guild ${watch.guild_id}:`, err);
    }
  }
}

module.exports = { handleKingdomDetector };
