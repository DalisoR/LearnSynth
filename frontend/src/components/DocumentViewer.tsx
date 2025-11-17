import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  HardDrive,
  BookOpen
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  word_count: number;
}

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  upload_status: string;
  created_at: string;
  metadata: any;
  chapters: Chapter[];
}

export default function DocumentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Viewer state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (id && user) {
      loadDocument();
    }
  }, [id, user]);

  useEffect(() => {
    // Load PDF and render (mock implementation for now)
    if (document) {
      renderMockPDF();
    }
  }, [document, zoom, rotation, currentPage]);

  const loadDocument = async () => {
    if (!id || !user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/documents/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const data = await response.json();

      // Mock chapters data (in real app, would come from API)
      const mockChapters = [
        { id: '1', chapter_number: 1, title: 'Introduction', word_count: 1500 },
        { id: '2', chapter_number: 2, title: 'Chapter 1: Getting Started', word_count: 3200 },
        { id: '3', chapter_number: 3, title: 'Chapter 2: Advanced Concepts', word_count: 4100 },
        { id: '4', chapter_number: 4, title: 'Chapter 3: Best Practices', word_count: 2800 },
        { id: '5', chapter_number: 5, title: 'Conclusion', word_count: 900 }
      ];

      setDocument({
        ...data.document,
        chapters: mockChapters
      });

      // Mock total pages
      setTotalPages(42);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderMockPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate canvas size based on zoom
    const baseWidth = 600;
    const baseHeight = 800;
    const scale = zoom / 100;

    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw mock PDF page
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw border
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

    // Draw page content
    ctx.fillStyle = '#495057';
    ctx.font = `${14 * scale}px Arial`;

    // Mock title
    ctx.font = `${18 * scale}px Arial`;
    ctx.fillText(document?.title || 'Document', 20 * scale, 40 * scale);

    // Mock page number
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText(`Page ${currentPage} of ${totalPages}`, 20 * scale, canvas.height - 20 * scale);

    // Mock content lines
    ctx.font = `${12 * scale}px Arial`;
    for (let i = 0; i < 20; i++) {
      const y = 80 * scale + (i * 25 * scale);
      const lineWidth = (canvas.width - 40 * scale) * (0.7 + Math.random() * 0.3);
      ctx.fillRect(20 * scale, y, lineWidth, 2 * scale);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Mock search results (in real app, would search PDF)
    const mockResults = [3, 15, 28, 35];
    setSearchResults(mockResults);
  };

  const handleJumpToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-gray-800">Loading Document...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Document</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => navigate('/books')} className="w-full">
              Back to Documents
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Chapter List */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/books')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Button>
          <h2 className="text-xl font-bold text-gray-800 truncate">{document.title}</h2>
        </div>

        {/* Document Metadata */}
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>{document.file_type.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <HardDrive className="w-4 h-4" />
            <span>{formatFileSize(document.file_size)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(document.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpen className="w-4 h-4" />
            <span>{document.chapters.length} chapters</span>
          </div>
        </div>

        {/* Chapter List */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Chapters</h3>
          <div className="space-y-2">
            {document.chapters.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  // In real app, jump to chapter
                  const page = Math.floor(Math.random() * totalPages) + 1;
                  setCurrentPage(page);
                }}
                className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-200"
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs mt-0.5">
                    Ch. {chapter.chapter_number}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {chapter.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {chapter.word_count} words
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content - PDF Viewer */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center">{zoom}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 300}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search in document..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button onClick={handleSearch}>Search</Button>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Found {searchResults.length} results
              </p>
              <div className="flex gap-2 flex-wrap">
                {searchResults.map((page) => (
                  <Button
                    key={page}
                    variant="outline"
                    size="sm"
                    onClick={() => handleJumpToPage(page)}
                  >
                    Page {page}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PDF Canvas */}
        <div className="flex-1 overflow-auto bg-gray-200 p-8 flex items-center justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="shadow-2xl"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
            />
          </div>
        </div>

        {/* Page Navigation */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page) handleJumpToPage(page);
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(e.currentTarget.value);
                    if (page) handleJumpToPage(page);
                  }
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                min={1}
                max={totalPages}
              />
              <span className="text-gray-600">of {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
