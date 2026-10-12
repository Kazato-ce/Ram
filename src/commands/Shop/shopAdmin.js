import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { shopService } from '../../services/shop/shopService.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop-admin')
    .setDescription('🛠️ Quản lý sản phẩm và file trong Cửa Hàng (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Thêm file mới vào cửa hàng')
        .addStringOption((opt) =>
          opt.setName('ten').setDescription('Tên file / sản phẩm').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('gia').setDescription('Giá bán bằng tiền KingMC (xu)').setRequired(true).setMinValue(1)
        )
        .addStringOption((opt) =>
          opt.setName('mo_ta').setDescription('Mô tả chi tiết sản phẩm').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('danh_muc').setDescription('Danh mục (ví dụ: Config, Plugin, Map, Mod, Tài liệu)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('link_tai').setDescription('Link tải trực tiếp (Google Drive, Dropbox, Mediafire...)').setRequired(false)
        )
        .addAttachmentOption((opt) =>
          opt.setName('file_dinh_kem').setDescription('Tải trực tiếp file từ máy bạn lên bot').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Xóa file khỏi cửa hàng theo ID')
        .addStringOption((opt) =>
          opt.setName('item_id').setDescription('ID của file cần xóa').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Xem danh sách tất cả các file trong kho và thống kê doanh số')
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Sửa giá hoặc mô tả của một file')
        .addStringOption((opt) =>
          opt.setName('item_id').setDescription('ID của file').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('gia_moi').setDescription('Giá mới (bỏ trống nếu không đổi)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('mo_ta_moi').setDescription('Mô tả mới (bỏ trống nếu không đổi)').setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await interaction.deferReply({ ephemeral: true });

      const name = interaction.options.getString('ten');
      const price = interaction.options.getInteger('gia');
      const description = interaction.options.getString('mo_ta') || 'Không có mô tả.';
      const category = interaction.options.getString('danh_muc') || 'Chung';
      const downloadUrl = interaction.options.getString('link_tai');
      const attachment = interaction.options.getAttachment('file_dinh_kem');

      if (!downloadUrl && !attachment) {
        return interaction.editReply({
          content: '❌ Bạn phải cung cấp ít nhất một **Link tải** hoặc một **File đính kèm**!',
        });
      }

      let localFileName = null;
      if (attachment) {
        try {
          const storageDir = shopService.getStorageDir();
          const ext = path.extname(attachment.name) || '';
          localFileName = `${Date.now()}_${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const savePath = path.join(storageDir, localFileName);

          const response = await axios({
            method: 'GET',
            url: attachment.url,
            responseType: 'stream',
          });

          const writer = fs.createWriteStream(savePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          logger.info(`[Shop Admin] Đã lưu file upload: ${savePath}`);
        } catch (err) {
          logger.error('[Shop Admin] Lỗi khi tải file đính kèm về server:', err);
          return interaction.editReply({
            content: `❌ Lỗi khi tải file đính kèm: ${err.message}`,
          });
        }
      }

      const item = shopService.addItem({
        name,
        description,
        price,
        downloadUrl,
        localFile: localFileName,
        category,
      });

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ ĐÃ THÊM FILE MỚI VÀO SHOP!')
        .setDescription(
          `📦 **Tên sản phẩm:** **${item.name}**\n` +
          `🆔 **Mã sản phẩm (ID):** \`${item.id}\`\n` +
          `💰 **Giá bán:** **${kingmcEconomy.formatMoney(item.price)}**\n` +
          `📂 **Danh mục:** \`${item.category}\`\n` +
          `📝 **Mô tả:** ${item.description}\n` +
          (item.downloadUrl ? `🔗 **Link tải:** ${item.downloadUrl}\n` : '') +
          (item.localFile ? `📁 **File lưu trữ:** \`${item.localFile}\`\n` : '')
        )
        .setFooter({ text: 'Người dùng có thể gõ /shop để mua file này ngay bây giờ!' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'delete') {
      const itemId = interaction.options.getString('item_id');
      const item = shopService.getItem(itemId);

      if (!item) {
        return interaction.reply({
          content: `❌ Không tìm thấy file có ID \`${itemId}\`!`,
          ephemeral: true,
        });
      }

      const deleted = shopService.deleteItem(itemId);
      if (deleted) {
        return interaction.reply({
          content: `✅ Đã xóa file **${item.name}** (\`${itemId}\`) khỏi shop!`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({
          content: `❌ Xóa file thất bại!`,
          ephemeral: true,
        });
      }
    }

    if (subcommand === 'list') {
      const items = shopService.getItems();
      if (!items || items.length === 0) {
        return interaction.reply({
          content: '📦 Kho hiện tại chưa có file nào. Hãy dùng `/shop-admin add` để thêm file!',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📋 DANH SÁCH FILE TRONG KHO (ADMIN)')
        .setDescription(
          items
            .map(
              (it, index) =>
                `**${index + 1}. [${it.name}]**\n` +
                `• ID: \`${it.id}\` | Giá: **${kingmcEconomy.formatMoney(it.price)}**\n` +
                `• Danh mục: \`${it.category}\` | Đã bán: **${it.salesCount || 0}** lượt\n` +
                `• Kiểu: ${it.localFile ? '📁 File upload' : '🔗 Link tải'}`
            )
            .join('\n\n')
        )
        .setFooter({ text: `Tổng cộng: ${items.length} file trong cửa hàng.` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (subcommand === 'edit') {
      const itemId = interaction.options.getString('item_id');
      const newPrice = interaction.options.getInteger('gia_moi');
      const newDesc = interaction.options.getString('mo_ta_moi');

      const updates = {};
      if (newPrice !== null) updates.price = newPrice;
      if (newDesc !== null) updates.description = newDesc;

      const edited = shopService.editItem(itemId, updates);
      if (!edited) {
        return interaction.reply({
          content: `❌ Không tìm thấy file có ID \`${itemId}\`!`,
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: `✅ Đã cập nhật file **${edited.name}** thành công!\nGiá: **${kingmcEconomy.formatMoney(edited.price)}**`,
        ephemeral: true,
      });
    }
  },
};
