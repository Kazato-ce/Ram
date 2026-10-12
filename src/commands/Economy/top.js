import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { kingmcEconomy } from '../../services/economy/kingmcEconomy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('🏆 Bảng xếp hạng đại gia tiền King.MC'),

  async execute(interaction) {
    const leaderboard = kingmcEconomy.getLeaderboard(10);

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.reply({
        content: '🏆 Chưa có người dùng nào có số dư trên bảng xếp hạng!',
        ephemeral: true,
      });
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

    const description = leaderboard
      .map((user, idx) => {
        const medal = medals[idx] || `${idx + 1}.`;
        const ignText = user.ign ? `(\`${user.ign}\`)` : '';
        return `${medal} <@${user.userId}> ${ignText} — **${kingmcEconomy.formatMoney(user.balance)}**`;
      })
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏆 BẢNG XẾP HẠNG ĐẠI GIA KING.MC')
      .setDescription(description)
      .setFooter({ text: 'Dùng /sodu để xem thứ hạng và số dư của bạn' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
