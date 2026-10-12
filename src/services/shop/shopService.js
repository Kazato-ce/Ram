import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
import { kingmcEconomy } from '../economy/kingmcEconomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const STORAGE_DIR = path.resolve(__dirname, '../../../storage/files');
const SHOP_FILE = path.join(DATA_DIR, 'shop_items.json');
const ORDERS_FILE = path.join(DATA_DIR, 'shop_orders.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

class ShopService {
  constructor() {
    this.items = [];
    this.orders = [];
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(SHOP_FILE)) {
        const raw = fs.readFileSync(SHOP_FILE, 'utf-8');
        this.items = JSON.parse(raw);
      } else {
        // Tạo một vài item mẫu ban đầu để giao diện không bị trống
        this.items = [
          {
            id: 'file_demo_1',
            name: 'Bộ Config Server KingMC Mẫu',
            description: 'Tài liệu hướng dẫn tối ưu và config mẫu cho server Minecraft Skyblock/Survival.',
            price: 50000,
            downloadUrl: 'https://example.com/demo-config.zip',
            localFile: null,
            category: 'Tài liệu',
            salesCount: 0,
            createdAt: new Date().toISOString(),
          },
        ];
        this.saveData();
      }

      if (fs.existsSync(ORDERS_FILE)) {
        const rawOrders = fs.readFileSync(ORDERS_FILE, 'utf-8');
        this.orders = JSON.parse(rawOrders);
      } else {
        this.orders = [];
        this.saveOrders();
      }
    } catch (error) {
      logger.error('[Shop Service] Lỗi khi tải dữ liệu shop:', error);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(SHOP_FILE, JSON.stringify(this.items, null, 2), 'utf-8');
    } catch (error) {
      logger.error('[Shop Service] Lỗi khi lưu dữ liệu items:', error);
    }
  }

  saveOrders() {
    try {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify(this.orders, null, 2), 'utf-8');
    } catch (error) {
      logger.error('[Shop Service] Lỗi khi lưu dữ liệu orders:', error);
    }
  }

  getItems() {
    return this.items;
  }

  getItem(id) {
    return this.items.find((item) => item.id === id) || null;
  }

  addItem({ name, description, price, downloadUrl = null, localFile = null, category = 'Chung' }) {
    const id = 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const newItem = {
      id,
      name: name.trim(),
      description: description ? description.trim() : 'Không có mô tả.',
      price: parseInt(price, 10),
      downloadUrl: downloadUrl ? downloadUrl.trim() : null,
      localFile: localFile || null,
      category: category ? category.trim() : 'Chung',
      salesCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.items.push(newItem);
    this.saveData();
    return newItem;
  }

  editItem(id, updates) {
    const item = this.getItem(id);
    if (!item) return null;

    if (updates.name !== undefined) item.name = updates.name.trim();
    if (updates.description !== undefined) item.description = updates.description.trim();
    if (updates.price !== undefined) item.price = parseInt(updates.price, 10);
    if (updates.downloadUrl !== undefined) item.downloadUrl = updates.downloadUrl;
    if (updates.localFile !== undefined) item.localFile = updates.localFile;
    if (updates.category !== undefined) item.category = updates.category;

    this.saveData();
    return item;
  }

  deleteItem(id) {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) return false;

    const removed = this.items.splice(index, 1)[0];
    // Nếu có file local, xóa file
    if (removed.localFile) {
      const fullPath = path.join(STORAGE_DIR, removed.localFile);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (e) {
          logger.warn(`[Shop Service] Không thể xóa file local: ${fullPath}`);
        }
      }
    }

    this.saveData();
    return true;
  }

  /**
   * Mua file
   */
  purchaseItem(userId, itemId) {
    const item = this.getItem(itemId);
    if (!item) {
      return { success: false, reason: 'ITEM_NOT_FOUND', message: 'Sản phẩm không tồn tại hoặc đã bị xóa!' };
    }

    const currentBalance = kingmcEconomy.getBalance(userId);
    if (currentBalance < item.price) {
      return {
        success: false,
        reason: 'INSUFFICIENT_FUNDS',
        message: `Số dư của bạn không đủ! Bạn có **${kingmcEconomy.formatMoney(currentBalance)}**, cần **${kingmcEconomy.formatMoney(item.price)}**.`,
        required: item.price,
        current: currentBalance,
      };
    }

    // Trừ tiền
    const deducted = kingmcEconomy.removeBalance(userId, item.price, `Mua file: ${item.name}`);
    if (!deducted) {
      return { success: false, reason: 'TRANSACTION_FAILED', message: 'Giao dịch trừ tiền thất bại!' };
    }

    // Tăng lượt mua
    item.salesCount = (item.salesCount || 0) + 1;
    this.saveData();

    // Tạo đơn hàng
    const orderId = 'ORD_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const order = {
      orderId,
      userId,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      downloadUrl: item.downloadUrl,
      localFile: item.localFile,
      purchasedAt: new Date().toISOString(),
    };
    this.orders.push(order);
    this.saveOrders();

    // Cập nhật vào danh sách đã mua của user
    const user = kingmcEconomy.getUser(userId);
    if (!user.purchases) user.purchases = [];
    user.purchases.push({
      orderId,
      itemId: item.id,
      itemName: item.name,
      price: item.price,
      purchasedAt: order.purchasedAt,
    });
    kingmcEconomy.saveData();

    // Lấy file path nếu có localFile
    let localFilePath = null;
    if (item.localFile) {
      const fullPath = path.join(STORAGE_DIR, item.localFile);
      if (fs.existsSync(fullPath)) {
        localFilePath = fullPath;
      }
    }

    return {
      success: true,
      item,
      orderId,
      newBalance: kingmcEconomy.getBalance(userId),
      localFilePath,
      downloadUrl: item.downloadUrl,
    };
  }

  getUserOrders(userId) {
    return this.orders.filter((o) => o.userId === userId);
  }

  getStorageDir() {
    return STORAGE_DIR;
  }
}

export const shopService = new ShopService();
