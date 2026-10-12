import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('🔗 Liên kết tài khoản Discord với nhân vật Minecraft King.MC')
    .addStringOption((opt) =>
      opt
        .setName('ign')
        .setDescription('Tên nhân vật trong game Minecraft (ví dụ: Steve, Alex...)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const ign = interaction.options.getString('ign');

    const result = kingmcEconomy.linkAccount(userId, ign);

    if (!result.success) {
      return interaction.reply({
        content: `❌ ${result.message}`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🔗 LIÊN KẾT TÀI KHOẢN THÀNH CÔNG!')
      .setDescription(
        `Tài khoản Discord của bạn đã được liên kết với nhân vật Minecraft **${result.ign}**!\n\n` +
        (result.claimedPending > 0
          ? `🎉 **Chúc mừng!** Bot đã phát hiện bạn từng nạp **${kingmcEconomy.formatMoney(result.claimedPending)}** trước khi liên kết, số tiền này đã được tự động cộng vào ví của bạn!\n\n`
          : '') +
        `💰 **Số dư hiện tại:** **${kingmcEconomy.formatMoney(result.balance)}**\n\n` +
        `👉 Giờ đây mỗi khi bạn chuyển tiền cho bot trong game bằng lệnh \`/pay\`, số tiền sẽ tự động cập nhật vào tài khoản Discord của bạn!`
      )
      .setFooter({ text: 'Gõ /naptien để xem thông tin tài khoản bot trong server KingMC' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
