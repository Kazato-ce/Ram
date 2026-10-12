# 🤖 KingMC Discord Bot (Nối Từ, Chẵn Lẻ & Cửa Hàng Bán File)

Bot Discord tối ưu hóa riêng biệt cho cộng đồng server Minecraft **King.MC**, tập trung vào 2 mục đích chính:
1. **🎮 Minigames:**
   - **Trò chơi Nối Từ tiếng Việt:** Tích hợp bộ từ điển tiếng Việt chuẩn, kiểm tra nối từ tự động, cấm tự nối 2 lần liên tiếp, thống kê chuỗi streak và thưởng tiền xu KingMC.
   - **Trò chơi Chẵn Lẻ:** Đặt cược chẵn lẻ bằng tiền King.MC, tung 3 viên xúc xắc minh bạch, hiệu ứng xóc đĩa sinh động, tỉ lệ cược x1.95.
2. **🛒 Cửa hàng File:**
   - Giao diện Discord trực quan (Embed + Select Menu + Nút Mua ngay).
   - Thanh toán trừ tiền trực tiếp từ số dư King.MC của người chơi.
   - Giao hàng tự động qua Tin nhắn riêng (DM) hoặc link tải bảo mật.
   - Kho lưu trữ file cá nhân (`/myfiles`) để tải lại bất cứ lúc nào.
   - Lệnh quản trị Admin (`/shop-admin add/edit/delete/list`) cho phép đính kèm upload file trực tiếp hoặc thêm link tải.
3. **💰 Hệ thống Tiền tệ & Minecraft Bot (Mineflayer):**
   - Tài khoản bot Minecraft phụ đứng trong server KingMC nhận tiền qua lệnh `/pay <bot> <tiền>`.
   - Tự động cộng tiền vào tài khoản Discord liên kết (`/link <ign>`).
   - Rút tiền về lại server Minecraft KingMC (`/ruttien <số_tiền>`).

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### 2. Cấu hình biến môi trường (`.env`)
Tạo file `.env` từ file `.env.example` và điền thông tin:

```env
# Discord Bot
DISCORD_TOKEN=Token_bot_discord_cua_ban
CLIENT_ID=Application_ID_cua_bot
GUILD_ID=ID_server_discord_cua_ban

# Minecraft Bot kết nối server King.MC
MINECRAFT_ENABLED=true
MINECRAFT_HOST=kingmc.vn
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=Tên_Bot_Minecraft
MINECRAFT_AUTH=offline
MINECRAFT_VERSION=1.20.1
# Nếu server có AuthMe đăng nhập:
MINECRAFT_PASSWORD=mat_khau_authme
# ID kênh Discord nhận thông báo nạp tiền tự động:
MINECRAFT_LOG_CHANNEL_ID=
```

### 3. Khởi động Bot
```bash
npm start
```

---

## 📜 Danh Sách Lệnh (Slash Commands)

### 🎮 Trò Chơi (Minigames)
| Lệnh | Mô tả |
| :--- | :--- |
| `/noitu setup [channel] [reward]` | Thiết lập kênh chơi Nối Từ tiếng Việt (kèm xu thưởng mỗi từ) |
| `/noitu reset [start_word]` | Bắt đầu lại ván nối từ với từ mới |
| `/noitu stop` | Dừng trò chơi nối từ ở kênh hiện tại |
| `/noitu status` | Xem từ hiện tại, chuỗi streak và kỷ lục |
| `/noitu addword <word>` | Thêm từ ghép mới vào từ điển tiếng Việt |
| `/chanle <lua_chon> <tien_cuoc>` | Đặt cược Chẵn (⚪) hoặc Lẻ (⚫) bằng tiền KingMC |

### 🛒 Cửa Hàng File (Shop)
| Lệnh | Mô tả |
| :--- | :--- |
| `/shop` | Mở giao diện cửa hàng chọn file và mua bằng tiền KingMC |
| `/myfiles` | Xem lại danh sách các file bạn đã mua và tải lại |
| `/shop-admin add` | *(Admin)* Thêm file mới vào shop (đính kèm file hoặc điền link tải) |
| `/shop-admin edit` | *(Admin)* Chỉnh sửa giá hoặc mô tả file |
| `/shop-admin delete` | *(Admin)* Xóa file khỏi shop |
| `/shop-admin list` | *(Admin)* Xem toàn bộ file trong kho và số lượt bán |

### 💰 Kinh Tế & Nạp/Rút Tiền King.MC
| Lệnh | Mô tả |
| :--- | :--- |
| `/link <ign>` | Liên kết tài khoản Discord với tên nhân vật Minecraft |
| `/sodu [user]` | Xem số dư ví tiền KingMC hiện tại |
| `/naptien` | Hướng dẫn nạp tiền từ server Minecraft (/pay cho bot) |
| `/ruttien <so_tien>` | Rút tiền từ bot về tài khoản nhân vật in-game |
| `/top` | Bảng xếp hạng đại gia tiền KingMC |
| `/admin-money <thao_tac> <user> <tien>` | *(Admin)* Cộng / Trừ / Đặt số dư người dùng |

### ℹ️ Tiện Ích
| Lệnh | Mô tả |
| :--- | :--- |
| `/help` | Xem bảng hướng dẫn đầy đủ |
| `/ping` | Kiểm tra độ trễ Discord và kết nối tới server King.MC |

---

## 🛠️ Cơ chế hoạt động của Tiền King.MC

1. **Nạp tiền (Deposit):**
   - Người chơi vào game KingMC gõ `/pay <TênBot> <SốTiền>`.
   - Bot Minecraft (Mineflayer) đọc tin nhắn chat xác nhận chuyển tiền.
   - Nếu người chơi đã gõ `/link <ign>`: Tiền tự động cộng vào ví Discord ngay lập tức.
   - Nếu chưa gõ `/link`: Tiền được lưu tạm, khi người chơi gõ `/link` sẽ được tự động cộng dồn.

2. **Rút tiền (Withdraw):**
   - Người chơi gõ `/ruttien <số_tiền>` trên Discord.
   - Bot Minecraft sẽ chạy lệnh `/pay <ign_người_chơi> <số_tiền>` trong game KingMC và trừ tiền trong ví Discord.
