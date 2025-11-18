import { google } from 'googleapis';
import { config } from '../config';
import * as fs from 'fs';

export class GoogleDocsService {
  private docs: any;
  private lastFetchedContent: string = '';
  private lastFetchedTime: number = 0;
  private cacheDuration: number = 60000; // 1 minute cache

  constructor() {
    this.initializeAuth();
  }

  private async initializeAuth() {
    try {
      // Load service account credentials
      const credentials = JSON.parse(
        fs.readFileSync(config.googleDocs.serviceAccountPath, 'utf8')
      );

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/documents.readonly'],
      });

      this.docs = google.docs({ version: 'v1', auth });
      console.log('✅ Google Docs API initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Google Docs API:', error);
      throw error;
    }
  }

  /**
   * Fetches the content from Google Docs document
   * Uses caching to avoid excessive API calls
   */
  async fetchDocumentContent(forceRefresh: boolean = false): Promise<string> {
    const now = Date.now();

    // Return cached content if available and not expired
    if (
      !forceRefresh &&
      this.lastFetchedContent &&
      now - this.lastFetchedTime < this.cacheDuration
    ) {
      console.log('📋 Using cached Google Docs content');
      return this.lastFetchedContent;
    }

    try {
      console.log('🔄 Fetching fresh content from Google Docs...');
      const response = await this.docs.documents.get({
        documentId: config.googleDocs.documentId,
      });

      const content = this.extractTextFromDocument(response.data);
      this.lastFetchedContent = content;
      this.lastFetchedTime = now;

      console.log(`✅ Fetched ${content.length} characters from Google Docs`);
      return content;
    } catch (error: any) {
      console.error('❌ Error fetching Google Docs content:', error.message);
      throw new Error(`Failed to fetch Google Docs: ${error.message}`);
    }
  }

  /**
   * Extracts plain text from Google Docs API response
   */
  private extractTextFromDocument(document: any): string {
    const content: string[] = [];

    if (!document.body || !document.body.content) {
      return '';
    }

    for (const element of document.body.content) {
      if (element.paragraph) {
        const paragraphText = this.extractParagraphText(element.paragraph);
        if (paragraphText) {
          content.push(paragraphText);
        }
      } else if (element.table) {
        const tableText = this.extractTableText(element.table);
        if (tableText) {
          content.push(tableText);
        }
      }
    }

    return content.join('\n\n');
  }

  private extractParagraphText(paragraph: any): string {
    if (!paragraph.elements) {
      return '';
    }

    const textParts: string[] = [];
    for (const element of paragraph.elements) {
      if (element.textRun && element.textRun.content) {
        textParts.push(element.textRun.content);
      }
    }

    return textParts.join('').trim();
  }

  private extractTableText(table: any): string {
    const rows: string[] = [];

    if (!table.tableRows) {
      return '';
    }

    for (const row of table.tableRows) {
      const cells: string[] = [];
      if (row.tableCells) {
        for (const cell of row.tableCells) {
          if (cell.content) {
            const cellText = cell.content
              .map((element: any) => {
                if (element.paragraph) {
                  return this.extractParagraphText(element.paragraph);
                }
                return '';
              })
              .join(' ');
            cells.push(cellText);
          }
        }
      }
      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    }

    return rows.join('\n');
  }

  /**
   * Clears the cache to force fresh fetch on next request
   */
  clearCache() {
    this.lastFetchedContent = '';
    this.lastFetchedTime = 0;
    console.log('🗑️  Cache cleared');
  }
}
