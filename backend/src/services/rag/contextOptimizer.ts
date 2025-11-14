import { SearchResult } from './types';

interface OptimizedContext {
  chunks: SearchResult[];
  totalTokens: number;
}

export function optimizeContextWindow(
  results: SearchResult[],
  maxTokens: number
): OptimizedContext {
  // Sort by relevance score
  const sorted = [...results].sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore);

  const selected: SearchResult[] = [];
  let totalTokens = 0;

  // Strategy 1: Take highest scoring chunks first
  for (const result of sorted) {
    const tokenCount = result.metadata.tokenCount;

    if (totalTokens + tokenCount <= maxTokens) {
      selected.push(result);
      totalTokens += tokenCount;
    } else {
      // Try to include partial content if we're close
      const remaining = maxTokens - totalTokens;
      if (remaining > tokenCount * 0.3) {
        // Include truncated version
        const truncated = truncateContent(result, remaining);
        selected.push(truncated);
        totalTokens = maxTokens; // We're full
      }
      break;
    }
  }

  // Strategy 2: Ensure we have coverage from multiple sources
  const documentIds = new Set(selected.map(s => s.metadata.documentId));
  if (documentIds.size < Math.min(3, selected.length)) {
    // Try to diversify
    const remaining = results.filter(r => !selected.includes(r));
    for (const result of remaining) {
      if (!documentIds.has(result.metadata.documentId) && totalTokens + result.metadata.tokenCount <= maxTokens) {
        selected.push(result);
        totalTokens += result.metadata.tokenCount;
        documentIds.add(result.metadata.documentId);

        if (documentIds.size >= 3) break;
      }
    }
  }

  // Strategy 3: Prioritize chapters/beginnings/endings
  const prioritized = reorderByContentImportance(selected);

  return {
    chunks: prioritized,
    totalTokens
  };
}

function truncateContent(result: SearchResult, maxTokens: number): SearchResult {
  const estimatedChars = maxTokens * 4; // Rough conversion
  const truncatedContent = result.content.substring(0, estimatedChars);

  return {
    ...result,
    content: truncatedContent + '... [truncated]'
  };
}

function reorderByContentImportance(chunks: SearchResult[]): SearchResult[] {
  // Reorder to ensure better flow
  const firstChapter = chunks.filter(c => !c.metadata.chapter || isFirstChapter(c.metadata.chapter));
  const middle = chunks.filter(c => c.metadata.chapter && !isFirstChapter(c.metadata.chapter) && !isLastChapter(c.metadata.chapter));
  const lastChapter = chunks.filter(c => c.metadata.chapter && isLastChapter(c.metadata.chapter));

  return [...firstChapter, ...middle, ...lastChapter, ...chunks.filter(c => !c.metadata.chapter)];
}

function isFirstChapter(chapter?: string): boolean {
  if (!chapter) return false;
  const lower = chapter.toLowerCase();
  return lower.includes('intro') || lower.includes('overview') || lower.includes('chapter 1') || lower === '1';
}

function isLastChapter(chapter?: string): boolean {
  if (!chapter) return false;
  const lower = chapter.toLowerCase();
  return lower.includes('conclusion') || lower.includes('summary') || lower.includes('final');
}
