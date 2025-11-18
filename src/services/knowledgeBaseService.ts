import { GoogleDocsService } from './googleDocs';
import { OpenRouterService } from './openrouter';
import { TextProcessor, TextChunk } from './textProcessor';
import { config } from '../config';

export class KnowledgeBaseService {
  private googleDocs: GoogleDocsService;
  private openRouter: OpenRouterService;
  private textProcessor: TextProcessor;
  private cachedChunks: TextChunk[] = [];
  private lastDocumentContent: string = '';

  constructor() {
    this.googleDocs = new GoogleDocsService();
    this.openRouter = new OpenRouterService();
    this.textProcessor = new TextProcessor();

    console.log('✅ Knowledge Base Service initialized');
  }

  /**
   * Main method to answer user queries using Google Docs knowledge base
   */
  async answerQuery(userQuery: string): Promise<string> {
    try {
      console.log(`\n📩 Processing query: "${userQuery.substring(0, 50)}..."`);

      // Fetch fresh document content
      const documentContent = await this.googleDocs.fetchDocumentContent();

      // Check if document has been updated
      if (documentContent !== this.lastDocumentContent) {
        console.log('🔄 Document has changed, re-chunking...');
        this.cachedChunks = this.textProcessor.splitIntoChunks(documentContent);
        this.lastDocumentContent = documentContent;
      }

      // If document is empty or very small, use it directly
      if (this.cachedChunks.length <= 1) {
        console.log('📄 Using full document (small size)');
        const response = await this.openRouter.chatWithContext(
          userQuery,
          documentContent
        );
        return this.formatResponse(response.response, response.tokensUsed);
      }

      // Find relevant chunks based on the query
      const relevantChunks = this.textProcessor.findRelevantChunks(
        userQuery,
        this.cachedChunks,
        15 // top 15 chunks for better coverage
      );

      // Build context from relevant chunks within token limit
      const context = this.textProcessor.buildContext(
        relevantChunks,
        config.textProcessing.maxContextTokens
      );

      // Get AI response with context
      const response = await this.openRouter.chatWithContext(userQuery, context);

      return this.formatResponse(response.response, response.tokensUsed);
    } catch (error: any) {
      console.error('❌ Error answering query:', error.message);
      return this.handleError(error);
    }
  }

  /**
   * Forces refresh of the document cache
   */
  async refreshDocument(): Promise<string> {
    try {
      this.googleDocs.clearCache();
      const documentContent = await this.googleDocs.fetchDocumentContent(true);
      this.cachedChunks = this.textProcessor.splitIntoChunks(documentContent);
      this.lastDocumentContent = documentContent;

      const charCount = documentContent.length;
      const chunkCount = this.cachedChunks.length;

      return `✅ Документ обновлен!\n\n📊 Статистика:\n- Символов: ${charCount}\n- Фрагментов: ${chunkCount}\n- Примерно токенов: ${this.textProcessor.estimateTokens(documentContent)}`;
    } catch (error: any) {
      console.error('❌ Error refreshing document:', error.message);
      return `❌ Ошибка обновления документа: ${error.message}`;
    }
  }

  /**
   * Gets statistics about the current knowledge base
   */
  getStats(): string {
    const charCount = this.lastDocumentContent.length;
    const chunkCount = this.cachedChunks.length;
    const estimatedTokens = this.textProcessor.estimateTokens(
      this.lastDocumentContent
    );
    const documentIds = config.googleDocs.documentIds;

    let stats = `📊 Статистика базы знаний:\n\n`;

    if (documentIds.length === 1) {
      stats += `📄 Документ ID: ${documentIds[0].substring(0, 20)}...\n`;
    } else {
      stats += `📚 Количество документов: ${documentIds.length}\n`;
      documentIds.forEach((id, index) => {
        stats += `  ${index + 1}. ${id.substring(0, 15)}...\n`;
      });
    }

    stats += `📝 Символов: ${charCount.toLocaleString()}\n` +
      `📑 Фрагментов: ${chunkCount}\n` +
      `🎯 Примерно токенов: ${estimatedTokens.toLocaleString()}\n` +
      `🤖 Модель: ${config.openrouter.model}\n` +
      `⚙️ Макс. токенов контекста: ${config.textProcessing.maxContextTokens}`;

    return stats;
  }

  /**
   * Formats the response with optional token usage
   */
  private formatResponse(response: string, tokensUsed?: number): string {
    let formatted = response;

    if (tokensUsed) {
      formatted += `\n\n💭 Использовано токенов: ${tokensUsed}`;
    }

    return formatted;
  }

  /**
   * Handles errors and returns user-friendly messages
   */
  private handleError(error: any): string {
    const errorMessage = error.message || 'Unknown error';

    if (errorMessage.includes('Google Docs')) {
      return `❌ Ошибка доступа к Google Документу. Проверьте настройки доступа и ID документа.\n\nДетали: ${errorMessage}`;
    }

    if (errorMessage.includes('OpenRouter')) {
      return `❌ Ошибка при обращении к OpenRouter API. Проверьте API ключ и баланс.\n\nДетали: ${errorMessage}`;
    }

    return `❌ Произошла ошибка: ${errorMessage}\n\nПопробуйте позже или обратитесь к администратору.`;
  }
}
