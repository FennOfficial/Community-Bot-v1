const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('./database');

const command = new SlashCommandBuilder()
  .setName('points')
  .setDescription('Point store system')
  .addSubcommand(sub =>
    sub.setName('balance')
      .setDescription('Check point balance')
      .addUserOption(opt => opt.setName('user').setDescription('User to check (default: yourself)').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('give')
      .setDescription('Give points to a user (Admin only)')
      .addUserOption(opt => opt.setName('user').setDescription('User to give points to').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('take')
      .setDescription('Remove points from a user (Admin only)')
      .addUserOption(opt => opt.setName('user').setDescription('User to take points from').setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount of points').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false))
  );

const storeCommand = new SlashCommandBuilder()
  .setName('store')
  .setDescription('Browse and manage the point store')
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Browse available store items')
  )
  .addSubcommand(sub =>
    sub.setName('buy')
      .setDescription('Buy an item from the store')
      .addStringOption(opt => opt.setName('item').setDescription('Name of the item to buy').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add an item to the store (Admin only)')
      .addStringOption(opt => opt.setName('name').setDescription('Item name').setRequired(true))
      .addIntegerOption(opt => opt.setName('cost').setDescription('Cost in points').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('description').setDescription('Item description').setRequired(false))
      .addRoleOption(opt => opt.setName('role').setDescription('Role to grant on purchase').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove an item from the store (Admin only)')
      .addStringOption(opt => opt.setName('name').setDescription('Item name to remove').setRequired(true))
  );

async function executePoints(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (sub === 'balance') {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const balance = db.getPoints(target.id, guildId);

    const embed = new EmbedBuilder()
      .setTitle('💰 Point Balance')
      .setDescription(`${target} has **${balance.toLocaleString()} points**`)
      .setColor(0xFFD700)
      .setThumbnail(target.displayAvatarURL());

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'give') {
    if (!isAdmin) return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') ?? 'No reason given';

    db.addPoints(target.id, guildId, amount);
    const newBalance = db.getPoints(target.id, guildId);

    const embed = new EmbedBuilder()
      .setTitle('➕ Points Given')
      .setColor(0x57F287)
      .addFields(
        { name: 'User', value: `${target}`, inline: true },
        { name: 'Amount', value: `+${amount.toLocaleString()}`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()}`, inline: true },
        { name: 'Reason', value: reason },
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'take') {
    if (!isAdmin) return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const reason = interaction.options.getString('reason') ?? 'No reason given';

    const current = db.getPoints(target.id, guildId);
    const deduct = Math.min(amount, current);
    db.deductPoints(target.id, guildId, deduct);
    const newBalance = db.getPoints(target.id, guildId);

    const embed = new EmbedBuilder()
      .setTitle('➖ Points Removed')
      .setColor(0xED4245)
      .addFields(
        { name: 'User', value: `${target}`, inline: true },
        { name: 'Amount', value: `-${deduct.toLocaleString()}`, inline: true },
        { name: 'New Balance', value: `${newBalance.toLocaleString()}`, inline: true },
        { name: 'Reason', value: reason },
      );

    return interaction.reply({ embeds: [embed] });
  }
}

async function executeStore(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  if (sub === 'list') {
    const items = db.getStoreItems(guildId);
    if (!items.length) {
      return interaction.reply({ content: '🛒 The store is empty. Admins can add items with `/store add`.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛒 Point Store')
      .setColor(0xFFD700)
      .setDescription(items.map(item =>
        `**${item.name}** — ${item.cost.toLocaleString()} pts\n${item.description ?? ''}${item.role_id ? ` → <@&${item.role_id}>` : ''}`
      ).join('\n\n'));

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'buy') {
    const itemName = interaction.options.getString('item');
    const item = db.getStoreItem(guildId, itemName);
    if (!item) return interaction.reply({ content: `❌ No item called **${itemName}** found in the store.`, ephemeral: true });

    const balance = db.getPoints(interaction.user.id, guildId);
    if (balance < item.cost) {
      return interaction.reply({ content: `❌ You need **${item.cost.toLocaleString()}** points but only have **${balance.toLocaleString()}**.`, ephemeral: true });
    }

    db.deductPoints(interaction.user.id, guildId, item.cost);

    if (item.role_id) {
      await interaction.member.roles.add(item.role_id).catch(() => {});
    }

    const newBalance = db.getPoints(interaction.user.id, guildId);
    const embed = new EmbedBuilder()
      .setTitle('🛒 Purchase Successful')
      .setColor(0x57F287)
      .addFields(
        { name: 'Item', value: item.name, inline: true },
        { name: 'Cost', value: `${item.cost.toLocaleString()} pts`, inline: true },
        { name: 'Remaining Balance', value: `${newBalance.toLocaleString()} pts`, inline: true },
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'add') {
    if (!isAdmin) return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    const name = interaction.options.getString('name');
    const cost = interaction.options.getInteger('cost');
    const description = interaction.options.getString('description') ?? null;
    const role = interaction.options.getRole('role');

    db.addStoreItem({ guildId, name, description, cost, roleId: role?.id ?? null });

    return interaction.reply({ content: `✅ Added **${name}** to the store for **${cost.toLocaleString()}** points.`, ephemeral: true });
  }

  if (sub === 'remove') {
    if (!isAdmin) return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    const name = interaction.options.getString('name');
    db.removeStoreItem(guildId, name);
    return interaction.reply({ content: `✅ Removed **${name}** from the store.`, ephemeral: true });
  }
}

module.exports = { command, storeCommand, executePoints, executeStore };
