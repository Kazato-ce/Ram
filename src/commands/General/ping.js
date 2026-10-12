import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { minecraftBot } from '../../services/minecraft/mineflayerBot.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Kiểm tra độ trễ của Bot và kết nối tới server Minecraft'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: '🏓 Đang đo độ trễ...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;
    const isMcConnected = minecraftBot.isConnected;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('🏓 PONG!')
      .addFields(
        { name: '📡 Độ trễ Discord (Roundtrip)', value: `\`${roundtrip}ms\``, inline: true },
        { name: '⚡ WebSocket Ping', value: `\`${wsPing}ms\``, inline: true },
        {
          name: '🎮 Minecraft Bot (King.MC)',
          value: isMcConnected ? '🟢 **Đang kết nối**' : '🔴 **Chưa kết nối / Đang đợi kết nối**',
          inline: true,
        }
      )
      .setTimestamp();

    return interaction.editReply({ content: null, embeds: [embed] });
  },
};
