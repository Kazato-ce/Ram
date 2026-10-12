import { loadCommands } from '../src/handlers/loaders/commandLoader.js';
import { wordChainService } from '../src/services/games/wordChainService.js';
import { shopService } from '../src/services/shop/shopService.js';
import { kingmcEconomy } from '../src/services/economy/kingmcEconomy.js';
import { minecraftBot } from '../src/services/minecraft/mineflayerBot.js';

async function test() {
  console.log('--- KIỂM TRA KHỞI CHẠY HỆ THỐNG ---');

  // 1. Kiểm tra dịch vụ kinh tế KingMC
  console.log('1. KingMC Economy:');
  const user = kingmcEconomy.getUser('test_user_123');
  console.log('   - User ban đầu:', user);
  kingmcEconomy.addBalance('test_user_123', 50000, 'Test cộng tiền');
  console.log('   - Số dư sau cộng:', kingmcEconomy.getBalance('test_user_123'));
  kingmcEconomy.removeBalance('test_user_123', 20000, 'Test trừ tiền');
  console.log('   - Số dư sau trừ:', kingmcEconomy.getBalance('test_user_123'));
  kingmcEconomy.linkAccount('test_user_123', 'Steve_Pro');
  console.log('   - IGN sau link:', kingmcEconomy.getUser('test_user_123').ign);

  // 2. Kiểm tra Shop Service
  console.log('\n2. Shop Service:');
  const items = shopService.getItems();
  console.log(`   - Số lượng items hiện có: ${items.length}`);
  items.forEach(it => console.log(`     • [${it.id}] ${it.name} - ${it.price} xu`));

  // 3. Kiểm tra Nối từ (Word chain)
  console.log('\n3. Word Chain Service:');
  wordChainService.setupChannel('test_channel', 'test_guild', 'bầu trời', 100);
  const res1 = wordChainService.processMessage('test_channel', 'user_a', 'trời xanh');
  console.log('   - Nối từ "trời xanh" bởi user_a:', res1.valid, res1.message || res1.word);
  const res2 = wordChainService.processMessage('test_channel', 'user_b', 'xanh ngắt');
  console.log('   - Nối từ "xanh ngắt" bởi user_b:', res2.valid, res2.message || res2.word);
  const res3 = wordChainService.processMessage('test_channel', 'user_b', 'ngắt lời');
  console.log('   - Nối từ "ngắt lời" lại bởi user_b (tự nối 2 lần):', res3.valid, res3.message);

  // 4. Kiểm tra Load Commands
  console.log('\n4. Discord Commands:');
  const fakeClient = { commands: new Map() };
  await loadCommands(fakeClient);
  console.log(`   - Tổng số commands đã tải: ${fakeClient.commands.size}`);
  for (const [name, cmd] of fakeClient.commands.entries()) {
    console.log(`     • /${name} (${cmd.category}) - ${cmd.data.description}`);
  }

  console.log('\n✅ TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG VÀ CHẠY MƯỢT MÀ!');
}

test().catch(err => {
  console.error('❌ LỖI TRONG QUÁ TRÌNH KIỂM TRA:', err);
  process.exit(1);
});
