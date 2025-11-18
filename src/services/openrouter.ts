import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  response: string;
  model: string;
  tokensUsed?: number;
}

export class OpenRouterService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.openrouter.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.openrouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/findmyhome-bot',
        'X-Title': 'FindMyHome Telegram Bot',
      },
    });

    console.log('✅ OpenRouter API client initialized');
  }

  /**
   * Sends a chat completion request to OpenRouter
   */
  async chat(messages: Message[]): Promise<ChatResponse> {
    try {
      console.log(`🤖 Sending request to OpenRouter (${config.openrouter.model})...`);

      const response = await this.client.post('/chat/completions', {
        model: config.openrouter.model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const completion = response.data.choices[0].message.content;
      const usage = response.data.usage;

      console.log(
        `✅ Received response from OpenRouter (${usage?.total_tokens || '?'} tokens)`
      );

      return {
        response: completion,
        model: config.openrouter.model,
        tokensUsed: usage?.total_tokens,
      };
    } catch (error: any) {
      console.error('❌ Error calling OpenRouter:', error.response?.data || error.message);
      throw new Error(
        `OpenRouter API error: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Builds a chat request with context from Google Docs
   */
  async chatWithContext(
    userQuery: string,
    documentContext: string
  ): Promise<ChatResponse> {
    const systemPrompt = `Ты — полезный AI-ассистент, который помогает пользователю найти вещи в его квартире.

У тебя есть доступ к документу с информацией о том, где что находится в квартире пользователя.

ВАЖНО:
- Отвечай на русском языке
- Будь конкретным и указывай ПОЛНОЕ местоположение из документа
- Если информации нет в предоставленном контексте, честно скажи об этом
- НЕ ПРИДУМЫВАЙ информацию, которой нет в контексте
- НЕ ПУТАЙ разные темы и предметы — отвечай СТРОГО на заданный вопрос
- Если информация неоднозначна, предложи несколько вариантов
- Отвечай кратко и по делу
- Внимательно читай весь контекст перед ответом

ФОРМАТ ОТВЕТА О МЕСТОПОЛОЖЕНИИ:
- ВСЕГДА указывай полный путь: Комната → Мебель → Полка/Ящик → Конкретное место
- Примеры правильных ответов:
  ✅ «Паспорт находится в Спальне, в Прикроватной тумбочке, в верхнем ящике»
  ✅ «Настольные игры лежат в Гостиной, в Шкафу 1 (длинный, левый), на Полке 3»
  ✅ «Вещи для бассейна — в Гардеробной, на Полке 4, в коробке с надписью "вайб бассейна"»
- Примеры неправильных ответов:
  ❌ «На полке 3» (не указана комната и шкаф)
  ❌ «В коробке» (не указано, где именно эта коробка)

ПРАВИЛА ТИПОГРАФИКИ:
- Используй только кавычки-ёлочки: «цитата», а НЕ "цитата"
- Используй длинное тире (—) в предложениях, а дефис (-) только для составных слов
- Правильно: «Паспорт находится в тумбочке — на верхней полке»
- Неправильно: "Паспорт находится в тумбочке - на верхней полке"

Вот содержимое документа с информацией о квартире:

${documentContext}`;

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ];

    return this.chat(messages);
  }

  /**
   * Generates a simple response without context (fallback)
   */
  async simpleChat(userQuery: string): Promise<ChatResponse> {
    const messages: Message[] = [
      {
        role: 'system',
        content:
          'Ты — полезный AI-ассистент. Отвечай на русском языке кратко и по делу.',
      },
      { role: 'user', content: userQuery },
    ];

    return this.chat(messages);
  }
}
