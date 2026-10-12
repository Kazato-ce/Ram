import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sodu')
    .setDescription('💵 Xem số dư tiền King.MC của bạn hoặc người khác')
    .addUserOption((opt) =>
      opt.setName('nguoi_dung').setDescription('Chọn người muốn xem số dư (mặc định: chính bạn)').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('nguoi_dung') || interaction.user;
    const userData = kingmcEconomy.getUser(targetUser.id);
    const balance = userData.balance || 0;
    const ign = userData.ign || 'Chưa liên kết (Gõ /link để liên kết)';

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`💵 VÍ TIỀN KING.MC — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: '💰 Số dư hiện tại', value: `**${kingmcEconomy.formatMoney(balance)}**`, inline: true },
        { name: '🎮 Tên Minecraft (IGN)', value: `\`${ign}\``, inline: true },
        { name: '📥 Tổng tiền đã nạp', value: `${kingmcEconomy.formatMoney(userData.totalDeposited || 0)}`, inline: true },
        { name: '📦 File đã mua', value: `${userData.purchases?.length || 0} file`, inline: true }
      )
      .setFooter({ text: 'Dùng /naptien để nạp tiền từ game | /shop để mua file | /chanle để chơi game' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
