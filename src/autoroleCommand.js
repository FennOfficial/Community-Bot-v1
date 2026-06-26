const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('autorole')
  .setDescription('Automatically assign roles when members join')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add a role to auto-assign on join')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to auto-assign').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove a role from auto-assign')
      .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show all auto-assigned roles')
  );

async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (sub === 'add') {
    const role = interaction.options.getRole('role');
    db.addAutorole(guildId, role.id);
    return interaction.reply({ content: `✅ ${role} will now be auto-assigned to new members.`, ephemeral: true });
  }

  if (sub === 'remove') {
    const role = interaction.options.getRole('role');
    db.removeAutorole(guildId, role.id);
    return interaction.reply({ content: `✅ ${role} will no longer be auto-assigned.`, ephemeral: true });
  }

  if (sub === 'list') {
    const roleIds = db.getAutoroles(guildId);
    if (!roleIds.length) {
      return interaction.reply({ content: '⚠️ No auto-roles configured. Use `/autorole add` to add one.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎭 Auto-Roles')
      .setDescription(roleIds.map(id => `<@&${id}>`).join('\n'))
      .setColor(0x5865F2);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleMemberJoin(member) {
  const roleIds = db.getAutoroles(member.guild.id);
  if (!roleIds.length) return;

  for (const roleId of roleIds) {
    await member.roles.add(roleId).catch(() => {});
  }
}

module.exports = { command, execute, handleMemberJoin };
