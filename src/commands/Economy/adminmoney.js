import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admin-money')
    .setDescription('👑 Quản lý tiền của người dùng (Chỉ dành cho Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName('thao_tac')
        .setDescription('Hành động muốn thực hiện')
        .setRequired(true)
        .addChoices(
          { name: '➕ Cộng tiền (Add)', value: 'add' },
          { name: '➖ Trừ tiền (Remove)', value: 'remove' },
          { name: '🔄 Đặt số dư cố định (Set)', value: 'set' }
        )
    )
    .addUserOption((opt) =>
      opt.setName('nguoi_dung').setDescription('Người dùng muốn điều chỉnh tiền').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName('so_tien').setDescription('Số tiền xu KingMC').setRequired(true).setMinValue(1)
    )
    .addStringOption((opt) =>
      opt.setName('ly_do').setDescription('Lý do điều chỉnh tiền').setRequired(false)
    ),

  async execute(interaction) {
    const action = interaction.options.getString('thao_tac');
    const targetUser = interaction.options.getUser('nguoi_dung');
    const amount = interaction.options.getInteger('so_tien');
    const reason = interaction.options.getString('ly_do') || `Admin ${interaction.user.tag} điều chỉnh`;

    const user = kingmcEconomy.getUser(targetUser.id);
    let oldBalance = user.balance || 0;
    let newBalance = oldBalance;

    if (action === 'add') {
      kingmcEconomy.addBalance(targetUser.id, amount, reason);
      newBalance = kingmcEconomy.getBalance(targetUser.id);
    } else if (action === 'remove') {
      kingmcEconomy.removeBalance(targetUser.id, amount, reason);
      newBalance = kingmcEconomy.getBalance(targetUser.id);
    } else if (action === 'set') {
      user.balance = amount;
      user.updatedAt = new Date().toISOString();
      kingmcEconomy.logTransaction(targetUser.id, 'ADMIN_SET', amount, reason, amount);
      kingmcEconomy.saveData();
      newBalance = amount;
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('👑 ĐIỀU CHỈNH TIỀN KING.MC THÀNH CÔNG')
      .setDescription(
        `👤 **Người dùng:** <@${targetUser.id}> (\`${targetUser.tag}\`)\n` +
        `🛠️ **Thao tác:** \`${action.toUpperCase()}\`\n` +
        `💵 **Số tiền thay đổi:** **${kingmcEconomy.formatMoney(amount)}**\n` +
        `📊 **Số dư cũ:** ${kingmcEconomy.formatMoney(oldBalance)} ➔ **Số dư mới:** **${kingmcEconomy.formatMoney(newBalance)}**\n` +
        `📝 **Lý do:** ${reason}`
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
