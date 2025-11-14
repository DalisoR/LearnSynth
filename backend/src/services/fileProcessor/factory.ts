import { FileProcessor } from './types';
import { PDFProcessor } from './pdfProcessor';
import { DOCXProcessor } from './docxProcessor';

// Simple EPUB processor stub - would need epub-parser library for full implementation
class EPUBProcessor implements FileProcessor {
  async process(buffer: Buffer): Promise<any> {
    // Placeholder - would implement EPUB extraction
    throw new Error('EPUB processing not yet implemented. Please use PDF or DOCX.');
  }
}

export function createFileProcessor(fileType: string): FileProcessor {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return new PDFProcessor();
    case 'docx':
      return new DOCXProcessor();
    case 'epub':
      return new EPUBProcessor();
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
