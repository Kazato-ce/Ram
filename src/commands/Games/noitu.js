import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { wordChainService } from '../../services/games/wordChainService.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('noitu')
    .setDescription('🎮 Quản lý và xem trạng thái trò chơi Nối Từ tiếng Việt')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Thiết lập kênh hiện tại hoặc chỉ định làm kênh chơi Nối Từ')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Kênh chỉ định chơi nối từ (mặc định: kênh hiện tại)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('start_word')
            .setDescription('Từ bắt đầu (gồm 2 tiếng, ví dụ: "bầu trời")')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('reward')
            .setDescription('Số xu KingMC thưởng cho mỗi từ nối đúng (mặc định: 50 xu, 0 = không thưởng)')
            .setRequired(false)
            .setMinValue(0)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Làm mới lượt chơi và bắt đầu với một từ mới')
        .addStringOption((opt) =>
          opt
            .setName('start_word')
            .setDescription('Từ bắt đầu mới (2 tiếng, ví dụ: "mặt trời")')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('stop')
        .setDescription('Dừng trò chơi nối từ ở kênh này')
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Xem trạng thái, từ hiện tại và kỷ lục chuỗi nối từ')
    )
    .addSubcommand((sub) =>
      sub
        .setName('addword')
        .setDescription('Thêm từ ghép hợp lệ vào từ điển tiếng Việt của bot')
        .addStringOption((opt) =>
          opt
            .setName('word')
            .setDescription('Từ ghép 2 tiếng muốn thêm (ví dụ: hoa hồng)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

    if (subcommand === 'setup') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: '❌ Bạn cần có quyền **Quản lý kênh (Manage Channels)** để thiết lập kênh nối từ!',
          ephemeral: true,
        });
      }

      const startWord = interaction.options.getString('start_word') || 'bầu trời';
      const reward = interaction.options.getInteger('reward') ?? 50;

      const state = wordChainService.setupChannel(
        targetChannel.id,
        interaction.guildId,
        startWord,
        reward
      );

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🎮 THIẾT LẬP KÊNH NỐI TỪ THÀNH CÔNG!')
        .setDescription(
          `Kênh <#${targetChannel.id}> đã được cài đặt làm khu vực chơi Nối Từ tiếng Việt!\n\n` +
          `📌 **Luật chơi:**\n` +
          `• Mỗi người chơi gửi **1 từ ghép gồm 2 tiếng**.\n` +
          `• Tiếng đầu tiên phải trùng với tiếng cuối cùng của từ trước đó.\n` +
          `• Không được tự nối 2 lần liên tiếp (phải có người khác đối lại).\n` +
          `• Không được dùng lại từ đã xuất hiện trong cùng 1 lượt chơi.\n\n` +
          `🎯 **Từ mở đầu:** **\`${state.currentWord}\`**\n` +
          `👉 Người tiếp theo nối từ bắt đầu bằng chữ: **\`${state.lastWordSecondSyllable}\`**\n` +
          `💰 **Phần thưởng mỗi từ đúng:** **${reward > 0 ? kingmcEconomy.formatMoney(reward) : 'Không có'}**`
        )
        .setFooter({ text: 'Gõ từ trực tiếp vào kênh này để tham gia!' })
        .setTimestamp();

      if (targetChannel.id !== interaction.channelId) {
        await targetChannel.send({ embeds: [embed] });
        return interaction.reply({
          content: `✅ Đã thiết lập kênh nối từ tại <#${targetChannel.id}>!`,
          ephemeral: true,
        });
      } else {
        return interaction.reply({ embeds: [embed] });
      }
    }

    if (subcommand === 'reset') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: '❌ Bạn cần có quyền **Quản lý kênh** để làm mới lượt chơi!',
          ephemeral: true,
        });
      }

      const startWord = interaction.options.getString('start_word') || 'mặt trời';
      const state = wordChainService.resetChannel(interaction.channelId, startWord);

      if (!state) {
        return interaction.reply({
          content: '❌ Kênh này chưa được thiết lập làm kênh nối từ! Dùng `/noitu setup` trước.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔄 LÀM MỚI LƯỢT CHƠI NỐI TỪ!')
        .setDescription(
          `Ván chơi nối từ đã được bắt đầu lại!\n\n` +
          `🎯 **Từ mở đầu:** **\`${state.currentWord}\`**\n` +
          `👉 Người tiếp theo nối từ bắt đầu bằng chữ: **\`${state.lastWordSecondSyllable}\`**`
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'stop') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({
          content: '❌ Bạn cần quyền Quản lý kênh để dừng trò chơi!',
          ephemeral: true,
        });
      }

      const stopped = wordChainService.disableChannel(interaction.channelId);
      if (!stopped) {
        return interaction.reply({
          content: '❌ Kênh này hiện không có trò chơi nối từ nào đang hoạt động.',
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: '🛑 Đã dừng trò chơi nối từ ở kênh này!',
      });
    }

    if (subcommand === 'status') {
      const state = wordChainService.getChannelState(interaction.channelId);
      if (!state || !state.enabled) {
        return interaction.reply({
          content: 'ℹ️ Kênh này chưa bật trò chơi nối từ. Dùng `/noitu setup` để bắt đầu!',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle('📊 THÔNG TIN TRÒ CHƠI NỐI TỪ')
        .addFields(
          { name: '🎯 Từ hiện tại', value: `**${state.currentWord}**`, inline: true },
          { name: '👉 Chữ cần nối tiếp', value: `**\`${state.lastWordSecondSyllable}\`**`, inline: true },
          { name: '👤 Người vừa nối', value: state.lastUserId ? `<@${state.lastUserId}>` : 'Chưa có', inline: true },
          { name: '🔥 Chuỗi hiện tại', value: `**${state.streak}** từ`, inline: true },
          { name: '🏆 Kỷ lục chuỗi dài nhất', value: `**${state.highStreak}** từ`, inline: true },
          { name: '💰 Thưởng mỗi từ đúng', value: `${state.rewardPerWord > 0 ? kingmcEconomy.formatMoney(state.rewardPerWord) : 'Không có'}`, inline: true },
          { name: '📚 Số từ đã dùng trong ván', value: `${state.usedWords?.size || 0} từ`, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'addword') {
      const word = interaction.options.getString('word');
      const added = wordChainService.addWordToDictionary(word);
      if (!added) {
        return interaction.reply({
          content: '❌ Từ không hợp lệ! Từ phải gồm đúng 2 tiếng (Ví dụ: "hoa hồng", "mặt trời").',
          ephemeral: true,
        });
      }

      return interaction.reply({
        content: `✅ Đã thêm từ **"${word.toLowerCase().trim()}"** vào từ điển tiếng Việt của bot!`,
      });
    }
  },
};
