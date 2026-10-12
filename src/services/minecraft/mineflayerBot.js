import mineflayer from 'mineflayer';
import { logger } from '../../utils/logger.js';
import { kingmcEconomy } from '../economy/kingmcEconomy.js';
import { EmbedBuilder } from 'discord.js';

class MinecraftBotManager {
  constructor() {
    this.bot = null;
    this.discordClient = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this.authAttempted = false;
  }

  init(discordClient) {
    this.discordClient = discordClient;
    const enabled = process.env.MINECRAFT_ENABLED === 'true' || process.env.MINECRAFT_ENABLED === '1';

    if (!enabled) {
      logger.info('[Minecraft Bot] Tạm thời tắt (MINECRAFT_ENABLED=false trong .env). Bật biến này để kết nối KingMC.');
      return;
    }

    const host = process.env.MINECRAFT_HOST || 'kingmc.vn';
    const port = parseInt(process.env.MINECRAFT_PORT || '25565', 10);
    const username = process.env.MINECRAFT_USERNAME || 'KingBot_Ram';

    logger.info(`[Minecraft Bot] Đang khởi động bot Minecraft kết nối tới ${host}:${port} với tên "${username}"...`);
    this.connect();
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const host = process.env.MINECRAFT_HOST || 'kingmc.vn';
    const port = parseInt(process.env.MINECRAFT_PORT || '25565', 10);
    const username = process.env.MINECRAFT_USERNAME || 'KingBot_Ram';
    const auth = process.env.MINECRAFT_AUTH || 'offline';
    const version = process.env.MINECRAFT_VERSION || undefined;

    try {
      this.bot = mineflayer.createBot({
        host,
        port,
        username,
        auth,
        version: version || undefined,
        hideErrors: false,
      });

      this.setupListeners();
    } catch (error) {
      logger.error('[Minecraft Bot] Lỗi khi tạo bot Minecraft:', error);
      this.scheduleReconnect();
    }
  }

  setupListeners() {
    const bot = this.bot;
    const password = process.env.MINECRAFT_PASSWORD || '';

    bot.on('login', () => {
      logger.info(`[Minecraft Bot] ✅ Bot "${bot.username}" đã kết nối vào server Minecraft!`);
      this.isConnected = true;
      this.authAttempted = false;
    });

    bot.on('spawn', () => {
      logger.info('[Minecraft Bot] Bot đã xuất hiện trong thế giới (spawned).');
      // Nếu có mật khẩu AuthMe, thử đăng nhập
      if (password && !this.authAttempted) {
        setTimeout(() => {
          bot.chat(`/login ${password}`);
          this.authAttempted = true;
        }, 3000);
      }
    });

    // Lắng nghe tin nhắn chat trong game
    bot.on('message', (jsonMsg) => {
      const message = jsonMsg.toString().trim();
      if (!message) return;

      logger.debug(`[Minecraft Chat] ${message}`);

      // Kiểm tra AuthMe tự động nếu server yêu cầu
      if (password) {
        const lower = message.toLowerCase();
        if (lower.includes('/login') || lower.includes('dang nhap') || lower.includes('đăng nhập')) {
          setTimeout(() => {
            bot.chat(`/login ${password}`);
          }, 1500);
        } else if (lower.includes('/register') || lower.includes('dang ky') || lower.includes('đăng ký')) {
          setTimeout(() => {
            bot.chat(`/register ${password} ${password}`);
          }, 1500);
        }
      }

      // Xử lý nạp tiền qua lệnh /pay
      this.handlePaymentChat(message);
    });

    bot.on('kicked', (reason) => {
      logger.warn('[Minecraft Bot] Bị kick khỏi server:', reason);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    bot.on('end', (reason) => {
      logger.warn('[Minecraft Bot] Kết nối với server đã kết thúc:', reason);
      this.isConnected = false;
      this.scheduleReconnect();
    });

    bot.on('error', (err) => {
      logger.error('[Minecraft Bot] Lỗi socket/kết nối:', err?.message || err);
    });
  }

  /**
   * Phân tích tin nhắn chuyển tiền (/pay) từ người chơi
   */
  handlePaymentChat(message) {
    // Làm sạch message (loại bỏ màu & ký tự đặc biệt)
    const cleanMsg = message.replace(/§[0-9a-fk-or]/gi, '').trim();

    // Danh sách các regex phổ biến cho plugin chuyển tiền tiếng Việt & tiếng Anh
    const patterns = [
      // KingMC / Essentials tiếng Việt:
      // VD: "[+] Steve đã chuyển cho bạn 50,000 xu"
      // VD: "Bạn đã nhận được 50,000$ từ Steve"
      // VD: "Steve đã gửi cho bạn 50000 xu"
      /(?:\[\+\]|\*|\+)?\s*([a-zA-Z0-9_]{2,16})\s+(?:đã chuyển cho bạn|đã gửi cho bạn)\s+([0-9.,]+)\s*(?:xu|\$|dong|đ|coins?)/i,
      /Bạn đã nhận được\s+([0-9.,]+)\s*(?:xu|\$|dong|đ|coins?)?\s+từ\s+([a-zA-Z0-9_]{2,16})/i,
      /(?:\[Giao dịch\]|Giao dịch:)\s*([a-zA-Z0-9_]{2,16})\s+đã chuyển\s+([0-9.,]+)\s*(?:xu|\$|dong|đ|coins?)\s+cho bạn/i,
      /([a-zA-Z0-9_]{2,16})\s+(?:has sent you|paid you)\s+\$?([0-9.,]+)/i,
      /You received\s+\$?([0-9.,]+)\s+from\s+([a-zA-Z0-9_]{2,16})/i,
    ];

    // Thêm custom regex nếu cấu hình trong .env
    if (process.env.MINECRAFT_PAY_REGEX) {
      try {
        patterns.unshift(new RegExp(process.env.MINECRAFT_PAY_REGEX, 'i'));
      } catch (e) {
        logger.error('[Minecraft Bot] MINECRAFT_PAY_REGEX không hợp lệ:', e);
      }
    }

    let ign = null;
    let amountStr = null;

    for (const pattern of patterns) {
      const match = cleanMsg.match(pattern);
      if (match) {
        // Tùy pattern mà nhóm 1 là IGN hoặc Amount
        if (isNaN(Number(match[1].replace(/[,.]/g, '')))) {
          ign = match[1];
          amountStr = match[2];
        } else {
          amountStr = match[1];
          ign = match[2];
        }
        break;
      }
    }

    if (!ign || !amountStr) return;

    // Chuẩn hóa số tiền
    const cleanAmount = parseInt(amountStr.replace(/[,.]/g, ''), 10);
    if (isNaN(cleanAmount) || cleanAmount <= 0) return;

    logger.info(`[Minecraft Bot] Phát hiện nạp tiền: Người chơi "${ign}" vừa nạp ${cleanAmount} xu.`);

    // Lưu vào kinh tế KingMC
    const result = kingmcEconomy.handleDepositFromMinecraft(ign, cleanAmount);
    if (!result) return;

    // Gửi thông báo đến Discord
    this.notifyDiscordDeposit(result);
  }

  /**
   * Gửi thông báo nạp tiền lên Discord
   */
  async notifyDiscordDeposit(result) {
    if (!this.discordClient) return;

    const channelId = process.env.MINECRAFT_LOG_CHANNEL_ID;
    const embed = new EmbedBuilder()
      .setColor(result.isLinked ? 0x2ecc71 : 0xf1c40f)
      .setTitle('💰 GIAO DỊCH NẠP TIỀN KING.MC')
      .setTimestamp();

    if (result.isLinked) {
      embed.setDescription(
        `✅ Người chơi **${result.ign}** đã nạp thành công **${kingmcEconomy.formatMoney(result.amount)}**!\n` +
        `👤 Tài khoản Discord: <@${result.userId}>\n` +
        `💵 Số dư hiện tại: **${kingmcEconomy.formatMoney(result.newBalance)}**`
      );

      // Thử gửi DM cho người dùng
      try {
        const user = await this.discordClient.users.fetch(result.userId);
        if (user) {
          const dmEmbed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('💰 NẠP TIỀN THÀNH CÔNG!')
            .setDescription(
              `Bạn vừa nạp **${kingmcEconomy.formatMoney(result.amount)}** từ tài khoản Minecraft **${result.ign}**.\n` +
              `Số dư hiện tại của bạn: **${kingmcEconomy.formatMoney(result.newBalance)}**.\n\n` +
              `Hãy dùng lệnh \`/shop\` để mua file hoặc \`/chanle\` để tham gia trò chơi!`
            )
            .setTimestamp();
          await user.send({ embeds: [dmEmbed] }).catch(() => {});
        }
      } catch (err) {
        // DM có thể bị chặn, bỏ qua
      }
    } else {
      embed.setDescription(
        `⚠️ Người chơi **${result.ign}** vừa nạp **${kingmcEconomy.formatMoney(result.amount)}** nhưng **CHƯA LIÊN KẾT DISCORD**!\n\n` +
        `👉 Người chơi hãy gõ lệnh \`/link ${result.ign}\` trong Discord để tự động nhận **${kingmcEconomy.formatMoney(result.totalPending)}** vào tài khoản!`
      );
    }

    if (channelId) {
      try {
        const channel = await this.discordClient.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
          await channel.send({ embeds: [embed] });
        }
      } catch (err) {
        logger.warn(`[Minecraft Bot] Không thể gửi thông báo tới channel ${channelId}:`, err?.message);
      }
    }
  }

  /**
   * Rút tiền từ Bot chuyển về cho người chơi in-game (/pay <ign> <amount>)
   */
  async sendMoney(ign, amount) {
    if (!this.isConnected || !this.bot) {
      return {
        success: false,
        message: 'Bot Minecraft hiện đang offline hoặc mất kết nối với server KingMC. Vui lòng thử lại sau!',
      };
    }

    const cleanAmount = parseInt(amount, 10);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, message: 'Số tiền rút không hợp lệ!' };
    }

    try {
      // Thực hiện lệnh /pay trong Minecraft
      this.bot.chat(`/pay ${ign} ${cleanAmount}`);
      logger.info(`[Minecraft Bot] Đã thực hiện lệnh: /pay ${ign} ${cleanAmount}`);

      return {
        success: true,
        message: `Đã gửi lệnh chuyển ${cleanAmount} xu cho ${ign} trong server KingMC!`,
      };
    } catch (err) {
      logger.error('[Minecraft Bot] Lỗi khi gửi lệnh /pay:', err);
      return {
        success: false,
        message: `Lỗi khi thực hiện lệnh chuyển tiền: ${err.message}`,
      };
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    logger.info('[Minecraft Bot] Sẽ thử kết nối lại sau 15 giây...');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 15000);
  }
}

export const minecraftBot = new MinecraftBotManager();
