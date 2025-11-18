import { TelegramBot } from './bot';

async function main() {
  console.log('=================================');
  console.log('🏠 FindMyHome Telegram Bot');
  console.log('=================================\n');

  try {
    const bot = new TelegramBot();
    await bot.start();
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nПроверьте:');
    console.error('1. Наличие файла .env с корректными переменными');
    console.error('2. Правильность TELEGRAM_BOT_TOKEN');
    console.error('3. Правильность OPENROUTER_API_KEY');
    console.error('4. Наличие google-credentials.json');
    console.error('5. Доступ к Google Docs документу\n');
    process.exit(1);
  }
}

main();
