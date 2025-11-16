import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Eye,
  Download,
  Trash2,
  Upload,
  Grid,
  List,
  Search,
  Calendar,
  HardDrive,
  BookOpen,
  MoreVertical,
  Plus,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DocumentUpload from './DocumentUpload';

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  upload_status: string;
  created_at: string;
  chapters: {
    id: string;
    chapter_number: number;
    title: string;
    word_count: number;
  }[];
}

interface KBDocumentOverviewProps {
  subjectId: string;
  subjectName: string;
}

export default function KBDocumentOverview({ subjectId, subjectName }: KBDocumentOverviewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [subjectId]);

  useEffect(() => {
    // Filter documents based on search query
    if (!searchQuery.trim()) {
      setFilteredDocs(documents);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredDocs(
        documents.filter(doc =>
          doc.title.toLowerCase().includes(query) ||
          doc.file_type.toLowerCase().includes(query)
        )
      );
    }
  }, [documents, searchQuery]);

  const loadDocuments = async () => {
    if (!subjectId || !user) return;

    setLoading(true);
    try {
      // Get documents for this KB
      const response = await fetch(
        `http://localhost:4000/api/subjects/${subjectId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!window.confirm('Remove this document from the knowledge base?')) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${subjectId}/documents/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        setDocuments(docs => docs.filter(d => d.id !== documentId));
      }
    } catch (error) {
      console.error('Failed to remove document:', error);
    }
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/documents/${documentId}`);
  };

  const handleUploadComplete = (document: Document) => {
    // Refresh documents list
    loadDocuments();
    setShowUploadModal(false);
  };

  const loadAvailableDocuments = async () => {
    setLoadingAvailable(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${subjectId}/available-documents`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();

      if (response.ok) {
        setAvailableDocs(data.documents || []);
      }
    } catch (error) {
      console.error('Failed to load available documents:', error);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleAddDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${subjectId}/add-document`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ documentId })
        }
      );

      if (response.ok) {
        setShowAddModal(false);
        setAvailableDocs([]);
        loadDocuments(); // Reload to get updated document list
      }
    } catch (error) {
      console.error('Failed to add document:', error);
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    // Mock thumbnail/placeholder based on file type
    const colors = {
      pdf: 'bg-red-100 text-red-600',
      doc: 'bg-blue-100 text-blue-600',
      docx: 'bg-blue-100 text-blue-600',
      txt: 'bg-gray-100 text-gray-600',
      default: 'bg-purple-100 text-purple-600'
    };
    return colors[fileType as keyof typeof colors] || colors.default;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading documents...</div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Documents in {subjectName}</h2>
          <p className="text-gray-600 mt-1">{documents.length} documents</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              loadAvailableDocuments();
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add from Library
          </Button>
          <Button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="w-4 h-4" />
            Upload New
          </Button>
        </div>
      </div>

      {/* Search and View Controls */}
      <Card className="border-0 shadow-lg bg-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid/List */}
      {filteredDocs.length === 0 ? (
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {searchQuery ? 'No documents match your search' : 'No documents yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Upload documents to get started'
              }
            </p>
            {!searchQuery && (
              <Button
                className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="w-5 h-5" />
                Upload First Document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group"
              onClick={() => handleViewDocument(doc.id)}
            >
              {/* Thumbnail */}
              <div className={`h-48 ${getFileIcon(doc.file_type)} flex items-center justify-center`}>
                <FileText className="w-20 h-20" />
              </div>

              <CardContent className="p-6">
                <div className="space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {doc.title}
                  </h3>

                  {/* Metadata */}
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {doc.file_type.toUpperCase()}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {doc.chapters.length} ch
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(doc.file_size)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.created_at)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocument(doc.id);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle download
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDocument(doc.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-shadow"
              onClick={() => handleViewDocument(doc.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  {/* Thumbnail */}
                  <div className={`w-24 h-24 ${getFileIcon(doc.file_type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <FileText className="w-12 h-12" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition-colors">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <Badge variant="outline">
                        {doc.file_type.toUpperCase()}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {doc.chapters.length} chapters
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        {formatFileSize(doc.file_size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDocument(doc.id);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle download
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDocument(doc.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

    {/* Upload Document Modal */}
    {showUploadModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <DocumentUpload
          subjectId={subjectId}
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      </div>
    )}

    {/* Add from Library Modal */}
    {showAddModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Add from Library</h2>
                <p className="text-gray-600 mt-1">Select documents to add to this Knowledge Base</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAddModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingAvailable ? (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-600">Loading documents...</div>
                  </div>
                </div>
              ) : availableDocs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No documents available</h3>
                  <p className="text-gray-600">
                    All your documents are already in this knowledge base
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableDocs.map((doc) => (
                    <Card key={doc.id} className="border-0 shadow hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${getFileIcon(doc.file_type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-800">{doc.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <Badge variant="outline" className="text-xs">
                                  {doc.file_type.toUpperCase()}
                                </Badge>
                                <span>{formatFileSize(doc.file_size)}</span>
                                <Badge
                                  variant={doc.upload_status === 'completed' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {doc.upload_status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddDocument(doc.id)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2"
                            disabled={doc.upload_status !== 'completed'}
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )}
  </>
  );
}
