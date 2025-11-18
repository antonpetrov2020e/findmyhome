import { TfIdf } from 'natural';
import { config } from '../config';

export interface TextChunk {
  text: string;
  index: number;
  score?: number;
}

export class TextProcessor {
  /**
   * Splits text into overlapping chunks for better context preservation
   */
  splitIntoChunks(text: string): TextChunk[] {
    const { chunkSize, chunkOverlap } = config.textProcessing;
    const chunks: TextChunk[] = [];

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk
        ? currentChunk + '\n\n' + paragraph
        : paragraph;

      if (potentialChunk.length > chunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex++,
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + paragraph;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add the last chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
      });
    }

    console.log(`📑 Split document into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Gets the last N characters for overlap
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (text.length <= overlapSize) {
      return text + '\n\n';
    }

    // Try to cut at sentence or paragraph boundary
    const overlapText = text.slice(-overlapSize);
    const lastPeriod = overlapText.lastIndexOf('.');
    const lastNewline = overlapText.lastIndexOf('\n');

    const cutPoint = Math.max(lastPeriod, lastNewline);
    if (cutPoint > overlapSize / 2) {
      return overlapText.slice(cutPoint + 1).trim() + '\n\n';
    }

    return overlapText + '\n\n';
  }

  /**
   * Finds most relevant chunks using hybrid TF-IDF + keyword matching
   */
  findRelevantChunks(
    query: string,
    chunks: TextChunk[],
    topK: number = 3
  ): TextChunk[] {
    if (chunks.length === 0) {
      return [];
    }

    if (chunks.length <= topK) {
      return chunks;
    }

    // Extract keywords from query (remove stop words and short words)
    const stopWords = ['где', 'для', 'всякие', 'штуки', 'есть', 'лежит', 'находится', 'что', 'как', 'это'];
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    const tfidf = new TfIdf();

    // Add all chunks to TF-IDF
    chunks.forEach((chunk) => {
      tfidf.addDocument(chunk.text);
    });

    // Calculate relevance scores with hybrid approach
    const scoredChunks: TextChunk[] = chunks.map((chunk, index) => {
      // TF-IDF score
      let tfidfScore = 0;
      tfidf.tfidfs(query, (i, measure) => {
        if (i === index) {
          tfidfScore = measure;
        }
      });

      // Keyword matching bonus
      const lowerText = chunk.text.toLowerCase();
      let keywordBonus = 0;

      queryWords.forEach(word => {
        // Count occurrences of each keyword
        const regex = new RegExp(word, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          // Add bonus based on number of matches
          keywordBonus += matches.length * 10;
        }
      });

      // Combined score: TF-IDF + keyword bonus
      const combinedScore = tfidfScore + keywordBonus;

      return { ...chunk, score: combinedScore };
    });

    // Sort by score and return top K
    const sortedChunks = scoredChunks
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);

    console.log(
      `🎯 Found ${sortedChunks.length} relevant chunks with scores:`,
      sortedChunks.map((c) => c.score?.toFixed(3))
    );

    return sortedChunks;
  }

  /**
   * Estimates token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Combines chunks into context while respecting token limit
   */
  buildContext(chunks: TextChunk[], maxTokens: number): string {
    let context = '';
    let tokenCount = 0;

    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.text);

      if (tokenCount + chunkTokens > maxTokens) {
        break;
      }

      if (context) {
        context += '\n\n---\n\n';
      }
      context += chunk.text;
      tokenCount += chunkTokens;
    }

    console.log(`📝 Built context with ~${tokenCount} tokens`);
    return context;
  }

  /**
   * Finds keyword matches in text for simple search
   */
  findKeywordMatches(text: string, keywords: string[]): string[] {
    const matches: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matches.push(keyword);
      }
    }

    return matches;
  }
}
