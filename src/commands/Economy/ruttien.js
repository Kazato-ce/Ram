import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { minecraftBot } from '../../services/minecraft/mineflayerBot.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ruttien')
    .setDescription('📤 Rút tiền từ ví Discord về nhân vật Minecraft King.MC của bạn')
    .addIntegerOption((opt) =>
      opt
        .setName('so_tien')
        .setDescription('Số xu KingMC muốn rút (tối thiểu: 5,000 xu)')
        .setRequired(true)
        .setMinValue(5000)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const amount = interaction.options.getInteger('so_tien');
    const user = kingmcEconomy.getUser(userId);

    // 1. Kiểm tra liên kết tài khoản
    if (!user.ign) {
      return interaction.reply({
        content: '❌ Bạn chưa liên kết tài khoản Minecraft! Hãy dùng lệnh `/link <tên_ingame>` trước khi rút tiền.',
        ephemeral: true,
      });
    }

    // 2. Kiểm tra số dư
    const currentBalance = kingmcEconomy.getBalance(userId);
    if (currentBalance < amount) {
      return interaction.reply({
        content: `❌ Số dư của bạn không đủ để rút!\nSố dư hiện tại: **${kingmcEconomy.formatMoney(currentBalance)}** | Yêu cầu rút: **${kingmcEconomy.formatMoney(amount)}**.`,
        ephemeral: true,
      });
    }

    // 3. Kiểm tra trạng thái bot Minecraft
    if (!minecraftBot.isConnected) {
      return interaction.reply({
        content: '❌ Bot Minecraft hiện đang mất kết nối hoặc server KingMC đang bảo trì. Vui lòng thử lại sau vài phút!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    // 4. Trừ tiền tạm thời
    const deducted = kingmcEconomy.removeBalance(userId, amount, `Rút tiền về nhân vật: ${user.ign}`);
    if (!deducted) {
      return interaction.editReply({ content: '❌ Lỗi trừ tiền, giao dịch đã bị hủy.' });
    }

    // 5. Bot Minecraft chuyển tiền trong game qua /pay
    const transferResult = await minecraftBot.sendMoney(user.ign, amount);

    if (!transferResult.success) {
      // Hoàn lại tiền nếu lỗi
      kingmcEconomy.addBalance(userId, amount, 'Hoàn tiền rút thất bại');
      return interaction.editReply({
        content: `❌ Rút tiền thất bại: ${transferResult.message}\n(Đã hoàn lại tiền vào tài khoản Discord của bạn)`,
      });
    }

    // Cập nhật tổng tiền đã rút
    user.totalWithdrawn = (user.totalWithdrawn || 0) + amount;
    kingmcEconomy.saveData();

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('📤 RÚT TIỀN THÀNH CÔNG!')
      .setDescription(
        `Giao dịch rút tiền đã được thực hiện thành công!\n\n` +
        `👤 **Nhân vật nhận tiền:** \`${user.ign}\`\n` +
        `💵 **Số tiền đã rút:** **${kingmcEconomy.formatMoney(amount)}**\n` +
        `💰 **Số dư còn lại trong bot:** **${kingmcEconomy.formatMoney(kingmcEconomy.getBalance(userId))}**\n\n` +
        `Bot đã chuyển tiền trực tiếp cho bạn trong game King.MC!`
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
