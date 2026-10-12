import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { minecraftBot } from '../../services/minecraft/mineflayerBot.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('naptien')
    .setDescription('📥 Hướng dẫn nạp tiền từ server Minecraft King.MC vào bot Discord'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = kingmcEconomy.getUser(userId);

    const botUsername = process.env.MINECRAFT_USERNAME || 'KingBot_Ram';
    const serverHost = process.env.MINECRAFT_HOST || 'kingmc.vn';
    const isOnline = minecraftBot.isConnected;

    const embed = new EmbedBuilder()
      .setColor(isOnline ? 0x2ecc71 : 0xe67e22)
      .setTitle('📥 HƯỚNG DẪN NẠP TIỀN TỪ SERVER KING.MC')
      .setDescription(
        `Để nạp tiền vào bot Discord và tham gia chơi game hoặc mua file, bạn chỉ cần chuyển tiền in-game cho tài khoản bot Minecraft:\n\n` +
        `🌐 **Server Minecraft:** \`${serverHost}\`\n` +
        `🤖 **Tài khoản Bot trong game:** \`${botUsername}\`\n` +
        `🟢 **Trạng thái Bot Minecraft:** ${isOnline ? '🟢 **Đang Online trong game**' : '🟡 **Đang kết nối lại...**'}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 **CÁC BƯỚC THỰC HIỆN:**\n\n` +
        `**Bước 1:** Đảm bảo bạn đã liên kết tài khoản bằng lệnh:\n` +
        `👉 \`/link <tên_nhân_vật_in_game>\`\n` +
        `*(Tài khoản của bạn hiện tại: ${user.ign ? `\`${user.ign}\` ✅` : '⚠️ **Chưa liên kết**'})*\n\n` +
        `**Bước 2:** Vào server Minecraft King.MC và gõ lệnh chuyển tiền:\n` +
        `👉 \`/pay ${botUsername} <số_tiền>\`\n` +
        `*(Ví dụ: \`/pay ${botUsername} 50000\`)*\n\n` +
        `**Bước 3:** Hệ thống sẽ tự động nhận diện và cộng tiền vào ví Discord của bạn ngay lập tức!\n` +
        `━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setFooter({ text: 'Gõ /sodu để kiểm tra số dư ví sau khi nạp' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
