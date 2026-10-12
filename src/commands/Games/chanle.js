import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

// Lịch sử kết quả gần đây
const recentResults = [];

export default {
  data: new SlashCommandBuilder()
    .setName('chanle')
    .setDescription('🎲 Trò chơi Chẵn Lẻ bằng tiền trong King.MC')
    .addStringOption((opt) =>
      opt
        .setName('lua_chon')
        .setDescription('Chọn Chẵn (⚪) hoặc Lẻ (⚫)')
        .setRequired(true)
        .addChoices(
          { name: '⚪ Chẵn (Tổng 3 xúc xắc là số chẵn)', value: 'chan' },
          { name: '⚫ Lẻ (Tổng 3 xúc xắc là số lẻ)', value: 'le' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('tien_cuoc')
        .setDescription('Số xu KingMC muốn cược (tối thiểu: 1,000 xu)')
        .setRequired(true)
        .setMinValue(1000)
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const choice = interaction.options.getString('lua_chon');
    const betAmount = interaction.options.getInteger('tien_cuoc');

    const currentBalance = kingmcEconomy.getBalance(userId);

    // Kiểm tra số dư
    if (currentBalance < betAmount) {
      return interaction.reply({
        content: `❌ Số dư của bạn không đủ!\nBạn hiện có: **${kingmcEconomy.formatMoney(currentBalance)}** | Tiền cược yêu cầu: **${kingmcEconomy.formatMoney(betAmount)}**.\n👉 Dùng lệnh \`/naptien\` để nạp thêm xu từ server KingMC!`,
        ephemeral: true,
      });
    }

    // Trừ tiền cược
    kingmcEconomy.removeBalance(userId, betAmount, `Cược Chẵn Lẻ: ${choice.toUpperCase()}`);

    // Gửi hiệu ứng đang xóc đĩa
    const shakingEmbed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🎲 ĐANG XÓC ĐĨA...')
      .setDescription(
        `👤 Người chơi: <@${userId}>\n` +
        `🎯 Đặt cược: **${choice === 'chan' ? '⚪ CHẴN' : '⚫ LẺ'}**\n` +
        `💰 Tiền cược: **${kingmcEconomy.formatMoney(betAmount)}**\n\n` +
        `*Đang lắc 3 viên xúc xắc, vui lòng chờ trong giây lát...*`
      );

    await interaction.reply({ embeds: [shakingEmbed] });

    // Đợi 1.5 giây tạo cảm giác hồi hộp
    setTimeout(async () => {
      // Tung 3 xúc xắc
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      const isEven = total % 2 === 0;
      const resultType = isEven ? 'chan' : 'le';
      const isWin = choice === resultType;

      // Lưu lịch sử
      recentResults.unshift(isEven ? '⚪' : '⚫');
      if (recentResults.length > 10) recentResults.pop();

      const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      const diceDisplay = `${diceEmojis[d1 - 1]} (${d1}) + ${diceEmojis[d2 - 1]} (${d2}) + ${diceEmojis[d3 - 1]} (${d3})`;

      let newBalance = kingmcEconomy.getBalance(userId);
      let winAmount = 0;

      const resultEmbed = new EmbedBuilder().setTimestamp();

      if (isWin) {
        // Tỉ lệ ăn 1:1.95 (hoặc x2)
        const winMultiplier = 1.95;
        winAmount = Math.floor(betAmount * winMultiplier);
        kingmcEconomy.addBalance(userId, winAmount, `Thắng cược Chẵn Lẻ: +${winAmount}`);
        newBalance = kingmcEconomy.getBalance(userId);

        const profit = winAmount - betAmount;

        resultEmbed
          .setColor(0x2ecc71)
          .setTitle('🎉 CHÚC MỪNG BẠN ĐÃ THẮNG CƯỢC!')
          .setDescription(
            `👤 Người chơi: <@${userId}>\n` +
            `🎯 Bạn chọn: **${choice === 'chan' ? '⚪ CHẴN' : '⚫ LẺ'}**\n` +
            `🎲 Kết quả: **${diceDisplay} = ${total}** ➔ **${isEven ? '⚪ CHẴN' : '⚫ LẺ'}**\n\n` +
            `💵 **Tiền thắng nhận được:** **+${kingmcEconomy.formatMoney(winAmount)}** *(Lãi: +${kingmcEconomy.formatMoney(profit)})*\n` +
            `💰 **Số dư hiện tại:** **${kingmcEconomy.formatMoney(newBalance)}**\n\n` +
            `📜 **Cầu gần nhất:** ${recentResults.join(' ')}`
          );
      } else {
        resultEmbed
          .setColor(0xe74c3c)
          .setTitle('💸 RẤT TIẾC, BẠN ĐÃ THUA CƯỢC!')
          .setDescription(
            `👤 Người chơi: <@${userId}>\n` +
            `🎯 Bạn chọn: **${choice === 'chan' ? '⚪ CHẴN' : '⚫ LẺ'}**\n` +
            `🎲 Kết quả: **${diceDisplay} = ${total}** ➔ **${isEven ? '⚪ CHẴN' : '⚫ LẺ'}**\n\n` +
            `💥 **Bạn đã mất:** **-${kingmcEconomy.formatMoney(betAmount)}**\n` +
            `💰 **Số dư còn lại:** **${kingmcEconomy.formatMoney(newBalance)}**\n\n` +
            `📜 **Cầu gần nhất:** ${recentResults.join(' ')}`
          );
      }

      // Nút cược lại nhanh
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`chanle_rebetsame:${userId}:${choice}:${betAmount}`)
          .setLabel(`Cược lại (${kingmcEconomy.formatMoney(betAmount)})`)
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`chanle_checkbal:${userId}`)
          .setLabel('Xem số dư')
          .setEmoji('💵')
          .setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.editReply({ embeds: [resultEmbed], components: [row] });

      // Collector cho nút cược lại
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
      });

      collector.on('collect', async (btnInt) => {
        if (btnInt.user.id !== userId) {
          return btnInt.reply({
            content: '❌ Nút này chỉ dành cho người vừa chơi!',
            ephemeral: true,
          });
        }

        if (btnInt.customId.startsWith('chanle_checkbal:')) {
          const bal = kingmcEconomy.getBalance(userId);
          return btnInt.reply({
            content: `💰 Số dư hiện tại của bạn: **${kingmcEconomy.formatMoney(bal)}**`,
            ephemeral: true,
          });
        }

        if (btnInt.customId.startsWith('chanle_rebetsame:')) {
          const bal = kingmcEconomy.getBalance(userId);
          if (bal < betAmount) {
            return btnInt.reply({
              content: `❌ Số dư không đủ để cược lại **${kingmcEconomy.formatMoney(betAmount)}**! (Hiện có: ${kingmcEconomy.formatMoney(bal)})`,
              ephemeral: true,
            });
          }

          // Trừ tiền cược lại
          kingmcEconomy.removeBalance(userId, betAmount, `Cược lại Chẵn Lẻ: ${choice.toUpperCase()}`);

          await btnInt.deferUpdate();

          // Tung lại
          const rd1 = Math.floor(Math.random() * 6) + 1;
          const rd2 = Math.floor(Math.random() * 6) + 1;
          const rd3 = Math.floor(Math.random() * 6) + 1;
          const rTotal = rd1 + rd2 + rd3;
          const rIsEven = rTotal % 2 === 0;
          const rResultType = rIsEven ? 'chan' : 'le';
          const rIsWin = choice === rResultType;

          recentResults.unshift(rIsEven ? '⚪' : '⚫');
          if (recentResults.length > 10) recentResults.pop();

          const rDiceDisplay = `${diceEmojis[rd1 - 1]} (${rd1}) + ${diceEmojis[rd2 - 1]} (${rd2}) + ${diceEmojis[rd3 - 1]} (${rd3})`;
          let rNewBal = kingmcEconomy.getBalance(userId);

          const rEmbed = new EmbedBuilder().setTimestamp();
          if (rIsWin) {
            const rWinAmount = Math.floor(betAmount * 1.95);
            kingmcEconomy.addBalance(userId, rWinAmount, `Thắng cược Chẵn Lẻ: +${rWinAmount}`);
            rNewBal = kingmcEconomy.getBalance(userId);

            rEmbed
              .setColor(0x2ecc71)
              .setTitle('🎉 CHÚC MỪNG BẠN ĐÃ THẮNG CƯỢC!')
              .setDescription(
                `👤 Người chơi: <@${userId}>\n` +
                `🎯 Bạn chọn: **${choice === 'chan' ? '⚪ CHẴN' : '⚫ LẺ'}**\n` +
                `🎲 Kết quả: **${rDiceDisplay} = ${rTotal}** ➔ **${rIsEven ? '⚪ CHẴN' : '⚫ LẺ'}**\n\n` +
                `💵 **Tiền thắng nhận được:** **+${kingmcEconomy.formatMoney(rWinAmount)}**\n` +
                `💰 **Số dư hiện tại:** **${kingmcEconomy.formatMoney(rNewBal)}**\n\n` +
                `📜 **Cầu gần nhất:** ${recentResults.join(' ')}`
              );
          } else {
            rEmbed
              .setColor(0xe74c3c)
              .setTitle('💸 RẤT TIẾC, BẠN ĐÃ THUA CƯỢC!')
              .setDescription(
                `👤 Người chơi: <@${userId}>\n` +
                `🎯 Bạn chọn: **${choice === 'chan' ? '⚪ CHẴN' : '⚫ LẺ'}**\n` +
                `🎲 Kết quả: **${rDiceDisplay} = ${rTotal}** ➔ **${rIsEven ? '⚪ CHẴN' : '⚫ LẺ'}**\n\n` +
                `💥 **Bạn đã mất:** **-${kingmcEconomy.formatMoney(betAmount)}**\n` +
                `💰 **Số dư còn lại:** **${kingmcEconomy.formatMoney(rNewBal)}**\n\n` +
                `📜 **Cầu gần nhất:** ${recentResults.join(' ')}`
              );
          }

          await interaction.editReply({ embeds: [rEmbed], components: [row] });
        }
      });
    }, 1500);
  },
};
