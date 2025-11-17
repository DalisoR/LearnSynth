import { useState, useEffect, useRef } from 'react';
import { Search, FileText, BookOpen, ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  content: string;
  relevanceScore: number;
  source: {
    chapterId: string;
    chapterTitle: string;
    chapterNumber: number;
    documentId: string;
    documentTitle: string;
    subjectId: string;
    subjectName: string;
  };
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-focus when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/search?query=${encodeURIComponent(searchQuery)}&limit=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);

        // Save to recent searches
        const newRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      } else {
        console.error('Search failed:', data.error);
        setResults([]);
      }
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Close on Escape
    if (e.key === 'Escape') {
      onClose();
    }

    // Navigate results with arrow keys
    if (e.key === 'ArrowDown' && resultsRef.current) {
      e.preventDefault();
      const firstResult = resultsRef.current.querySelector('[data-result]') as HTMLElement;
      if (firstResult) firstResult.focus();
    }
  };

  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const selectRecentSearch = (search: string) => {
    setQuery(search);
    handleSearch(search);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          {/* Search Input */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search across all knowledge bases..."
                className="w-full pl-10 pr-4 py-3 border-0 focus:outline-none text-lg"
              />
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Recent searches</span>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => selectRecentSearch(search)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-gray-700"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center p-12">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <div className="text-gray-600">Searching knowledge bases...</div>
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && query && results.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No results found</h3>
                <p className="text-gray-600">
                  Try adjusting your search query or using different keywords
                </p>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div ref={resultsRef} className="divide-y">
                {results.map((result, index) => (
                  <div
                    key={index}
                    data-result
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      window.open(`/knowledge/${result.source.subjectId}`, '_blank');
                      onClose();
                    }}
                    tabIndex={0}
                  >
                    <div className="space-y-2">
                      {/* Content Preview */}
                      <div className="text-gray-800 leading-relaxed">
                        {highlightQuery(result.content.substring(0, 200), query)}
                        {result.content.length > 200 && '...'}
                      </div>

                      {/* Source Information */}
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span className="font-medium text-indigo-600">{result.source.subjectName}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{result.source.documentTitle}</span>
                        </div>
                        <span>•</span>
                        <span>
                          Ch. {result.source.chapterNumber}: {result.source.chapterTitle}
                        </span>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.relevanceScore * 100)}% match
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Help Text */}
            {!query && recentSearches.length === 0 && (
              <div className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Search Knowledge Bases
                </h3>
                <p className="text-gray-600 mb-4">
                  Find information across all your knowledge bases
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Enter</kbd>
                    <span>to search</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Esc</kbd>
                    <span>to close</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
