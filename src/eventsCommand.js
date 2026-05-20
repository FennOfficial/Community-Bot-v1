const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const command = new SlashCommandBuilder()
  .setName('events')
  .setDescription('Show upcoming Rise of Kingdoms global events with countdowns');

const EVENTS = [
  { name: 'Sunset Canyon', emoji: '🌅', dayOfWeek: 1, hour: 8, durationHours: 12, desc: 'PvP arena — top rankings earn gems & speedups' },
  { name: 'Sunset Canyon', emoji: '🌅', dayOfWeek: 3, hour: 8, durationHours: 12, desc: 'PvP arena — top rankings earn gems & speedups' },
  { name: 'Sunset Canyon', emoji: '🌅', dayOfWeek: 5, hour: 8, durationHours: 12, desc: 'PvP arena — top rankings earn gems & speedups' },
  { name: 'Wheel of Fortune', emoji: '🎡', dayOfWeek: 0, hour: 0, durationHours: 48, desc: 'Spend keys for rare rewards including sculptures' },
  { name: 'Wheel of Fortune', emoji: '🎡', dayOfWeek: 3, hour: 0, durationHours: 48, desc: 'Spend keys for rare rewards including sculptures' },
  { name: 'Lost Kingdom (KvK)', emoji: '⚔️', dayOfWeek: 4, hour: 0, durationHours: 72, desc: 'Kingdom vs Kingdom — fight for the Ark of Osiris' },
  { name: 'Ceroli Crisis', emoji: '🏰', dayOfWeek: 2, hour: 14, durationHours: 2, desc: 'Co-op PvE challenge — clear waves for rewards' },
  { name: 'Ceroli Crisis', emoji: '🏰', dayOfWeek: 6, hour: 14, durationHours: 2, desc: 'Co-op PvE challenge — clear waves for rewards' },
  { name: 'Mightiest Governor', emoji: '👑', dayOfWeek: 5, hour: 0, durationHours: 72, desc: 'Individual power & kill competition' },
  { name: 'Gathering of Heroes', emoji: '🦸', dayOfWeek: 1, hour: 0, durationHours: 48, desc: 'Recruit legendary commanders via events' },
  { name: 'Alliance Clash', emoji: '🛡️', dayOfWeek: 6, hour: 10, durationHours: 4, desc: 'Alliance vs Alliance territory battle' },
];

function getNextOccurrence(dayOfWeek, hour) {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  const daysUntil = (dayOfWeek - now.getUTCDay() + 7) % 7;
  if (daysUntil === 0 && now >= next) {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + daysUntil);
  }
  return next;
}

function formatCountdown(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

async function execute(interaction) {
  const now = new Date();

  const upcoming = EVENTS
    .map(event => {
      const next = getNextOccurrence(event.dayOfWeek, event.hour);
      const msUntil = next - now;
      return { ...event, next, msUntil };
    })
    .filter((e, i, arr) => {
      const first = arr.findIndex(x => x.name === e.name && x.msUntil === Math.min(...arr.filter(y => y.name === e.name).map(y => y.msUntil)));
      return i === first;
    })
    .sort((a, b) => a.msUntil - b.msUntil)
    .slice(0, 8);

  const fields = upcoming.map(event => {
    const countdown = formatCountdown(event.msUntil);
    const timestamp = Math.floor(event.next.getTime() / 1000);
    return {
      name: `${event.emoji} ${event.name}`,
      value: `${event.desc}\n⏳ Starts in **${countdown}** (<t:${timestamp}:F>)`,
      inline: false,
    };
  });

  const embed = new EmbedBuilder()
    .setTitle('📅 Upcoming ROK Events')
    .setColor(0xFFD700)
    .setDescription('All times are in UTC. Events repeat weekly.')
    .addFields(fields)
    .setFooter({ text: 'Kingdom Bot • Rise of Kingdoms' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { command, execute };
