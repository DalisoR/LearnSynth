/**
 * Adaptive PDF Parser Service
 * Enhances existing PDF processing with structured chapter extraction
 */

import { PDFProcessor } from '../fileProcessor/pdfProcessor';

export interface ParsedChapter {
  id: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  sectionCount: number;
  keyTopics: string[];
  estimatedReadTime: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  summary: string;
}

export interface ParsedDocument {
  documentId: string;
  title: string;
  totalChapters: number;
  totalSections: number;
  totalWords: number;
  estimatedTotalTime: number; // in minutes
  chapters: ParsedChapter[];
  metadata: {
    processedAt: Date;
    version: string;
    hasTOC: boolean;
    language: string;
  };
}

export class AdaptivePdfParser {
  private pdfProcessor: PDFProcessor;

  constructor() {
    this.pdfProcessor = new PDFProcessor();
  }

  /**
   * Parse PDF and extract structured chapter data
   */
  async parsePdf(buffer: Buffer, documentId: string): Promise<ParsedDocument> {
    const processedDoc = await this.pdfProcessor.process(buffer);

    const chapters = await this.enhanceChapters(processedDoc.chapters, documentId);

    return {
      documentId,
      title: `Document ${documentId}`,
      totalChapters: chapters.length,
      totalSections: chapters.reduce((sum, ch) => sum + ch.sectionCount, 0),
      totalWords: chapters.reduce((sum, ch) => sum + ch.wordCount, 0),
      estimatedTotalTime: Math.ceil(chapters.reduce((sum, ch) => sum + ch.estimatedReadTime, 0)),
      chapters,
      metadata: {
        processedAt: new Date(),
        version: '2.0.0',
        hasTOC: this.detectTableOfContents(processedDoc.chapters),
        language: 'en'
      }
    };
  }

  /**
   * Enhance basic chapters with AI-powered metadata
   */
  private async enhanceChapters(basicChapters: any[], documentId: string): Promise<ParsedChapter[]> {
    const enhanced: ParsedChapter[] = [];

    for (let i = 0; i < basicChapters.length; i++) {
      const chapter = basicChapters[i];

      // Extract key topics using simple keyword extraction
      const keyTopics = this.extractKeyTopics(chapter.content);

      // Determine difficulty based on content complexity
      const difficulty = this.assessDifficulty(chapter.content);

      // Estimate reading time (average 200 words per minute)
      const estimatedReadTime = Math.ceil(chapter.wordCount / 200);

      // Generate summary (first 2-3 sentences)
      const summary = this.generateSummary(chapter.content);

      // Detect prerequisites from content
      const prerequisites = this.detectPrerequisites(chapter.content, keyTopics);

      enhanced.push({
        id: `${documentId}-chapter-${chapter.chapterNumber}`,
        chapterNumber: chapter.chapterNumber,
        title: chapter.title || `Chapter ${chapter.chapterNumber}`,
        content: chapter.content,
        wordCount: chapter.wordCount,
        sectionCount: this.countSections(chapter.content),
        keyTopics,
        estimatedReadTime,
        difficulty,
        prerequisites,
        summary
      });
    }

    return enhanced;
  }

  /**
   * Extract key topics from chapter content
   */
  private extractKeyTopics(content: string): string[] {
    // Simple keyword extraction based on frequency and importance
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 5);

    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top 10 most frequent words
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Assess difficulty based on content complexity
   */
  private assessDifficulty(content: string): 'beginner' | 'intermediate' | 'advanced' {
    const words = content.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const sentences = content.split(/[.!?]+/).length;
    const avgSentenceLength = words.length / sentences;

    // Simple heuristic
    if (avgWordLength > 6 && avgSentenceLength > 20) {
      return 'advanced';
    } else if (avgWordLength > 5 && avgSentenceLength > 15) {
      return 'intermediate';
    }
    return 'beginner';
  }

  /**
   * Generate a brief summary from content
   */
  private generateSummary(content: string): string {
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);

    return sentences.slice(0, 3).join('. ') + '.';
  }

  /**
   * Detect prerequisites from content
   */
  private detectPrerequisites(content: string, keyTopics: string[]): string[] {
    const prerequisites: string[] = [];
    const lowerContent = content.toLowerCase();

    // Look for prerequisite indicators
    const indicators = [
      'before learning',
      'prerequisite',
      'you should know',
      'it is assumed',
      'having studied',
      'prerequisites include',
      'you need to understand',
      'foundation in'
    ];

    indicators.forEach(indicator => {
      if (lowerContent.includes(indicator)) {
        // Extract sentences containing prerequisite indicators
        const sentences = content.split(/[.!?]+/);
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes(indicator)) {
            // Add to prerequisites (this is a simplified version)
            keyTopics.forEach(topic => {
              if (sentence.toLowerCase().includes(topic.toLowerCase())) {
                prerequisites.push(topic);
              }
            });
          }
        });
      }
    });

    return [...new Set(prerequisites)].slice(0, 5);
  }

  /**
   * Count sections within a chapter
   */
  private countSections(content: string): number {
    const sectionPatterns = [
      /^\d+\.\d+/gm,    // 1.1, 1.2, etc.
      /^[A-Z][a-z]+:/gm, // Section titles
      /^Section \d+/gmi  // Explicit section headers
    ];

    let totalSections = 0;
    sectionPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        totalSections += matches.length;
      }
    });

    return Math.max(totalSections, 1);
  }

  /**
   * Detect if document has a table of contents
   */
  private detectTableOfContents(chapters: any[]): boolean {
    if (chapters.length === 0) return false;

    const firstChapter = chapters[0].content.toLowerCase();
    const tocIndicators = [
      'table of contents',
      'contents',
      'chapter 1',
      'page 1'
    ];

    return tocIndicators.some(indicator => firstChapter.includes(indicator));
  }
}

export const adaptivePdfParser = new AdaptivePdfParser();
