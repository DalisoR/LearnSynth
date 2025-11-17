import { useState, useEffect } from 'react';
import { Search, FileText, BookOpen, Copy, ExternalLink, Star } from 'lucide-react';
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

interface KBSearchProps {
  subjectId: string;
  subjectName: string;
  onAddToLesson?: (content: string, source: SearchResult['source']) => void;
}

export default function KBSearch({ subjectId, subjectName, onAddToLesson }: KBSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(10);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${subjectId}/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Search Knowledge Base</h3>
              <p className="text-gray-600 text-sm">
                Search within <span className="font-semibold">{subjectName}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question or search for content..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8"
              >
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <label>Results per page:</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
              {results.length > 0 && (
                <div className="text-xs text-gray-500">
                  Found {results.length} results
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-gray-600">Searching knowledge base...</div>
          </CardContent>
        </Card>
      )}

      {!loading && query && results.length === 0 && (
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No results found</h3>
            <p className="text-gray-600">
              Try adjusting your search query or using different keywords
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card
              key={index}
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Result Content */}
                  <div className="text-gray-800 leading-relaxed">
                    {highlightQuery(result.content, query)}
                  </div>

                  {/* Source Information */}
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">{result.source.documentTitle}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>
                        Chapter {result.source.chapterNumber}: {result.source.chapterTitle}
                      </span>
                    </div>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(result.relevanceScore * 100)}% match
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.content)}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/documents/${result.source.documentId}`,
                          '_blank'
                        )
                      }
                      className="gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Document
                    </Button>
                    {onAddToLesson && (
                      <Button
                        size="sm"
                        onClick={() => onAddToLesson(result.content, result.source)}
                        className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600"
                      >
                        <Star className="w-4 h-4" />
                        Add to Lesson
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
