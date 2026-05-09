const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');

const MAIN_SERVER_ID = '1485393766411141274';

function isMainServer(interaction) {
  return interaction.guildId === MAIN_SERVER_ID;
}

const projectRegistration = {
  command: new SlashCommandBuilder()
    .setName('project-registration')
    .setDescription('Register a new project')
    .addStringOption(opt =>
      opt.setName('project-name').setDescription('Name of the project').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('kingdom').setDescription('Kingdom number or name').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('date').setDescription('Project date (e.g. 2025-05-09)').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('link').setDescription('Link to the project').setRequired(true)
    ),

  async execute(interaction) {
    if (!isMainServer(interaction)) {
      return interaction.reply({ content: 'This command is only available in the main server.', ephemeral: true });
    }

    const name = interaction.options.getString('project-name').trim();
    const kingdom = interaction.options.getString('kingdom').trim();
    const date = interaction.options.getString('date').trim();
    const link = interaction.options.getString('link').trim();
    const owner_id = interaction.user.id;
    const owner_tag = interaction.user.tag;

    const existing = db.getProject(name);
    if (existing) {
      return interaction.reply({ content: `A project named **${name}** already exists.`, ephemeral: true });
    }

    try {
      db.addProject({ name, kingdom, date, link, owner_id, owner_tag });
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('Project Registered!')
            .addFields(
              { name: 'Project Name', value: name },
              { name: 'Kingdom', value: kingdom },
              { name: 'Date', value: date },
              { name: 'Link', value: link },
              { name: 'Owner', value: owner_tag }
            )
        ]
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Failed to register project.', ephemeral: true });
    }
  }
};

const projectList = {
  command: new SlashCommandBuilder()
    .setName('project-list')
    .setDescription('List all registered projects'),

  async execute(interaction) {
    if (!isMainServer(interaction)) {
      return interaction.reply({ content: 'This command is only available in the main server.', ephemeral: true });
    }

    const total = db.countProjects();
    if (total === 0) {
      return interaction.reply({ content: 'No projects have been registered yet.', ephemeral: true });
    }

    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    let page = 0;

    function buildEmbed(p) {
      const projects = db.getProjects(p * PAGE_SIZE, PAGE_SIZE);
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Registered Projects')
        .setFooter({ text: `Page ${p + 1} of ${totalPages}` });

      for (const proj of projects) {
        embed.addFields({
          name: `📌 ${proj.name}`,
          value: `**Kingdom:** ${proj.kingdom}\n**Date:** ${proj.date}\n**Link:** ${proj.link}\n**Owner:** ${proj.owner_tag}`,
        });
      }
      return embed;
    }

    function buildRow(p) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPages - 1)
      );
    }

    const msg = await interaction.reply({
      embeds: [buildEmbed(page)],
      components: [buildRow(page)],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'Only the command user can navigate pages.', ephemeral: true });
      }
      if (btn.customId === 'prev' && page > 0) page--;
      if (btn.customId === 'next' && page < totalPages - 1) page++;
      await btn.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  }
};

const projectEdit = {
  command: new SlashCommandBuilder()
    .setName('project-edit')
    .setDescription('Edit your registered project')
    .addStringOption(opt =>
      opt.setName('project-name').setDescription('Name of the project to edit').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('new-name').setDescription('New project name').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('kingdom').setDescription('New kingdom').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('date').setDescription('New date').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('link').setDescription('New link').setRequired(false)
    ),

  async execute(interaction) {
    if (!isMainServer(interaction)) {
      return interaction.reply({ content: 'This command is only available in the main server.', ephemeral: true });
    }

    const name = interaction.options.getString('project-name').trim();
    const project = db.getProject(name);

    if (!project) {
      return interaction.reply({ content: `No project found with name **${name}**.`, ephemeral: true });
    }

    if (project.owner_id !== interaction.user.id) {
      return interaction.reply({ content: 'You Are Not Owner Of The Project Registration!', ephemeral: true });
    }

    const updates = {};
    const newName = interaction.options.getString('new-name');
    const kingdom = interaction.options.getString('kingdom');
    const date = interaction.options.getString('date');
    const link = interaction.options.getString('link');

    if (newName) updates.name = newName.trim();
    if (kingdom) updates.kingdom = kingdom.trim();
    if (date) updates.date = date.trim();
    if (link) updates.link = link.trim();

    if (Object.keys(updates).length === 0) {
      return interaction.reply({ content: 'No changes provided.', ephemeral: true });
    }

    db.updateProject(name, updates);

    const updated = db.getProject(updates.name || name);
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('Project Updated!')
          .addFields(
            { name: 'Project Name', value: updated.name },
            { name: 'Kingdom', value: updated.kingdom },
            { name: 'Date', value: updated.date },
            { name: 'Link', value: updated.link },
            { name: 'Owner', value: updated.owner_tag }
          )
      ],
      ephemeral: true,
    });
  }
};

const deleteProject = {
  command: new SlashCommandBuilder()
    .setName('delete-project')
    .setDescription('Delete a registered project (Admin only)')
    .addStringOption(opt =>
      opt.setName('project-name').setDescription('Name of the project to delete').setRequired(true)
    )
    .setDefaultMemberPermissions(0x8),

  async execute(interaction) {
    if (!isMainServer(interaction)) {
      return interaction.reply({ content: 'This command is only available in the main server.', ephemeral: true });
    }

    const name = interaction.options.getString('project-name').trim();
    const project = db.getProject(name);

    if (!project) {
      return interaction.reply({ content: `No project found with name **${name}**.`, ephemeral: true });
    }

    db.deleteProject(name);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('Project Deleted')
          .setDescription(`**${name}** has been removed from the project list.`)
      ]
    });
  }
};

const projectSearch = {
  command: new SlashCommandBuilder()
    .setName('project-search')
    .setDescription('Search projects by name or kingdom')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Keyword to search (project name or kingdom number)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isMainServer(interaction)) {
      return interaction.reply({ content: 'This command is only available in the main server.', ephemeral: true });
    }

    const query = interaction.options.getString('query').trim();
    const results = db.searchProjects(query);

    if (results.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xEB459E)
            .setTitle('No Results Found')
            .setDescription(`No projects matched **${query}**.`)
        ],
        ephemeral: true,
      });
    }

    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(results.length / PAGE_SIZE);
    let page = 0;

    function buildEmbed(p) {
      const slice = results.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
      const embed = new EmbedBuilder()
        .setColor(0xEB459E)
        .setTitle(`Search Results for "${query}"`)
        .setFooter({ text: `${results.length} result(s) — Page ${p + 1} of ${totalPages}` });

      for (const proj of slice) {
        embed.addFields({
          name: `🔍 ${proj.name}`,
          value: `**Kingdom:** ${proj.kingdom}\n**Date:** ${proj.date}\n**Link:** ${proj.link}\n**Owner:** ${proj.owner_tag}`,
        });
      }
      return embed;
    }

    function buildRow(p) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('search_prev')
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('search_next')
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPages - 1)
      );
    }

    const components = totalPages > 1 ? [buildRow(page)] : [];

    const msg = await interaction.reply({
      embeds: [buildEmbed(page)],
      components,
      fetchReply: true,
    });

    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({ time: 120_000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({ content: 'Only the command user can navigate pages.', ephemeral: true });
      }
      if (btn.customId === 'search_prev' && page > 0) page--;
      if (btn.customId === 'search_next' && page < totalPages - 1) page++;
      await btn.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });

    collector.on('end', () => {
      msg.edit({ components: [] }).catch(() => {});
    });
  }
};

module.exports = { projectRegistration, projectList, projectEdit, deleteProject, projectSearch };
