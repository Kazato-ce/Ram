import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Hướng dẫn sử dụng toàn bộ tính năng của Bot'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('📚 DANH SÁCH LỆNH & HƯỚNG DẪN SỬ DỤNG')
      .setDescription(
        `Bot chuyên biệt dành cho cộng đồng Minecraft **King.MC**:\n` +
        `• 🎮 **Minigames:** Nối từ tiếng Việt & Chẵn lẻ xúc xắc bằng tiền KingMC.\n` +
        `• 🛒 **Cửa hàng File:** Mua bán dữ liệu, tài liệu, config bằng tiền KingMC.\n` +
        `• 💰 **Hệ thống Kinh tế:** Nạp & rút tiền tự động qua Bot Minecraft trong game.`
      )
      .addFields(
        {
          name: '🎮 TRÒ CHƠI (MINIGAMES)',
          value:
            '• `/noitu setup` — Cài đặt kênh chơi Nối Từ tiếng Việt\n' +
            '• `/noitu status` — Xem trạng thái từ hiện tại và kỷ lục chuỗi\n' +
            '• `/noitu reset` — Bắt đầu lại ván nối từ mới\n' +
            '• `/noitu stop` — Tắt trò chơi nối từ ở kênh này\n' +
            '• `/chanle <lua_chon> <tien_cuoc>` — Cược Chẵn Lẻ bằng tiền KingMC (xóc 3 xúc xắc, tỉ lệ x1.95)',
        },
        {
          name: '🛒 CỬA HÀNG FILE (SHOP)',
          value:
            '• `/shop` — Mở giao diện mua file trong Discord (Menu chọn + Nút Mua ngay)\n' +
            '• `/myfiles` — Xem lại và tải lại các file bạn đã mua\n' +
            '• `/shop-admin add` — Thêm file mới / upload file lên shop *(Admin)*\n' +
            '• `/shop-admin delete` — Xóa file khỏi shop *(Admin)*\n' +
            '• `/shop-admin list` — Xem toàn bộ danh sách file trong kho *(Admin)*',
        },
        {
          name: '💰 KINH TẾ & NẠP RÚT TIỀN KING.MC',
          value:
            '• `/link <ign>` — Liên kết Discord với nhân vật Minecraft\n' +
            '• `/sodu` — Xem số dư ví tiền KingMC hiện tại của bạn\n' +
            '• `/naptien` — Xem hướng dẫn nạp tiền từ server Minecraft (/pay cho bot)\n' +
            '• `/ruttien <so_tien>` — Rút tiền từ bot về nhân vật in-game\n' +
            '• `/top` — Bảng xếp hạng đại gia tiền KingMC\n' +
            '• `/admin-money` — Admin cộng / trừ / đặt số dư *(Admin)*',
        },
        {
          name: 'ℹ️ TIỆN ÍCH',
          value:
            '• `/help` — Xem bảng hướng dẫn này\n' +
            '• `/ping` — Kiểm tra độ trễ và tình trạng kết nối tới KingMC',
        }
      )
      .setFooter({ text: 'KingMC Discord Bot • Nối từ & Chẵn lẻ & Shop File' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
