import pdf from 'pdf-parse';
import { ProcessedDocument, Chapter, FileProcessor } from './types';
import { llmService } from '../llm/factory';

export class PDFProcessor implements FileProcessor {
  async process(buffer: Buffer): Promise<ProcessedDocument> {
    const data = await pdf(buffer);
    const text = data.text;
    const pages = data.numpages;

    // Split text into chapters based on common patterns
    const chapters = await this.extractChapters(text);

    return {
      chapters,
      metadata: {
        wordCount: text.split(/\s+/).length,
        pageCount: pages,
      },
    };
  }

  private async extractChapters(text: string): Promise<Chapter[]> {
    // Common chapter patterns - more comprehensive
    const chapterPatterns = [
      /^Chapter\s+(\d+)/gim,
      /^CHAPTER\s+(\d+)/gim,
      /^Part\s+(\d+)/gim,
      /^UNIT\s+(\d+)/gim,
      /^\d+\.\s+[A-Z]/gm, // Numbered sections
      /^Topic\s+(\d+)/gim,
      /^Lesson\s+(\d+)/gim,
      /^[A-Z][A-Z\s]{3,}$/gm, // All caps titles (common for chapters)
    ];

    let chunks = [{ title: 'Introduction', content: text, index: 0 }];

    // Try to split by chapter patterns
    for (const pattern of chapterPatterns) {
      const matches = [...text.matchAll(pattern)];
      if (matches.length > 1) {
        chunks = await this.splitByMatches(text, matches);
        break;
      }
    }

    // If no chapters found, split by length
    if (chunks.length === 1) {
      chunks = this.splitByLength(text);
    }

    // Filter out preliminary pages
    chunks = this.filterPreliminaryPages(chunks);

    return chunks.map((chunk, idx) => ({
      chapterNumber: idx + 1,
      title: chunk.title,
      content: chunk.content,
      wordCount: chunk.content.split(/\s+/).length,
    }));
  }

  private filterPreliminaryPages(
    chunks: Array<{ title: string; content: string; index: number }>
  ): Array<{ title: string; content: string; index: number }> {
    // Define preliminary page patterns - expanded list
    const preliminaryPatterns = [
      /preface/i,
      /acknowledg(e)?ments?/i,
      /table\s+of\s+contents/i,
      /contents/i,
      /index/i,
      /copyright/i,
      /published\s+by/i,
      /isbn/i,
      /foreword/i,
      /dedication/i,
      /about\s+the\s+(author|editor)/i,
      /biography/i,
      /acknowledgements/i,
      /preliminary/i,
      /abbreviations/i,
      /glossary/i,
      /bibliography/i,
      /references?/i,
      /further\s+reading/i,
      /appendix/i,
      /appendices/i,
      /notes?/i,
      /^page\s+\d+$/i, // Page numbers
      /^fig(?:ure)?\s+\d+/i, // Figure captions
      /^table\s+\d+/i, // Table captions
      /list\s+of\s+(figures|tables)/i,
      /acronyms?/i,
      /symbols?/i,
      /xiv|xv|xiv|xv|ix|viii|vii|vi|iv|iii|ii/i, // Roman numerals
      /page/i,
      /pg\./i,
    ];

    // Detect TOC-like structure in first few chunks
    const firstFewChunks = chunks.slice(0, Math.min(5, chunks.length));
    const hasTOC = firstFewChunks.some(chunk => {
      const content = chunk.content.toLowerCase();
      // Check for TOC indicators
      const dotLines = content.split('\n').filter(line =>
        /^\s*\d+(\.\d+)*\s+\.{3,}\s+\d+\s*$/.test(line.trim()) ||
        /^\s*\d+\.{2,}/.test(line.trim())
      ).length;

      const hasChapterList = /chapter\s+\d+|unit\s+\d+|section\s+\d+/i.test(content);
      const pageNumberPattern = /\.\.\+\s*\d+$|\.\.\.\s*\d+$|\.\.\s*\d+$/;

      return (dotLines > 3 && content.length < 10000) || // Many dotted lines
             (hasChapterList && pageNumberPattern.test(content.substring(0, 5000))); // Chapter list with page nums
    });

    let filtered = chunks;

    // If TOC detected, skip the first chunk that looks like TOC
    if (hasTOC) {
      filtered = filtered.slice(1);
    }

    // Also filter by content characteristics
    const isPreliminaryContent = (chunk: { title: string; content: string }): boolean => {
      const title = chunk.title.toLowerCase();
      const content = chunk.content.toLowerCase();

      // Check for preliminary patterns in title or first 200 chars of content
      for (const pattern of preliminaryPatterns) {
        if (pattern.test(title) || pattern.test(content.substring(0, 200))) {
          return true;
        }
      }

      // Check for TOC-like structure (lots of dots/leader dots)
      const dotLines = content.split('\n').filter(line =>
        /^[\s\.\:]+$/.test(line.trim()) || /^\d+\.{2,}/.test(line.trim())
      ).length;

      if (dotLines > 5 && content.length < 5000) {
        return true;
      }

      // Check for copyright info patterns
      if (/©|copyright|all\s+rights\s+reserved/i.test(content.substring(0, 300))) {
        return true;
      }

      // If it's very short and has typical preliminary keywords
      if (chunk.content.length < 1000) {
        const preliminaryKeywords = ['introduction', 'preface', 'forward', 'about'];
        const hasKeyword = preliminaryKeywords.some(keyword =>
          title.includes(keyword) || content.substring(0, 500).includes(keyword)
        );

        // But if it's just "Introduction" and short, it might still be actual content
        // Only filter if it has multiple preliminary indicators
        if (hasKeyword) {
          const indicators = preliminaryKeywords.filter(k =>
            title.includes(k) || content.includes(k)
          ).length;
          if (indicators > 1) return true;
        }
      }

      return false;
    };

    // Filter out preliminary pages
    filtered = filtered.filter(chunk => !isPreliminaryContent(chunk));

    // If we filtered too much, keep at least one chunk
    if (filtered.length === 0 && chunks.length > 0) {
      // Return the longest chunk as fallback
      return chunks.sort((a, b) => b.content.length - a.content.length).slice(0, 1);
    }

    return filtered;
  }

  private async splitByMatches(
    text: string,
    matches: RegExpMatchArray[]
  ): Promise<Array<{ title: string; content: string; index: number }>> {
    const chunks: Array<{ title: string; content: string; index: number }> = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const start = match.index || 0;
      const end = i + 1 < matches.length ? (matches[i + 1].index || text.length) : text.length;

      const chapterText = text.substring(start, end);
      const title = await this.extractChapterTitle(chapterText);

      chunks.push({ title, content: chapterText, index: i });
    }

    return chunks;
  }

  /**
   * Extract chapter title using AI
   */
  private async extractChapterTitle(chapterText: string): Promise<string> {
    try {
      // Extract first 500 characters for title analysis
      const sample = chapterText.substring(0, 500);

      const prompt = `
        Extract the exact chapter, unit, or topic title from this text.
        Return ONLY the title text, nothing else.

        Text: ${sample}

        Look for:
        - Chapter headings (e.g., "Chapter 1: Introduction to Biology")
        - Unit names (e.g., "Unit 3: Cellular Respiration")
        - Section titles (e.g., "3.2 The Process of Photosynthesis")
        - Topic names (e.g., "Topic 5: Newton's Laws")

        If no clear title exists, infer the best title from the content (3-8 words).

        Return format: Just the title text.
      `;

      const response = await llmService.complete({
        prompt,
        maxTokens: 50,
        temperature: 0.3
      });

      const title = response.content.trim();
      return title || 'Untitled Chapter';
    } catch (error) {
      console.error('Error extracting chapter title:', error);
      // Fallback to simple extraction
      const lines = chapterText.split('\n').filter(l => l.trim().length > 0);
      return lines[0]?.substring(0, 100).trim() || 'Untitled Chapter';
    }
  }

  private splitByLength(
    text: string
  ): Array<{ title: string; content: string; index: number }> {
    const maxChapterLength = 10000; // characters
    const chunks: Array<{ title: string; content: string; index: number }> = [];
    const paragraphs = text.split('\n\n');

    let currentChunk = '';
    let currentTitle = 'Chapter 1';
    let chapterNum = 1;

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChapterLength && currentChunk.length > 0) {
        chunks.push({ title: currentTitle, content: currentChunk, index: chapterNum - 1 });
        currentChunk = paragraph;
        chapterNum++;
        currentTitle = `Chapter ${chapterNum}`;
      } else {
        currentChunk += '\n\n' + paragraph;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({ title: currentTitle, content: currentChunk, index: chapterNum - 1 });
    }

    return chunks;
  }
}
