export interface ProcessedDocument {
  chapters: Chapter[];
  metadata: {
    title?: string;
    wordCount: number;
    pageCount?: number;
  };
}

export interface Chapter {
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface FileProcessor {
  process(buffer: Buffer): Promise<ProcessedDocument>;
}
