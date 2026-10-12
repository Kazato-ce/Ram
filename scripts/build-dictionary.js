import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../data/vietnamese_words.json');

const words = new Set([
  // Bầu trời, thời tiết, thiên nhiên
  'mặt trời', 'trời đất', 'đất nước', 'nước non', 'non sông', 'sông núi', 'núi non', 'núi lửa', 'lửa trại', 'trại hè',
  'trời xanh', 'xanh ngắt', 'ngắt lời', 'lời nói', 'nói chuyện', 'chuyện trò', 'trò chơi', 'chơi bời', 'bời bời', 'bầu trời',
  'mùa hè', 'hè thu', 'thu đông', 'đông lạnh', 'lạnh lẽo', 'lẽo đẽo', 'mây mưa', 'mưa rào', 'rào giậu', 'giậu đổ',
  'sấm sét', 'sét đánh', 'đánh cá', 'cá chép', 'chép phạt', 'phạt đền', 'đền tội', 'tội lỗi', 'lỗi lầm', 'lầm than',
  'gió bão', 'bão bùng', 'sương mù', 'mù sương', 'biển cả', 'cả gan', 'sóng gió', 'gió thoảng', 'thoảng qua', 'hoa lá',
  'lá xanh', 'ánh sáng', 'sáng rực', 'rực rỡ', 'rực sáng', 'bóng đêm', 'đêm tối', 'tối tăm', 'tăm tối', 'trăng rằm', 'rằm tháng',
  'sao sáng', 'sáng sủa', 'sủa gâu', 'sương sớm', 'sớm mai', 'mai sau', 'sau này', 'này đây', 'đây đó', 'đó đây',

  // Con người, tính cách, giao tiếp
  'con người', 'người ta', 'ta đây', 'ông bà', 'bà con', 'con cháu', 'cháu chắt', 'anh em', 'em út', 'út ít',
  'cha mẹ', 'mẹ cha', 'mẹ hiền', 'hiền từ', 'từ bi', 'bi ai', 'ai oán', 'oán hận', 'hận thù', 'thù địch',
  'bạn bè', 'bè bạn', 'thân thiết', 'thiết tha', 'tha thứ', 'thứ tha', 'cô chú', 'chú bác', 'bác ái', 'ái ân',
  'gia đình', 'đình làng', 'làng quê', 'quê hương', 'hương thơm', 'thơm tho', 'thơm phức', 'phức tạp', 'tạp chí',
  'chí hướng', 'hướng dẫn', 'dẫn đầu', 'đầu đàn', 'đàn anh', 'anh hùng', 'hùng dũng', 'dũng cảm', 'cảm ơn', 'ơn nghĩa',
  'nghĩa vụ', 'vụ việc', 'việc làm', 'làm ăn', 'ăn ở', 'ở nhà', 'nhà cửa', 'cửa hàng', 'hàng quán', 'quán xá',
  'phố phường', 'phường xã', 'xã hội', 'hội chợ', 'chợ búa', 'búa tạ', 'tạ ơn', 'ơn huệ', 'huệ trắng', 'trắng tinh',

  // Cảm xúc & tâm lý
  'vui vẻ', 'vẻ đẹp', 'đẹp đẽ', 'đẽo gọt', 'gọt giũa', 'giũa mài', 'mài giũa', 'buồn bã', 'bã mía', 'mía đường',
  'đường phố', 'hạnh phúc', 'phúc lợi', 'lợi ích', 'ích kỷ', 'kỷ luật', 'luật pháp', 'pháp luật', 'luật sư',
  'sư tử', 'tử tế', 'tế nhị', 'nhị hoa', 'hoa hồng', 'hồng hào', 'hào hiệp', 'hiệp sĩ', 'sĩ diện', 'diện mạo',
  'mạo hiểm', 'hiểm nghèo', 'nghèo khó', 'khó khăn', 'khăn tay', 'tay chân', 'chân thật', 'thật thà', 'thà rằng',
  'kiên trì', 'trì hoãn', 'hoãn lại', 'lại đây', 'cần cù', 'cù lao', 'lao động', 'động viên', 'viên kẹo',
  'kẹo ngọt', 'ngọt ngào', 'ngào ngạt', 'chăm chỉ', 'chỉ bảo', 'bảo vệ', 'vệ sinh', 'sinh sống', 'sống còn',
  'còn lại', 'yêu thương', 'thương nhớ', 'nhớ nhung', 'nhung hươu', 'hươu sao',

  // Động vật & thực vật
  'chó mèo', 'mèo mướp', 'mướp đắng', 'đắng cay', 'cay đắng', 'gà vịt', 'vịt cỏ', 'cỏ cây', 'cây cối', 'cối xay',
  'xay lúa', 'lúa gạo', 'gạo nếp', 'nếp sống', 'sống động', 'động vật', 'vật nuôi', 'nuôi nấng', 'nấng nuôi',
  'trâu bò', 'bò sữa', 'sữa tươi', 'tươi cười', 'cười vang', 'vang dội', 'dội nước', 'nước ngọt', 'ngọt lịm',
  'ong bướm', 'bướm hoa', 'hoa mai', 'hoa đào', 'đào tạo', 'tạo tác', 'tác phong', 'phong ba', 'ba hoa', 'hoa tai',
  'tai họa', 'họa mi', 'mi mắt', 'mắt ngọc', 'ngọc ngà', 'ngà voi', 'voi rừng', 'rừng rú', 'rú ga', 'ga tàu',
  'tàu thủy', 'thủy thủ', 'thủ đô', 'đô thị', 'thị thành', 'thành phố', 'phố xá', 'xá tội',

  // Công nghệ, máy tính, học tập
  'máy tính', 'tính toán', 'toán học', 'học sinh', 'sinh viên', 'viên bi', 'bi kịch', 'kịch bản', 'bản đồ', 'đồ đạc',
  'điện thoại', 'tủ lạnh', 'lạnh buốt', 'buốt giá', 'giá cả', 'bàn ghế', 'ghế ngồi', 'ngồi chơi', 'chơi game',
  'xe cộ', 'xe đạp', 'đạp xe', 'xe máy', 'máy bay', 'bay lượn', 'lượn vòng', 'vòng vo', 'vo ve', 'xe khách',
  'khách hàng', 'hàng hóa', 'hóa đơn', 'đơn giản', 'giản dị', 'dịu dàng', 'thuyền bè', 'bè mảng',
  'miếng ăn', 'ăn uống', 'uống trà', 'trà sữa', 'sữa chua', 'chua chát', 'chát chúa', 'chúa tể',

  // Kinh tế, thương mại
  'tiền bạc', 'bạc bẽo', 'tiền tài', 'tài năng', 'năng suất', 'suất ăn', 'tiền nong', 'ngân hàng',
  'hàng hiệu', 'hiệu quả', 'quả nhiên', 'nhiên liệu', 'liệu hồn', 'hồn ma', 'ma mãnh', 'mãnh liệt', 'kinh tế',
  'kinh doanh', 'doanh nghiệp', 'nghiệp chướng', 'thương mại', 'đầu tư', 'tư bản', 'bản tính', 'tính nết',
  'lợi nhuận', 'nhuận bút', 'bút mực', 'mực tàu', 'tàu hỏa', 'hỏa tốc', 'tốc độ', 'độ lượng',

  // Tri thức, nghệ thuật, thể thao
  'sách vở', 'vở kịch', 'bút viết', 'viết lách', 'lách luật', 'trường học', 'học hành', 'hành động', 'động tĩnh',
  'tĩnh tâm', 'tâm hồn', 'hồn nhiên', 'thầy cô', 'cô giáo', 'giáo dục', 'dục vọng', 'tri thức',
  'văn hóa', 'hóa học', 'học hỏi', 'hỏi han', 'lịch sử', 'sử sách', 'địa lý', 'lý lẽ', 'lẽ phải',
  'nghệ thuật', 'thuật ngữ', 'ngữ pháp', 'y học', 'học viện', 'viên thuốc', 'thuốc bổ', 'bổ dưỡng',
  'bóng đá', 'đá bóng', 'bóng chuyền', 'chuyền bóng', 'cầu lông', 'lông vũ', 'vũ đạo', 'đạo diễn', 'diễn viên',
  'viên đạn', 'đạn bắn', 'bắn tỉa', 'tỉa cành', 'cành cây', 'cây đa', 'đa dạng', 'dạng hình', 'hình ảnh',
  'ảnh chụp', 'chụp hình', 'kim cương', 'cương quyết', 'quyết tâm', 'tâm huyết', 'huyết quản', 'quản lý',
  'lý thuyết', 'thuyết phục', 'phục thù', 'thư viện', 'viện bảo', 'bảo tàng', 'tàng trữ', 'trữ tình', 'tình cảm',
  'cảm xúc', 'xúc động', 'động đất', 'đất cát', 'cát trắng', 'trắng muốt',
]);

const cleanWords = Array.from(words).map(w => w.trim().toLowerCase());
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify(cleanWords, null, 2), 'utf-8');
console.log(`Đã xuất ${cleanWords.length} từ tiếng Việt vào ${DATA_FILE}`);
