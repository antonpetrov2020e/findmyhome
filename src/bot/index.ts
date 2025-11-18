import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../config';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';

export class TelegramBot {
  private bot: Telegraf;
  private knowledgeBase: KnowledgeBaseService;

  constructor() {
    this.bot = new Telegraf(config.telegram.botToken);
    this.knowledgeBase = new KnowledgeBaseService();

    this.setupHandlers();
    console.log('✅ Telegram Bot initialized');
  }

  private setupHandlers() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const welcomeMessage = `
👋 Привет! Я бот-помощник для поиска вещей в твоей квартире.

Я использую Google Документ как базу знаний и AI для ответов на твои вопросы.

🔍 Просто спроси меня, где что находится, например:
• "Где мой паспорт?"
• "В каком шкафу лежат зимние вещи?"
• "Что у меня в кухне на верхней полке?"

📋 Доступные команды:
/start - Показать это сообщение
/refresh - Обновить документ из Google Docs
/stats - Показать статистику базы знаний
/help - Помощь

Задавай свой вопрос! 🚀
      `.trim();

      await ctx.reply(welcomeMessage);
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      const helpMessage = `
ℹ️ Помощь по использованию бота

❓ Как задавать вопросы:
Просто напиши свой вопрос обычным текстом. Бот поймет и найдет информацию в твоем Google Документе.

Примеры хороших вопросов:
✅ "Где лежат документы?"
✅ "В каком ящике моя зарядка?"
✅ "Что хранится в гардеробной?"
✅ "Покажи все, что у меня на кухне"

📋 Команды:
/start - Приветствие и инструкция
/refresh - Обновить документ (используй после изменений в Google Docs)
/stats - Статистика базы знаний
/help - Эта справка

🔧 Как это работает:
1. Ты пишешь вопрос
2. Бот забирает свежую версию документа из Google Docs
3. Находит самые релевантные части документа
4. Отправляет запрос к AI через OpenRouter
5. AI отвечает на основе информации из документа

💡 Совет: Обновляй документ командой /refresh после изменений!
      `.trim();

      await ctx.reply(helpMessage);
    });

    // Refresh command
    this.bot.command('refresh', async (ctx) => {
      await ctx.reply('🔄 Обновляю документ из Google Docs...');

      try {
        const result = await this.knowledgeBase.refreshDocument();
        await ctx.reply(result);
      } catch (error: any) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      try {
        const stats = this.knowledgeBase.getStats();
        await ctx.reply(stats);
      } catch (error: any) {
        await ctx.reply(`❌ Ошибка: ${error.message}`);
      }
    });

    // Handle all text messages
    this.bot.on(message('text'), async (ctx) => {
      const userMessage = ctx.message.text;

      // Ignore if it's a command
      if (userMessage.startsWith('/')) {
        return;
      }

      // Show typing indicator
      await ctx.sendChatAction('typing');

      try {
        const response = await this.knowledgeBase.answerQuery(userMessage);
        await ctx.reply(response, { parse_mode: 'Markdown' });
      } catch (error: any) {
        console.error('Error handling message:', error);
        await ctx.reply(
          `❌ Извините, произошла ошибка при обработке вашего запроса.\n\n` +
            `Попробуйте еще раз или используйте /help для справки.`
        );
      }
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('❌ Bot error:', err);
      ctx.reply(
        '❌ Произошла внутренняя ошибка. Пожалуйста, попробуйте позже.'
      );
    });
  }

  /**
   * Starts the bot
   */
  async start() {
    try {
      console.log('🚀 Starting Telegram Bot...');
      await this.bot.launch();
      console.log('✅ Bot is running!');

      // Enable graceful stop
      process.once('SIGINT', () => this.stop('SIGINT'));
      process.once('SIGTERM', () => this.stop('SIGTERM'));
    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      throw error;
    }
  }

  /**
   * Stops the bot gracefully
   */
  private stop(signal: string) {
    console.log(`\n⚠️  Received ${signal}, stopping bot...`);
    this.bot.stop(signal);
    console.log('👋 Bot stopped');
    process.exit(0);
  }
}
