import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { wordChainService } from '../services/games/wordChainService.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getCommandPrefix } from '../config/bot.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      // 1. Kiểm tra và xử lý Trò chơi Nối Từ
      const handled = await handleWordChain(message);
      if (handled) return;

      // 2. Xử lý lệnh Prefix cơ bản (nếu người dùng gõ lệnh bằng prefix)
      await handlePrefixCommand(message, client);
    } catch (error) {
      logger.error('Lỗi trong sự kiện messageCreate:', error);
    }
  },
};

/**
 * Xử lý trò chơi nối từ tự động trong kênh
 */
async function handleWordChain(message) {
  const result = wordChainService.processMessage(
    message.channel.id,
    message.author.id,
    message.content
  );

  if (!result.isWordChainChannel) {
    return false;
  }

  if (result.valid) {
    // Từ hợp lệ
    await message.react('✅').catch(() => {});
    if (result.streak % 10 === 0) {
      await message.react('🔥').catch(() => {});
    }

    const rewardText = result.reward > 0 ? ` (+${result.reward.toLocaleString('vi-VN')} xu KingMC)` : '';
    
    // Gửi thông báo từ tiếp theo
    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setDescription(
        `✅ **Nối từ chính xác!** [**${result.word}**]${rewardText}\n` +
        `🔥 Chuỗi liên tiếp: **${result.streak}** (Kỷ lục: **${result.highStreak}**)\n` +
        `👉 Người tiếp theo nối từ bắt đầu bằng chữ: **\`${result.nextSyllable}\`**`
      );

    await message.channel.send({ embeds: [embed] });
  } else {
    // Từ không hợp lệ
    await message.react('❌').catch(() => {});
    const reply = await message.reply({
      content: `❌ **Không hợp lệ:** ${result.message}`,
    }).catch(() => null);

    // Tự động xóa thông báo nhắc nhở sau 6 giây để kênh gọn gàng
    if (reply) {
      setTimeout(() => reply.delete().catch(() => {}), 6000);
    }
  }

  return true;
}

/**
 * Hỗ trợ lệnh prefix cơ bản (ví dụ !help, !ping)
 */
async function handlePrefixCommand(message, client) {
  try {
    const guildConfig = await getGuildConfig(client, message.guild.id);
    const prefix = guildConfig?.prefix || getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);

    if (!parsed) return;

    const { commandName } = parsed;
    const command = client.commands.get(commandName.toLowerCase());
    if (command && command.execute) {
      logger.info(`Thực thi lệnh prefix: ${commandName} bởi ${message.author.tag}`);
      // Với prefix commands, tạo một message context hoặc gợi ý dùng Slash Command
      await message.reply({
        content: `💡 Vui lòng sử dụng Slash Command: **/${commandName}** để có giao diện trực quan và đầy đủ nhất!`,
      }).catch(() => {});
    }
  } catch (error) {
    logger.error('Lỗi khi xử lý lệnh prefix:', error);
  }
}