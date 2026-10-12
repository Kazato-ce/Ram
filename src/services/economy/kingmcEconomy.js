import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const DATA_FILE = path.join(DATA_DIR, 'kingmc_economy.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class KingMCEconomyService {
  constructor() {
    this.data = {
      users: {}, // userId -> { balance, ign, totalDeposited, totalWithdrawn, createdAt, updatedAt }
      ignToUser: {}, // ign.toLowerCase() -> userId
      pendingDeposits: {}, // ign.toLowerCase() -> amount
      transactions: [], // history log
    };
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || {},
          ignToUser: parsed.ignToUser || {},
          pendingDeposits: parsed.pendingDeposits || {},
          transactions: parsed.transactions || [],
        };
        logger.info(`[KingMC Economy] Đã tải dữ liệu kinh tế: ${Object.keys(this.data.users).length} người dùng.`);
      } else {
        this.saveData();
      }
    } catch (error) {
      logger.error('[KingMC Economy] Lỗi đọc file dữ liệu kinh tế:', error);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('[KingMC Economy] Lỗi lưu file dữ liệu kinh tế:', error);
    }
  }

  /**
   * Khởi tạo hoặc lấy thông tin người dùng
   */
  getUser(userId) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        userId,
        balance: 0,
        ign: null,
        totalDeposited: 0,
        totalWithdrawn: 0,
        purchases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.saveData();
    }
    return this.data.users[userId];
  }

  /**
   * Lấy số dư của người dùng
   */
  getBalance(userId) {
    const user = this.getUser(userId);
    return user.balance || 0;
  }

  /**
   * Định dạng số tiền (VD: 1,000,000 xu)
   */
  formatMoney(amount) {
    return Number(amount).toLocaleString('vi-VN') + ' xu';
  }

  /**
   * Cộng tiền vào tài khoản
   */
  addBalance(userId, amount, reason = 'Cộng tiền') {
    if (amount <= 0) return false;
    const user = this.getUser(userId);
    user.balance = (user.balance || 0) + Number(amount);
    user.updatedAt = new Date().toISOString();

    this.logTransaction(userId, 'ADD', amount, reason, user.balance);
    this.saveData();
    return user.balance;
  }

  /**
   * Trừ tiền trong tài khoản
   */
  removeBalance(userId, amount, reason = 'Trừ tiền') {
    if (amount <= 0) return false;
    const user = this.getUser(userId);
    if ((user.balance || 0) < amount) {
      return false;
    }
    user.balance -= Number(amount);
    user.updatedAt = new Date().toISOString();

    this.logTransaction(userId, 'REMOVE', amount, reason, user.balance);
    this.saveData();
    return true;
  }

  /**
   * Liên kết tài khoản Discord với tên Minecraft IGN
   */
  linkAccount(userId, ign) {
    const cleanIgn = ign.trim();
    const lowerIgn = cleanIgn.toLowerCase();

    // Kiểm tra xem IGN này đã được người khác liên kết chưa
    const existingUserId = this.data.ignToUser[lowerIgn];
    if (existingUserId && existingUserId !== userId) {
      return { success: false, message: `Tên Minecraft **${cleanIgn}** đã được liên kết với một tài khoản Discord khác!` };
    }

    const user = this.getUser(userId);
    
    // Nếu trước đó đã liên kết với IGN cũ, xóa liên kết cũ
    if (user.ign) {
      delete this.data.ignToUser[user.ign.toLowerCase()];
    }

    user.ign = cleanIgn;
    user.updatedAt = new Date().toISOString();
    this.data.ignToUser[lowerIgn] = userId;

    // Kiểm tra xem có tiền nạp chờ (pending deposit) cho IGN này không
    let claimedPending = 0;
    if (this.data.pendingDeposits[lowerIgn] && this.data.pendingDeposits[lowerIgn] > 0) {
      claimedPending = this.data.pendingDeposits[lowerIgn];
      user.balance += claimedPending;
      user.totalDeposited = (user.totalDeposited || 0) + claimedPending;
      delete this.data.pendingDeposits[lowerIgn];
      this.logTransaction(userId, 'CLAIM_PENDING', claimedPending, `Nhận ${claimedPending} xu nạp trước khi liên kết`, user.balance);
    }

    this.saveData();
    return {
      success: true,
      ign: cleanIgn,
      claimedPending,
      balance: user.balance,
    };
  }

  /**
   * Hủy liên kết tài khoản
   */
  unlinkAccount(userId) {
    const user = this.getUser(userId);
    if (!user.ign) {
      return { success: false, message: 'Bạn chưa liên kết tài khoản Minecraft nào!' };
    }

    const oldIgn = user.ign;
    delete this.data.ignToUser[oldIgn.toLowerCase()];
    user.ign = null;
    user.updatedAt = new Date().toISOString();
    this.saveData();

    return { success: true, ign: oldIgn };
  }

  /**
   * Lấy Discord User ID từ tên In-Game Name (IGN)
   */
  getUserIdByIgn(ign) {
    if (!ign) return null;
    return this.data.ignToUser[ign.trim().toLowerCase()] || null;
  }

  /**
   * Xử lý nạp tiền từ Minecraft Server (khi có người /pay vào bot)
   */
  handleDepositFromMinecraft(ign, amount) {
    const cleanIgn = ign.trim();
    const lowerIgn = cleanIgn.toLowerCase();
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) return null;

    const userId = this.data.ignToUser[lowerIgn];
    if (userId) {
      // Đã liên kết: Cộng thẳng vào tài khoản
      const user = this.getUser(userId);
      user.balance += numAmount;
      user.totalDeposited = (user.totalDeposited || 0) + numAmount;
      user.updatedAt = new Date().toISOString();

      this.logTransaction(userId, 'DEPOSIT', numAmount, `Nạp tiền từ Minecraft qua IGN ${cleanIgn}`, user.balance);
      this.saveData();

      return {
        isLinked: true,
        userId,
        ign: cleanIgn,
        amount: numAmount,
        newBalance: user.balance,
      };
    } else {
      // Chưa liên kết: Lưu vào pending deposits
      this.data.pendingDeposits[lowerIgn] = (this.data.pendingDeposits[lowerIgn] || 0) + numAmount;
      this.saveData();

      return {
        isLinked: false,
        userId: null,
        ign: cleanIgn,
        amount: numAmount,
        totalPending: this.data.pendingDeposits[lowerIgn],
      };
    }
  }

  /**
   * Ghi log giao dịch
   */
  logTransaction(userId, type, amount, reason, balanceAfter) {
    const tx = {
      id: 'TX_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId,
      type,
      amount,
      reason,
      balanceAfter,
      timestamp: new Date().toISOString(),
    };
    this.data.transactions.unshift(tx);
    // Giữ tối đa 1000 giao dịch gần nhất
    if (this.data.transactions.length > 1000) {
      this.data.transactions.pop();
    }
  }

  /**
   * Bảng xếp hạng số dư
   */
  getLeaderboard(limit = 10) {
    const userList = Object.values(this.data.users)
      .filter(u => (u.balance || 0) > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
    return userList;
  }
}

export const kingmcEconomy = new KingMCEconomyService();
