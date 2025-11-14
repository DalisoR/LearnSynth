import mammoth from 'mammoth';
import { ProcessedDocument, Chapter, FileProcessor } from './types';

export class DOCXProcessor implements FileProcessor {
  async process(buffer: Buffer): Promise<ProcessedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Extract chapters based on headings
    const chapters = this.extractChapters(text);

    return {
      chapters,
      metadata: {
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  private extractChapters(text: string): Chapter[] {
    // Split by heading patterns - improved detection
    const lines = text.split('\n');
    const chapters: Chapter[] = [];
    let currentChapter: { title: string; content: string } | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Enhanced heading detection patterns
      const isHeading = this.isHeading(trimmedLine);

      if (isHeading) {
        // Save previous chapter
        if (currentChapter) {
          chapters.push({
            chapterNumber: chapters.length + 1,
            title: currentChapter.title,
            content: currentChapter.content,
            wordCount: currentChapter.content.split(/\s+/).length,
          });
        }

        // Start new chapter
        currentChapter = {
          title: trimmedLine,
          content: '',
        };
      } else if (currentChapter) {
        currentChapter.content += line + '\n';
      }
    }

    // Add last chapter
    if (currentChapter) {
      chapters.push({
        chapterNumber: chapters.length + 1,
        title: currentChapter.title,
        content: currentChapter.content,
        wordCount: currentChapter.content.split(/\s+/).length,
      });
    }

    // If no chapters detected, split by length
    if (chapters.length === 0) {
      chapters.push({
        chapterNumber: 1,
        title: 'Document',
        content: text,
        wordCount: text.split(/\s+/).length,
      });
    }

    return chapters;
  }

  private isHeading(text: string): boolean {
    if (!text || text.length === 0 || text.length > 150) return false;

    // Pattern 1: "Chapter X:" or "CHAPTER X:"
    if (/^chapter\s+\d+:/i.test(text)) return true;

    // Pattern 2: "X.Y Title" or "X. Title"
    if (/^\d+\.\d*\s+[A-Z]/i.test(text)) return true;

    // Pattern 3: Starts with "Chapter" followed by title
    if (/^chapter\s+[a-z]+/i.test(text)) return true;

    // Pattern 4: Short line that's mostly uppercase (SHOUTING)
    const upperRatio = (text.replace(/[^A-Z]/g, '').length / text.length);
    if (upperRatio > 0.6 && text.length < 50) return true;

    // Pattern 5: Starts with number followed by title
    if (/^\d+\.\s+[A-Z]/.test(text)) return true;

    return false;
  }
}
