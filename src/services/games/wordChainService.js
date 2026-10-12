import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
import { kingmcEconomy } from '../economy/kingmcEconomy.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../data');
const WORDCHAIN_CONFIG_FILE = path.join(DATA_DIR, 'wordchain_config.json');
const DICTIONARY_FILE = path.join(DATA_DIR, 'vietnamese_words.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

class WordChainService {
  constructor() {
    this.dictionary = new Set();
    this.channels = {}; // channelId -> channel state
    this.loadDictionary();
    this.loadConfig();
  }

  loadDictionary() {
    try {
      if (fs.existsSync(DICTIONARY_FILE)) {
        const raw = fs.readFileSync(DICTIONARY_FILE, 'utf-8');
        const words = JSON.parse(raw);
        for (const w of words) {
          this.dictionary.add(this.normalize(w));
        }
        logger.info(`[WordChain] Đã tải từ điển tiếng Việt: ${this.dictionary.size} từ ghép.`);
      } else {
        // Tạo bộ từ điển nền tảng phong phú
        this.initDefaultDictionary();
      }
    } catch (error) {
      logger.error('[WordChain] Lỗi tải từ điển tiếng Việt:', error);
      this.initDefaultDictionary();
    }
  }

  initDefaultDictionary() {
    // Bộ từ ghép tiếng Việt chuẩn phổ biến
    const baseWords = [
      'mặt trời', 'trời đất', 'đất nước', 'nước non', 'non sông', 'sông núi', 'núi lửa', 'lửa trại', 'trại lính', 'lính thủy',
      'thủy triều', 'triều đình', 'đình làng', 'làng xóm', 'xóm giềng', 'giềng mối', 'mối tình', 'tình yêu', 'yêu thương', 'thương nhớ',
      'nhớ nhung', 'nhung hươu', 'hươu sao', 'sao sáng', 'sáng sủa', 'sủa gâu', 'bầu trời', 'trời xanh', 'xanh ngắt', 'ngắt lời',
      'lời nói', 'nói chuyện', 'chuyện trò', 'trò chơi', 'chơi bời', 'bời bời', 'bầu bạn', 'bạn bè', 'bè phái', 'phái đẹp',
      'đẹp đẽ', 'đẽo gọt', 'gọt giũa', 'hoa hồng', 'hồng hào', 'hào quang', 'quang minh', 'minh bạch', 'bạch kim', 'kim cương',
      'cương quyết', 'quyết tâm', 'tâm huyết', 'huyết quản', 'quản lý', 'lý thuyết', 'thuyết phục', 'phục thù', 'thù hận', 'hận thù',
      'thư viện', 'viện bảo', 'bảo tàng', 'tàng trữ', 'trữ tình', 'tình cảm', 'cảm xúc', 'xúc động', 'động viên', 'viên kẹo',
      'kẹo kéo', 'kéo co', 'co giật', 'giật mình', 'mình mẩy', 'mẩy hạt', 'hạt gạo', 'gạo nếp', 'nếp sống', 'sống còn',
      'còn lại', 'lại đây', 'máy tính', 'tính toán', 'toán học', 'học tập', 'tập làm', 'làm ăn', 'ăn uống', 'uống nước',
      'nước mắm', 'mắm tôm', 'tôm sú', 'sú vẹt', 'vẹt đuôi', 'cây cối', 'cối xay', 'xay lúa', 'lúa mì', 'mì chính',
      'chính trực', 'trực thăng', 'thăng bằng', 'bằng chứng', 'chứng minh', 'minh tinh', 'tinh tế', 'tế bào', 'bào thai', 'thai nhi',
      'nhi đồng', 'đồng lòng', 'lòng dạ', 'dạ tiệc', 'tiệc tùng', 'tùng cúc', 'cúc hoa', 'hoa lan', 'lan tỏa', 'tỏa sáng',
      'sáng kiến', 'kiến thức', 'thức tỉnh', 'tỉnh táo', 'táo bạo', 'bạo lực', 'lực lượng', 'lượng giác', 'giác quan', 'quan điểm',
      'điểm số', 'số lượng', 'lượng vàng', 'vàng hoe', 'hoe hoe', 'màu sắc', 'sắc đẹp', 'đẹp tươi', 'tươi trẻ', 'trẻ trung',
      'trung thực', 'thực tế', 'tế nhị', 'nhị hoa', 'hoa mai', 'mai sau', 'sau này', 'này đây', 'xe cộ', 'cộ xe',
      'xe đạp', 'đạp xe', 'xe máy', 'máy bay', 'bay lượn', 'lượn lờ', 'lờ mờ', 'mờ ảo', 'ảo ảnh', 'ảnh hưởng',
      'hưởng thụ', 'thụ phấn', 'phấn hoa', 'hoa đào', 'đào tạo', 'tạo tác', 'tác phong', 'phong ba', 'ba hoa', 'hoa tai',
      'tai họa', 'họa mi', 'mi mắt', 'mắt ngọc', 'ngọc ngà', 'ngà voi', 'voi rừng', 'rừng rú', 'rú ga', 'ga tàu',
      'tàu thủy', 'thủy thủ', 'thủ đô', 'đô thị', 'thị thành', 'thành phố', 'phố xá', 'xá tội', 'tội lỗi', 'lỗi lầm',
      'lầm lỡ', 'lỡ hẹn', 'hẹn ước', 'ước mơ', 'mơ mộng', 'mộng mị', 'mị dân', 'dân chủ', 'chủ nghĩa', 'nghĩa vụ',
      'vụ án', 'án mạng', 'mạng xã', 'xã hội', 'hội nghị', 'nghị quyết', 'quyết định', 'định mệnh', 'mệnh lệnh', 'lệnh bài',
      'bài học', 'học sinh', 'sinh viên', 'viên đạn', 'đạn bắn', 'bắn tỉa', 'tỉa cành', 'cành cây', 'cây đa', 'đa dạng',
      'dạng hình', 'hình ảnh', 'ảnh chụp', 'chụp hình', 'hình tam', 'tam giác', 'giác mạc', 'mạc sầu', 'sầu đông', 'đông lạnh',
      'lạnh lẽo', 'lẽo đẽo', 'đẽo cày', 'cày cấy', 'cấy lúa', 'lúa thơm', 'thơm tho', 'thoang thoảng', 'vui vẻ', 'vẻ vang',
      'vang dội', 'dội nước', 'nước tương', 'tương lai', 'lai lịch', 'lịch sử', 'sử thi', 'thi cử', 'cử tạ', 'tạ ơn',
      'ơn huệ', 'huệ trắng', 'trắng tinh', 'tinh hoa', 'hoa hậu', 'hậu phương', 'phương hướng', 'hướng dẫn', 'dẫn đường', 'đường đi',
      'đi đứng', 'đứng đắn', 'đắn đo', 'đo lường', 'lường trước', 'trước mắt', 'mắt mèo', 'mèo mướp', 'mướp đắng', 'đắng cay',
      'cay đắng', 'đắng ngắt', 'ngắt hoa', 'hoa quỳnh', 'quỳnh anh', 'anh dũng', 'dũng cảm', 'cảm ơn', 'ơn nghĩa', 'nghĩa hiệp',
      'hiệp sĩ', 'sĩ phu', 'phu thê', 'thê thiếp', 'thiếp cưới', 'cưới xin', 'xin lỗi', 'lỗi thời', 'thời gian', 'gian truân',
      'truân chuyên', 'chuyên cần', 'cần cù', 'cù lao', 'lao động', 'động đất', 'đất cát', 'cát trắng', 'trắng muốt', 'muốt trắng',
      'chim non', 'non nớt', 'nớt non', 'chim sẻ', 'sẻ nâu', 'nâu sẫm', 'sẫm màu', 'màu da', 'da dẻ', 'dẻ sườn',
      'sườn non', 'non cao', 'cao thượng', 'thượng đế', 'đế vương', 'vương quốc', 'quốc gia', 'gia đình', 'đình chùa', 'chùa chiền',
      'chiền chùa', 'nhà cửa', 'cửa sổ', 'sổ tay', 'tay nghề', 'nghề nghiệp', 'nghiệp vụ', 'vụ mùa', 'mùa màng', 'màng mộng',
      'bóng đá', 'đá bóng', 'đá hoa', 'hoa giấy', 'giấy tờ', 'tờ rơi', 'rơi rụng', 'rụng rời', 'rời rạc', 'rạc rài',
      'chuột nhắt', 'chuột cống', 'cống rãnh', 'rãnh mương', 'mương máng', 'máng nước', 'nước mía', 'mía đường', 'đường phố', 'phố phường',
      'tiền bạc', 'bạc bẽo', 'tiền nong', 'nong tằm', 'tằm dâu', 'dâu tây', 'tây nguyên', 'nguyên vẹn', 'vẹn toàn', 'toàn diện',
      'diện tích', 'tích cực', 'cực đoan', 'đoan trang', 'trang nghiêm', 'nghiêm khắc', 'khắc phục', 'phục vụ', 'vụ việc', 'việc làm',
    ];

    for (const w of baseWords) {
      this.dictionary.add(this.normalize(w));
    }

    try {
      fs.writeFileSync(DICTIONARY_FILE, JSON.stringify(Array.from(this.dictionary), null, 2), 'utf-8');
      logger.info(`[WordChain] Khởi tạo từ điển mặc định: ${this.dictionary.size} từ ghép.`);
    } catch (e) {
      logger.error('[WordChain] Lỗi ghi file từ điển mặc định:', e);
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(WORDCHAIN_CONFIG_FILE)) {
        const raw = fs.readFileSync(WORDCHAIN_CONFIG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.channels = {};
        for (const [chId, data] of Object.entries(parsed)) {
          this.channels[chId] = {
            ...data,
            usedWords: new Set(data.usedWords || []),
          };
        }
      }
    } catch (e) {
      logger.error('[WordChain] Lỗi tải cấu hình nối từ:', e);
    }
  }

  saveConfig() {
    try {
      const serializable = {};
      for (const [chId, data] of Object.entries(this.channels)) {
        serializable[chId] = {
          ...data,
          usedWords: Array.from(data.usedWords || []),
        };
      }
      fs.writeFileSync(WORDCHAIN_CONFIG_FILE, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (e) {
      logger.error('[WordChain] Lỗi lưu cấu hình nối từ:', e);
    }
  }

  normalize(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Bật kênh nối từ
   */
  setupChannel(channelId, guildId, startWord = 'bầu trời', rewardPerWord = 100) {
    const normStart = this.normalize(startWord);
    const parts = normStart.split(' ');
    const firstWord = parts.length === 2 ? normStart : 'mặt trời';
    const syllables = firstWord.split(' ');

    this.channels[channelId] = {
      channelId,
      guildId,
      enabled: true,
      currentWord: firstWord,
      lastUserId: null,
      lastWordSecondSyllable: syllables[1],
      usedWords: new Set([firstWord]),
      streak: 1,
      highStreak: 1,
      rewardPerWord: parseInt(rewardPerWord, 10) || 0,
    };

    // Đảm bảo từ bắt đầu có trong từ điển
    this.dictionary.add(firstWord);
    this.saveConfig();

    return this.channels[channelId];
  }

  /**
   * Tắt kênh nối từ
   */
  disableChannel(channelId) {
    if (this.channels[channelId]) {
      this.channels[channelId].enabled = false;
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * Reset lại chuỗi từ ở kênh
   */
  resetChannel(channelId, newWord = 'mặt trời') {
    if (!this.channels[channelId]) return null;
    const norm = this.normalize(newWord);
    const syllables = norm.split(' ');
    const word = syllables.length === 2 ? norm : 'mặt trời';

    this.channels[channelId].currentWord = word;
    this.channels[channelId].lastUserId = null;
    this.channels[channelId].lastWordSecondSyllable = word.split(' ')[1];
    this.channels[channelId].usedWords = new Set([word]);
    this.channels[channelId].streak = 1;
    this.channels[channelId].enabled = true;

    this.dictionary.add(word);
    this.saveConfig();
    return this.channels[channelId];
  }

  getChannelState(channelId) {
    return this.channels[channelId] || null;
  }

  /**
   * Xử lý từ người chơi nhắn trong kênh nối từ
   */
  processMessage(channelId, userId, content) {
    const state = this.channels[channelId];
    if (!state || !state.enabled) {
      return { isWordChainChannel: false };
    }

    const norm = this.normalize(content);
    const words = norm.split(' ');

    // 1. Phải là từ 2 tiếng
    if (words.length !== 2) {
      return {
        isWordChainChannel: true,
        valid: false,
        reason: 'INVALID_FORMAT',
        message: 'Từ nối phải gồm đúng **2 tiếng** (Ví dụ: *bầu trời*, *trời xanh*).',
      };
    }

    // 2. Không được tự nối 2 lần liên tiếp
    if (state.lastUserId === userId) {
      return {
        isWordChainChannel: true,
        valid: false,
        reason: 'SELF_REPEAT',
        message: 'Bạn vừa nối từ trước đó rồi! Hãy nhường lượt cho người khác nối nhé.',
      };
    }

    // 3. Tiếng đầu của từ mới phải trùng tiếng cuối của từ trước
    const requiredSyllable = state.lastWordSecondSyllable;
    if (words[0] !== requiredSyllable) {
      return {
        isWordChainChannel: true,
        valid: false,
        reason: 'MISMATCH',
        message: `Từ của bạn phải bắt đầu bằng chữ **"${requiredSyllable}"** (Từ trước: *${state.currentWord}*).`,
        requiredSyllable,
      };
    }

    // 4. Kiểm tra từ đã dùng trong ván này chưa
    if (state.usedWords.has(norm)) {
      return {
        isWordChainChannel: true,
        valid: false,
        reason: 'ALREADY_USED',
        message: `Từ **"${norm}"** đã được dùng trong lượt chơi này rồi! Hãy chọn từ khác.`,
      };
    }

    // 5. Kiểm tra từ điển tiếng Việt (nếu chưa có trong từ điển, cho phép mở rộng nếu hợp lệ hoặc từ chối)
    const inDict = this.dictionary.has(norm);
    if (!inDict) {
      // Tự động học từ mới nếu từ có nghĩa hoặc từ ghép hợp lý
      // Để tránh từ bậy bạ vô nghĩa, chỉ nhận từ trong từ điển, hoặc thêm vào nếu là từ ghép tiếng Việt hợp lý
      return {
        isWordChainChannel: true,
        valid: false,
        reason: 'NOT_IN_DICTIONARY',
        message: `Từ **"${norm}"** không có trong từ điển tiếng Việt! Hãy thử một từ khác nhé.`,
      };
    }

    // NỐI TỪ HỢP LỆ!
    state.currentWord = norm;
    state.lastUserId = userId;
    state.lastWordSecondSyllable = words[1];
    state.usedWords.add(norm);
    state.streak += 1;
    if (state.streak > (state.highStreak || 1)) {
      state.highStreak = state.streak;
    }

    // Thưởng tiền KingMC nếu có cấu hình
    let rewardAmount = 0;
    if (state.rewardPerWord && state.rewardPerWord > 0) {
      rewardAmount = state.rewardPerWord;
      kingmcEconomy.addBalance(userId, rewardAmount, `Thưởng nối từ: ${norm}`);
    }

    this.saveConfig();

    return {
      isWordChainChannel: true,
      valid: true,
      word: norm,
      nextSyllable: words[1],
      streak: state.streak,
      highStreak: state.highStreak,
      reward: rewardAmount,
      balance: kingmcEconomy.getBalance(userId),
    };
  }

  /**
   * Thêm từ vào từ điển tiếng Việt
   */
  addWordToDictionary(word) {
    const norm = this.normalize(word);
    if (norm.split(' ').length === 2) {
      this.dictionary.add(norm);
      try {
        fs.writeFileSync(DICTIONARY_FILE, JSON.stringify(Array.from(this.dictionary), null, 2), 'utf-8');
      } catch (e) {}
      return true;
    }
    return false;
  }
}

export const wordChainService = new WordChainService();
