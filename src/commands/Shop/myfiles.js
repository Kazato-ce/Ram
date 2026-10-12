import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  AttachmentBuilder,
} from 'discord.js';
import { shopService } from '../../services/shop/shopService.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';
import path from 'path';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('myfiles')
    .setDescription('📂 Xem lại danh sách các file bạn đã mua và tải lại'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = kingmcEconomy.getUser(userId);

    const purchases = user.purchases || [];
    if (purchases.length === 0) {
      return interaction.reply({
        content: '📂 Bạn chưa mua file nào từ cửa hàng! Hãy dùng lệnh `/shop` để khám phá và mua file nhé.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle('📂 KHO FILE ĐÃ MUA CỦA BẠN')
      .setDescription(
        `Dưới đây là danh sách **${purchases.length}** file bạn đã mua bằng tiền King.MC.\n` +
        `Bạn có thể tải lại bất cứ lúc nào:\n\n` +
        purchases
          .map((p, index) => {
            const item = shopService.getItem(p.itemId);
            const linkText = item?.downloadUrl ? `[Tải về](${item.downloadUrl})` : '(File đính kèm)';
            return `**${index + 1}. ${p.itemName}**\n• Giá lúc mua: \`${kingmcEconomy.formatMoney(p.price)}\`\n• Link tải: ${linkText}`;
          })
          .join('\n\n')
      )
      .setFooter({ text: 'Bảo lưu trọn đời các file bạn đã mua!' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
