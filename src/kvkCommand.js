const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('kvk')
  .setDescription('KvK season tracker')
  .addSubcommand(sub =>
    sub.setName('register')
      .setDescription('Register a player for the current KvK season')
      .addStringOption(opt => opt.setName('governor').setDescription('Governor name').setRequired(true))
      .addStringOption(opt => opt.setName('alliance').setDescription('Alliance tag (e.g. ROK)').setRequired(true))
      .addIntegerOption(opt => opt.setName('kingdom').setDescription('Kingdom number').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('score')
      .setDescription('Update a player\'s KvK score')
      .addStringOption(opt => opt.setName('governor').setDescription('Governor name').setRequired(true))
      .addIntegerOption(opt => opt.setName('kill_points').setDescription('Total kill points').setRequired(true))
      .addIntegerOption(opt => opt.setName('t4_kills').setDescription('T4 kills').setRequired(false))
      .addIntegerOption(opt => opt.setName('t5_kills').setDescription('T5 kills').setRequired(false))
      .addIntegerOption(opt => opt.setName('deaths').setDescription('Total deaths').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('leaderboard')
      .setDescription('Show top 10 players by kill points this season')
  )
  .addSubcommand(sub =>
    sub.setName('reset')
      .setDescription('Reset all KvK scores for a new season (Admin only)')
      .addStringOption(opt => opt.setName('season').setDescription('New season name (e.g. KvK Season 4)').setRequired(true))
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'register') {
    const governor = interaction.options.getString('governor');
    const alliance = interaction.options.getString('alliance');
    const kingdom = interaction.options.getInteger('kingdom');

    const existing = db.getKvkPlayer(governor);
    if (existing) {
      return interaction.reply({ content: `⚠️ **${governor}** is already registered this season. Use \`/kvk score\` to update their points.`, ephemeral: true });
    }

    db.addKvkPlayer({ governor, alliance, kingdom, registered_by: interaction.user.id });

    const embed = new EmbedBuilder()
      .setTitle('⚔️ KvK Player Registered')
      .setColor(0xFFD700)
      .addFields(
        { name: 'Governor', value: governor, inline: true },
        { name: 'Alliance', value: `[${alliance}]`, inline: true },
        { name: 'Kingdom', value: `#${kingdom}`, inline: true },
      )
      .setFooter({ text: `Registered by ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'score') {
    const governor = interaction.options.getString('governor');
    const killPoints = interaction.options.getInteger('kill_points');
    const t4Kills = interaction.options.getInteger('t4_kills') ?? 0;
    const t5Kills = interaction.options.getInteger('t5_kills') ?? 0;
    const deaths = interaction.options.getInteger('deaths') ?? 0;

    const player = db.getKvkPlayer(governor);
    if (!player) {
      return interaction.reply({ content: `⚠️ **${governor}** is not registered. Use \`/kvk register\` first.`, ephemeral: true });
    }

    db.updateKvkScore(governor, { kill_points: killPoints, t4_kills: t4Kills, t5_kills: t5Kills, deaths });

    const embed = new EmbedBuilder()
      .setTitle('📊 Score Updated')
      .setColor(0xFFD700)
      .addFields(
        { name: 'Governor', value: governor, inline: true },
        { name: 'Kill Points', value: killPoints.toLocaleString(), inline: true },
        { name: 'Deaths', value: deaths.toLocaleString(), inline: true },
        { name: 'T4 Kills', value: t4Kills.toLocaleString(), inline: true },
        { name: 'T5 Kills', value: t5Kills.toLocaleString(), inline: true },
      )
      .setFooter({ text: `Updated by ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'leaderboard') {
    const season = db.getCurrentKvkSeason();
    const players = db.getKvkLeaderboard();

    if (!players.length) {
      return interaction.reply({ content: 'No players registered for this season yet. Use `/kvk register` to add players.', ephemeral: true });
    }

    const medals = ['🥇', '🥈', '🥉'];
    const rows = players.map((p, i) => {
      const medal = medals[i] ?? `**${i + 1}.**`;
      return `${medal} **${p.governor}** [${p.alliance}] — ${p.kill_points.toLocaleString()} KP | T5: ${p.t5_kills.toLocaleString()} | Deaths: ${p.deaths.toLocaleString()}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ KvK Leaderboard — ${season}`)
      .setColor(0xFFD700)
      .setDescription(rows.join('\n'))
      .setFooter({ text: 'Ranked by Kill Points' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'reset') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Only administrators can reset the KvK season.', ephemeral: true });
    }

    const season = interaction.options.getString('season');
    db.resetKvkSeason(season);

    const embed = new EmbedBuilder()
      .setTitle('🔄 KvK Season Reset')
      .setColor(0xFF4444)
      .setDescription(`All scores have been cleared.\nNew season: **${season}**`)
      .setFooter({ text: `Reset by ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
}

module.exports = { command, execute };
