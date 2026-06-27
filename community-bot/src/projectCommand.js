const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const registerCommand = new SlashCommandBuilder()
  .setName('project-register')
  .setDescription('Register your migration project')
  .addStringOption(opt => opt.setName('name').setDescription('Your project name').setRequired(true))
  .addStringOption(opt => opt.setName('kd').setDescription('Destination kingdom number').setRequired(true))
  .addStringOption(opt => opt.setName('date').setDescription('Estimated arrival date (e.g. 2025-08-01)').setRequired(true))
  .addStringOption(opt => opt.setName('link').setDescription('Your server invite link').setRequired(true));

const listCommand = new SlashCommandBuilder()
  .setName('project-list')
  .setDescription('Browse all registered migration projects');

const customCommand = new SlashCommandBuilder()
  .setName('project-custom')
  .setDescription('Edit your last registered project')
  .addStringOption(opt => opt.setName('name').setDescription('New project name').setRequired(false))
  .addStringOption(opt => opt.setName('kd').setDescription('New destination kingdom').setRequired(false))
  .addStringOption(opt => opt.setName('date').setDescription('New estimated arrival date').setRequired(false))
  .addStringOption(opt => opt.setName('link').setDescription('New server invite link').setRequired(false));

const PAGE_SIZE = 10;

function buildListEmbed(projects, page, totalPages, guildId) {
  const total = db.countProjects(guildId);
  const embed = new EmbedBuilder()
    .setTitle('📋 Migration Projects')
    .setColor(0xFFD700)
    .setFooter({ text: `Page ${page}/${totalPages} • ${total} project${total !== 1 ? 's' : ''} total • Made by Ascendant Guardians` })
    .setTimestamp();

  if (projects.length === 0) {
    embed.setDescription('No projects registered yet. Use `/project-register` to add yours!');
    return embed;
  }

  const lines = projects.map((p, i) => {
    const num = (page - 1) * PAGE_SIZE + i + 1;
    return [
      `**${num}. ${p.name}**`,
      `> 🏰 KD: **${p.kd}** | 📅 Est: **${p.date}**`,
      `> 🔗 [Server Link](${p.link}) | 👤 <@${p.user_id}>`,
    ].join('\n');
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

function buildListRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`plist_back_${page}`)
      .setLabel('◀ Back')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`plist_next_${page}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages),
  );
}

async function executeRegister(interaction) {
  const name = interaction.options.getString('name');
  const kd   = interaction.options.getString('kd');
  const date = interaction.options.getString('date');
  const link = interaction.options.getString('link');

  db.registerProject(interaction.guildId, interaction.user.id, name, kd, date, link);

  const embed = new EmbedBuilder()
    .setTitle('✅ Project Registered')
    .setColor(0x57F287)
    .addFields(
      { name: '📛 Name', value: name, inline: true },
      { name: '🏰 KD', value: kd, inline: true },
      { name: '📅 Est. Date', value: date, inline: true },
      { name: '🔗 Link', value: link, inline: false },
    )
    .setFooter({ text: 'Use /project-custom to edit • Made by Ascendant Guardians' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function executeList(interaction) {
  const guildId = interaction.guildId;
  const total = db.countProjects(guildId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = 1;
  const projects = db.getProjects(guildId, 0, PAGE_SIZE);

  const embed = buildListEmbed(projects, page, totalPages, guildId);
  const row = buildListRow(page, totalPages);

  return interaction.reply({ embeds: [embed], components: total > PAGE_SIZE ? [row] : [], ephemeral: false });
}

async function executeCustom(interaction) {
  const project = db.getUserProject(interaction.guildId, interaction.user.id);
  if (!project) {
    return interaction.reply({ content: '⚠️ You have no registered project. Use `/project-register` first.', ephemeral: true });
  }

  const name = interaction.options.getString('name');
  const kd   = interaction.options.getString('kd');
  const date = interaction.options.getString('date');
  const link = interaction.options.getString('link');

  if (!name && !kd && !date && !link) {
    return interaction.reply({ content: '⚠️ Please provide at least one field to update.', ephemeral: true });
  }

  const updates = {};
  if (name) updates.name = name;
  if (kd)   updates.kd   = kd;
  if (date) updates.date = date;
  if (link) updates.link = link;

  db.updateProject(project.id, updates);

  const updated = db.getUserProject(interaction.guildId, interaction.user.id);
  const embed = new EmbedBuilder()
    .setTitle('✏️ Project Updated')
    .setColor(0x5865F2)
    .addFields(
      { name: '📛 Name', value: updated.name, inline: true },
      { name: '🏰 KD', value: updated.kd, inline: true },
      { name: '📅 Est. Date', value: updated.date, inline: true },
      { name: '🔗 Link', value: updated.link, inline: false },
    )
    .setFooter({ text: 'Made by Ascendant Guardians' })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleListButton(interaction) {
  if (!interaction.customId.startsWith('plist_')) return false;

  const [, dir, pageStr] = interaction.customId.split('_');
  let page = parseInt(pageStr);
  page = dir === 'next' ? page + 1 : page - 1;

  const guildId = interaction.guildId;
  const total = db.countProjects(guildId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  page = Math.max(1, Math.min(page, totalPages));

  const projects = db.getProjects(guildId, (page - 1) * PAGE_SIZE, PAGE_SIZE);
  const embed = buildListEmbed(projects, page, totalPages, guildId);
  const row = buildListRow(page, totalPages);

  await interaction.update({ embeds: [embed], components: [row] });
  return true;
}

module.exports = {
  registerCommand, listCommand, customCommand,
  executeRegister, executeList, executeCustom,
  handleListButton,
};
