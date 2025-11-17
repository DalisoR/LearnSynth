// Search Performance Optimization Utilities

export interface SearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  enableCache?: boolean;
  priority?: 'speed' | 'quality';
}

export interface CachedSearchResult {
  query: string;
  results: any[];
  timestamp: number;
  ttl: number;
  resultCount: number;
}

export interface SearchMetrics {
  queryTime: number;
  resultCount: number;
  cacheHit: boolean;
  apiCallsSaved: number;
}

/**
 * Debounce function to limit API calls during typing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * Create a debounced search function
 */
export function createDebouncedSearch(
  searchFn: (query: string, ...args: any[]) => Promise<any>,
  options: SearchOptions = {}
) {
  const {
    debounceMs = 300,
    minQueryLength = 3,
    maxResults = 20,
    enableCache = true
  } = options;

  let searchCache: Map<string, CachedSearchResult> = new Map();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const debouncedSearch = debounce(
    async (query: string, callback: (results: any[], metrics: SearchMetrics) => void) => {
      const startTime = performance.now();

      // Skip if query too short
      if (query.length < minQueryLength) {
        callback([], {
          queryTime: performance.now() - startTime,
          resultCount: 0,
          cacheHit: false,
          apiCallsSaved: 0
        });
        return;
      }

      // Check cache
      if (enableCache) {
        const cacheKey = generateCacheKey(query);
        const cached = searchCache.get(cacheKey);

        if (cached && !isCacheExpired(cached)) {
          callback(cached.results.slice(0, maxResults), {
            queryTime: performance.now() - startTime,
            resultCount: cached.resultCount,
            cacheHit: true,
            apiCallsSaved: 1
          });
          return;
        }
      }

      // Perform API search
      try {
        const results = await searchFn(query);
        const queryTime = performance.now() - startTime;

        // Cache results
        if (enableCache) {
          const cacheKey = generateCacheKey(query);
          searchCache.set(cacheKey, {
            query,
            results,
            timestamp: Date.now(),
            ttl: CACHE_TTL,
            resultCount: results.length
          });

          // Clean up old cache entries
          if (searchCache.size > 50) {
            cleanupCache(searchCache);
          }
        }

        callback(results.slice(0, maxResults), {
          queryTime,
          resultCount: results.length,
          cacheHit: false,
          apiCallsSaved: 0
        });
      } catch (error) {
        console.error('Search error:', error);
        callback([], {
          queryTime: performance.now() - startTime,
          resultCount: 0,
          cacheHit: false,
          apiCallsSaved: 0
        });
      }
    },
    debounceMs,
    false
  );

  return debouncedSearch;
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(cache: Map<string, CachedSearchResult>) {
  for (const [key, value] of cache.entries()) {
    if (isCacheExpired(value)) {
      cache.delete(key);
    }
  }
}

/**
 * Check if cache entry is expired
 */
function isCacheExpired(entry: CachedSearchResult): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Generate cache key from query
 */
function generateCacheKey(query: string): string {
  return `search:${query.toLowerCase().trim()}`;
}

/**
 * Search query preprocessor
 */
export function preprocessQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Extract search terms for analytics
 */
export function extractSearchTerms(query: string): string[] {
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be',
    'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'this',
    'that', 'these', 'those'
  ];

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5); // Limit to top 5 terms
}

/**
 * Suggest related queries based on current query
 */
export function suggestRelatedQueries(query: string): string[] {
  const suggestions: string[] = [];
  const terms = extractSearchTerms(query);

  // Add variations with "what is", "how to", "why"
  if (terms.length > 0) {
    suggestions.push(`what is ${terms[0]}`);
    suggestions.push(`how to ${terms[0]}`);
    suggestions.push(`why ${terms[0]}`);
  }

  // Add "definition", "examples", "guide"
  if (terms.length > 0) {
    suggestions.push(`${terms[0]} definition`);
    suggestions.push(`${terms[0]} examples`);
    suggestions.push(`${terms[0]} guide`);
  }

  // Combine terms for complex queries
  if (terms.length > 1) {
    suggestions.push(terms.join(' '));
    suggestions.push(`${terms[0]} and ${terms[1]}`);
  }

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Calculate search result relevance score
 */
export function calculateRelevanceScore(
  query: string,
  result: {
    content: string;
    title?: string;
  }
): number {
  const queryTerms = extractSearchTerms(query);
  const text = `${result.title || ''} ${result.content}`.toLowerCase();

  if (queryTerms.length === 0) return 0;

  let score = 0;
  let matchCount = 0;

  queryTerms.forEach(term => {
    const regex = new RegExp(term, 'gi');
    const matches = text.match(regex);
    if (matches) {
      matchCount++;
      score += matches.length;
    }
  });

  // Normalize score
  const maxPossibleScore = queryTerms.length * 2;
  const normalizedScore = Math.min(score / maxPossibleScore, 1);

  // Boost score if title matches
  if (result.title) {
    const titleMatch = queryTerms.some(term =>
      result.title!.toLowerCase().includes(term)
    );
    if (titleMatch) {
      return Math.min(normalizedScore * 1.2, 1);
    }
  }

  return normalizedScore;
}

/**
 * Filter and rank search results
 */
export function filterAndRankResults(
  results: any[],
  query: string,
  options: {
    minScore?: number;
    maxResults?: number;
  } = {}
): any[] {
  const { minScore = 0, maxResults = 20 } = options;

  // Calculate scores
  const scoredResults = results
    .map(result => ({
      ...result,
      relevanceScore: calculateRelevanceScore(query, result)
    }))
    .filter(result => result.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scoredResults.slice(0, maxResults);
}

/**
 * Track search performance metrics
 */
export function trackSearchMetrics(query: string, metrics: SearchMetrics) {
  const terms = extractSearchTerms(query);

  // In production, send to analytics service
  console.log('Search metrics:', {
    query,
    terms,
    queryTime: metrics.queryTime,
    resultCount: metrics.resultCount,
    cacheHit: metrics.cacheHit,
    apiCallsSaved: metrics.apiCallsSaved
  });
}

/**
 * Virtual scrolling helper for large result lists
 */
export function createVirtualScrollConfig(
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  return {
    itemHeight,
    containerHeight,
    overscan,
    getVisibleRange: (scrollTop: number, totalItems: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
        totalItems - 1
      );

      return {
        startIndex: Math.max(0, startIndex - overscan),
        endIndex
      };
    }
  };
}

/**
 * Prefetch search results for anticipated queries
 */
export function prefetchSearchResults(
  searchFn: (query: string) => Promise<any[]>,
  queries: string[]
): void {
  queries.forEach(query => {
    setTimeout(() => {
      searchFn(query).catch(() => {
        // Silent fail for prefetch
      });
    }, Math.random() * 2000); // Stagger prefetch requests
  });
}

/**
 * Optimize search for different query types
 */
export function getSearchStrategy(query: string): {
  maxResults: number;
  timeoutMs: number;
  priority: 'speed' | 'quality';
} {
  const isLongQuery = query.split(' ').length > 5;
  const hasSpecialChars = /[^\w\s]/.test(query);
  const isQuestion = query.includes('?') ||
    query.startsWith('what') ||
    query.startsWith('how') ||
    query.startsWith('why');

  if (isLongQuery || hasSpecialChars) {
    // Complex query - prioritize quality
    return {
      maxResults: 30,
      timeoutMs: 5000,
      priority: 'quality'
    };
  } else if (isQuestion) {
    // Question - balanced approach
    return {
      maxResults: 20,
      timeoutMs: 3000,
      priority: 'quality'
    };
  } else {
    // Simple query - prioritize speed
    return {
      maxResults: 15,
      timeoutMs: 1500,
      priority: 'speed'
    };
  }
}

/**
 * Local search for instant results (using indexedDB or similar)
 */
export async function localSearch(
  query: string,
  index: Map<string, any[]>
): Promise<any[]> {
  const results: any[] = [];
  const searchTerms = extractSearchTerms(query);

  for (const [key, documents] of index.entries()) {
    const match = searchTerms.some(term => key.includes(term));
    if (match) {
      results.push(...documents);
    }
  }

  return filterAndRankResults(results, query, { maxResults: 10 });
}
