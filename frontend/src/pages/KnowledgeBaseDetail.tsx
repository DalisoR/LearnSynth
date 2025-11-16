import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  BookOpen,
  Calendar,
  Star,
  Trash2,
  Download,
  Eye,
  Upload,
  Search as SearchIcon,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import KBSearch from '@/components/KBSearch';
import KBDocumentOverview from '@/components/KBDocumentOverview';
import DocumentUpload from '@/components/DocumentUpload';
import ChatInterface from '@/components/ChatInterface';

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

interface Subject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

export default function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');

  useEffect(() => {
    if (id) {
      loadKBDetails();
    }
  }, [id, user]);

  const loadKBDetails = async () => {
    if (!user || !id) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();

      if (response.ok) {
        setSubject(data.subject);
        setDocuments(data.documents || []);
        setFormName(data.subject.name);
        setFormDescription(data.subject.description || '');
        setFormColor(data.subject.color || '#6366f1');
      }
    } catch (error) {
      console.error('Failed to load KB details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateKB = async () => {
    if (!subject || !user || !formName.trim()) return;

    try {
      const response = await fetch(`http://localhost:4000/api/subjects/${subject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          color: formColor
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubject(data.subject);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update KB:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!subject || !user) return;

    try {
      const response = await fetch(`http://localhost:4000/api/subjects/${subject.id}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          isFavorite: !subject.is_favorite
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubject({ ...subject, is_favorite: data.subject.is_favorite });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Remove this document from the knowledge base?')) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${id}/documents/${documentId}`,
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

  const handleAddDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${id}/add-document`,
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
        loadKBDetails(); // Reload to get updated document list
      }
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  };

  const handleUploadComplete = (document: Document) => {
    loadKBDetails(); // Refresh documents list
    setShowUploadModal(false);
  };

  const loadAvailableDocuments = async () => {
    if (!id) return;

    setLoadingDocs(true);
    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects/${id}/available-documents`,
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
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (showAddModal) {
      loadAvailableDocuments();
    }
  }, [showAddModal, id]);

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

  const totalChapters = documents.reduce((sum, doc) => sum + doc.chapters.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-gray-800">Loading Knowledge Base...</div>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Knowledge Base Not Found</h2>
          <Button onClick={() => navigate('/knowledge')}>Back to Knowledge Bases</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/knowledge')}
            className="hover:bg-indigo-50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {!editing ? (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: subject.color || '#6366f1' }}
                      >
                        <Brain className="w-7 h-7 text-white" />
                      </div>
                      {subject.name}
                    </h1>
                    {subject.is_favorite && (
                      <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                  {subject.description && (
                    <p className="text-gray-600 text-lg">{subject.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Updated {formatDate(subject.updated_at)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {documents.length} Documents
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {totalChapters} Chapters
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleToggleFavorite}
                    className="gap-2"
                  >
                    <Star className={`w-4 h-4 ${subject.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {subject.is_favorite ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="w-6 h-6 text-indigo-600" />
                      <h2 className="text-2xl font-semibold">Edit Knowledge Base</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Name *</label>
                        <Input
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="e.g., Computer Science, History..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Color</label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            value={formColor}
                            onChange={(e) => setFormColor(e.target.value)}
                            className="w-12 h-12 rounded-lg cursor-pointer"
                          />
                          <span className="text-sm text-gray-600">{formColor}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Brief description of this knowledge base..."
                        className="w-full border rounded-lg p-2 min-h-[100px]"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          setEditing(false);
                          setFormName(subject.name);
                          setFormDescription(subject.description || '');
                          setFormColor(subject.color || '#6366f1');
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdateKB}
                        disabled={!formName.trim()}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Documents</p>
                  <p className="text-3xl font-bold text-purple-600">{documents.length}</p>
                </div>
                <div className="p-4 bg-purple-100 rounded-full">
                  <FileText className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Chapters</p>
                  <p className="text-3xl font-bold text-pink-600">{totalChapters}</p>
                </div>
                <div className="p-4 bg-pink-100 rounded-full">
                  <BookOpen className="w-8 h-8 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-xl font-bold text-indigo-600">{formatDate(subject.created_at)}</p>
                </div>
                <div className="p-4 bg-indigo-100 rounded-full">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="documents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <SearchIcon className="w-4 h-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              AI Tutor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
            {documents.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-12">
                  <div className="text-center max-w-2xl mx-auto">
                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-8">
                      <BookOpen className="w-16 h-16 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">
                      Add Documents to <span className="text-indigo-600">{subject.name}</span>
                    </h2>
                    <p className="text-gray-600 mb-8 text-lg">
                      Start building your knowledge base by adding documents. You can upload new documents or add from your existing library.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                      {/* Upload New Document */}
                      <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 hover:border-indigo-500 transition-colors">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                            <Upload className="w-8 h-8 text-indigo-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Upload New Document
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Upload a PDF, DOC, DOCX, or TXT file directly to this knowledge base
                          </p>
                          <Button
                            onClick={() => setShowUploadModal(true)}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2 w-full"
                          >
                            <Upload className="w-5 h-5" />
                            Upload Document
                          </Button>
                          <p className="text-xs text-gray-500 mt-3">
                            Max size: 50MB
                          </p>
                        </div>
                      </div>

                      {/* Add from Existing */}
                      <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 hover:border-indigo-500 transition-colors">
                        <div className="flex flex-col items-center text-center">
                          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-purple-600" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-800 mb-2">
                            Add from Existing
                          </h3>
                          <p className="text-gray-600 mb-6">
                            Browse and add documents you've already uploaded to your account
                          </p>
                          <Button
                            onClick={() => {
                              loadAvailableDocuments();
                              setShowAddModal(true);
                            }}
                            variant="outline"
                            className="border-2 border-purple-300 text-purple-600 hover:bg-purple-50 gap-2 w-full"
                          >
                            <Plus className="w-5 h-5" />
                            Browse Library
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Pro tip:</strong> Add multiple related documents to create a comprehensive knowledge base for better learning and search results.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <KBDocumentOverview
                subjectId={subject.id}
                subjectName={subject.name}
              />
            )}
          </TabsContent>

          <TabsContent value="search">
            <KBSearch
              subjectId={subject.id}
              subjectName={subject.name}
              onAddToLesson={(content, source) => {
                console.log('Add to lesson:', content, source);
              }}
            />
          </TabsContent>

          <TabsContent value="chat">
            <ChatInterface subjectId={subject.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Add Document to Knowledge Base</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              {loadingDocs ? (
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
                <div className="divide-y">
                  {availableDocs.map((doc) => (
                    <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">{doc.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type.toUpperCase()}
                            </Badge>
                            <Badge
                              variant={doc.upload_status === 'completed' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {doc.upload_status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>Added {formatDate(doc.created_at)}</span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleAddDocument(doc.id)}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <DocumentUpload
            subjectId={subject?.id}
            onUploadComplete={handleUploadComplete}
            onClose={() => setShowUploadModal(false)}
          />
        </div>
      )}
    </div>
  );
}
