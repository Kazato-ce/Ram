import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder,
} from 'discord.js';
import { shopService } from '../../services/shop/shopService.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🛒 Mở giao diện cửa hàng file - mua bằng tiền King.MC'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const items = shopService.getItems();

    if (!items || items.length === 0) {
      return interaction.reply({
        content: '🛒 Hiện tại cửa hàng chưa có file nào được mở bán. Vui lòng quay lại sau nhé!',
        ephemeral: true,
      });
    }

    const currentBalance = kingmcEconomy.getBalance(userId);

    // Tạo Select Menu với danh sách file
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`shop_select_item:${userId}`)
      .setPlaceholder('📂 Bấm vào đây để chọn file muốn mua...');

    items.slice(0, 25).forEach((item) => {
      const label = item.name.length > 90 ? item.name.substring(0, 87) + '...' : item.name;
      const desc = `${kingmcEconomy.formatMoney(item.price)} • ${item.category || 'Chung'}`.substring(0, 95);
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setDescription(desc)
          .setValue(item.id)
          .setEmoji('📁')
      );
    });

    const menuRow = new ActionRowBuilder().addComponents(selectMenu);

    // Embed giao diện chính
    const mainEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🛒 CỬA HÀNG FILE KING.MC')
      .setDescription(
        `Chào mừng <@${userId}> đến với cửa hàng file!\n` +
        `Tại đây bạn có thể sử dụng **tiền trong server King.MC** để mua các tài liệu, config, plugin và dữ liệu.\n\n` +
        `💰 **Số dư của bạn:** **${kingmcEconomy.formatMoney(currentBalance)}**\n` +
        `📦 **Tổng số file đang bán:** **${items.length}** file\n\n` +
        `👉 **Hướng dẫn:** Hãy chọn file bạn quan tâm từ Menu bên dưới để xem chi tiết và mua!`
      )
      .addFields(
        {
          name: '📋 Danh sách file nổi bật',
          value: items
            .slice(0, 5)
            .map((it, idx) => `**${idx + 1}.** ${it.name} — \`${kingmcEconomy.formatMoney(it.price)}\``)
            .join('\n') + (items.length > 5 ? `\n*...và ${items.length - 5} file khác.*` : ''),
        }
      )
      .setFooter({ text: 'Dùng /naptien để nạp xu từ game KingMC | /myfiles để xem file đã mua' })
      .setTimestamp();

    const response = await interaction.reply({
      embeds: [mainEmbed],
      components: [menuRow],
      fetchReply: true,
    });

    // Tạo collector lắng nghe tương tác
    const collector = response.createMessageComponentCollector({
      time: 300000, // 5 phút
    });

    let selectedItemId = null;

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({
          content: '❌ Bạn không phải người mở menu này. Hãy tự gõ `/shop` để mua sắm nhé!',
          ephemeral: true,
        });
      }

      // Xử lý khi chọn file từ Select Menu
      if (i.isStringSelectMenu() && i.customId.startsWith('shop_select_item:')) {
        selectedItemId = i.values[0];
        const item = shopService.getItem(selectedItemId);

        if (!item) {
          return i.reply({ content: '❌ File này không tồn tại hoặc đã bị xóa!', ephemeral: true });
        }

        const bal = kingmcEconomy.getBalance(userId);
        const canAfford = bal >= item.price;

        const detailEmbed = new EmbedBuilder()
          .setColor(canAfford ? 0x2ecc71 : 0xe74c3c)
          .setTitle(`📦 CHI TIẾT SẢN PHẨM: ${item.name}`)
          .setDescription(
            `📝 **Mô tả:**\n${item.description || 'Không có mô tả.'}\n\n` +
            `📂 **Danh mục:** \`${item.category || 'Chung'}\`\n` +
            `🏷️ **Giá bán:** **${kingmcEconomy.formatMoney(item.price)}**\n` +
            `🔥 **Lượt đã bán:** **${item.salesCount || 0}** lượt\n\n` +
            `💰 **Số dư của bạn:** **${kingmcEconomy.formatMoney(bal)}**\n` +
            `📊 **Trạng thái:** ${
              canAfford
                ? '✅ **Đủ tiền mua!** Bấm nút bên dưới để thanh toán.'
                : `❌ **Không đủ tiền!** (Còn thiếu **${kingmcEconomy.formatMoney(item.price - bal)}**)`
            }`
          )
          .setFooter({ text: 'File sẽ được gửi trực tiếp qua Tin nhắn riêng (DM) ngay sau khi mua!' })
          .setTimestamp();

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`shop_buy_btn:${selectedItemId}`)
            .setLabel(`Mua ngay (${kingmcEconomy.formatMoney(item.price)})`)
            .setEmoji('💳')
            .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary)
            .setDisabled(!canAfford),
          new ButtonBuilder()
            .setCustomId(`shop_back_btn`)
            .setLabel('Quay lại danh sách')
            .setEmoji('↩️')
            .setStyle(ButtonStyle.Secondary)
        );

        await i.update({
          embeds: [detailEmbed],
          components: [menuRow, btnRow],
        });
        return;
      }

      // Nút quay lại
      if (i.isButton() && i.customId === 'shop_back_btn') {
        const bal = kingmcEconomy.getBalance(userId);
        mainEmbed.setDescription(
          `Chào mừng <@${userId}> đến với cửa hàng file!\n\n` +
          `💰 **Số dư của bạn:** **${kingmcEconomy.formatMoney(bal)}**\n` +
          `📦 **Tổng số file đang bán:** **${items.length}** file\n\n` +
          `👉 Hãy chọn file từ Menu bên dưới để xem chi tiết!`
        );
        await i.update({
          embeds: [mainEmbed],
          components: [menuRow],
        });
        return;
      }

      // Xử lý khi bấm nút "Mua ngay"
      if (i.isButton() && i.customId.startsWith('shop_buy_btn:')) {
        const itemIdToBuy = i.customId.split(':')[1];
        const purchaseResult = shopService.purchaseItem(userId, itemIdToBuy);

        if (!purchaseResult.success) {
          return i.reply({
            content: `❌ Mua thất bại: ${purchaseResult.message}`,
            ephemeral: true,
          });
        }

        const { item, orderId, newBalance, localFilePath, downloadUrl } = purchaseResult;

        // Chuẩn bị nội dung gửi qua DM
        const dmEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('🎉 GIAO HÀNG THÀNH CÔNG - CỬA HÀNG KING.MC')
          .setDescription(
            `Cảm ơn bạn đã mua file **${item.name}**!\n\n` +
            `🧾 **Mã đơn hàng:** \`${orderId}\`\n` +
            `💵 **Giá đã trừ:** **${kingmcEconomy.formatMoney(item.price)}**\n` +
            `💰 **Số dư còn lại:** **${kingmcEconomy.formatMoney(newBalance)}**\n\n` +
            (downloadUrl ? `🔗 **Link tải trực tiếp:** [Bấm vào đây để tải file](${downloadUrl})\n\n` : '') +
            `*Bạn có thể xem lại file đã mua bất cứ lúc nào bằng lệnh \`/myfiles\`.*`
          )
          .setTimestamp();

        let dmSent = false;
        try {
          const dmOptions = { embeds: [dmEmbed] };
          if (localFilePath) {
            dmOptions.files = [new AttachmentBuilder(localFilePath, { name: item.name + '.zip' })];
          }
          await i.user.send(dmOptions);
          dmSent = true;
        } catch (err) {
          logger.warn(`[Shop] Không thể gửi DM cho user ${userId}:`, err?.message);
        }

        // Thông báo phản hồi cho người dùng
        const successEmbed = new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle('✅ THANH TOÁN THÀNH CÔNG!')
          .setDescription(
            `Bạn đã mua thành công **${item.name}** với giá **${kingmcEconomy.formatMoney(item.price)}**!\n` +
            `🧾 **Mã đơn hàng:** \`${orderId}\`\n` +
            `💰 **Số dư mới:** **${kingmcEconomy.formatMoney(newBalance)}**\n\n` +
            (dmSent
              ? `📬 **File đã được gửi tới Tin nhắn riêng (DM) của bạn!** Vui lòng kiểm tra hộp thư.`
              : `⚠️ **Bot không thể gửi tin nhắn riêng cho bạn (do bạn tắt DM)!**\n` +
                (downloadUrl
                  ? `👉 **Link tải file của bạn:** [Bấm vào đây để tải](${downloadUrl})`
                  : `👉 Vui lòng liên hệ Admin với mã đơn \`${orderId}\` để nhận file.`))
          )
          .setTimestamp();

        await i.reply({ embeds: [successEmbed], ephemeral: true });

        // Cập nhật lại giao diện chính
        mainEmbed.setDescription(
          `Chào mừng <@${userId}> đến với cửa hàng file!\n\n` +
          `💰 **Số dư của bạn:** **${kingmcEconomy.formatMoney(newBalance)}**\n` +
          `✅ Bạn vừa mua: **${item.name}**\n\n` +
          `👉 Hãy chọn file khác từ Menu bên dưới nếu bạn muốn mua thêm!`
        );

        await interaction.editReply({
          embeds: [mainEmbed],
          components: [menuRow],
        });
      }
    });

    collector.on('end', async () => {
      // Làm mờ các components khi hết thời gian
      const disabledRow = ActionRowBuilder.from(menuRow);
      disabledRow.components.forEach((c) => c.setDisabled(true));
      await interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  },
};
