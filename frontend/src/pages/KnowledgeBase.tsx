import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Plus,
  Search,
  Edit,
  Trash2,
  Star,
  FileText,
  BookOpen,
  Calendar,
  MoreVertical,
  Filter,
  Grid,
  List,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
  document_count?: number;
  chapter_count?: number;
  is_favorite?: boolean;
}

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedKB, setSelectedKB] = useState<Subject | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');

  useEffect(() => {
    loadSubjects();
  }, [user]);

  useEffect(() => {
    filterAndSortSubjects();
  }, [subjects, searchQuery, sortBy, filterFavorites]);

  const loadSubjects = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/subjects?userId=${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();

      // Fetch document/chapter counts for each subject
      const subjectsWithStats = await Promise.all(
        (data.subjects || []).map(async (subject: Subject) => {
          try {
            const statsResponse = await fetch(
              `http://localhost:4000/api/subjects/${subject.id}/stats`,
              {
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              }
            );
            const stats = await statsResponse.json();
            return {
              ...subject,
              document_count: stats.document_count || 0,
              chapter_count: stats.chapter_count || 0
            };
          } catch {
            return {
              ...subject,
              document_count: 0,
              chapter_count: 0
            };
          }
        })
      );

      setSubjects(subjectsWithStats);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSubjects = () => {
    let filtered = [...subjects];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(kb =>
        kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter favorites
    if (filterFavorites) {
      filtered = filtered.filter(kb => kb.is_favorite);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredSubjects(filtered);
  };

  const handleCreateKB = async () => {
    if (!formName.trim() || !user) return;

    try {
      const response = await fetch('http://localhost:4000/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          name: formName,
          description: formDescription,
          color: formColor
        })
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        resetForm();
        loadSubjects();
        // Navigate to the newly created KB detail page
        navigate(`/knowledge/${data.subject.id}`);
      }
    } catch (error) {
      console.error('Failed to create KB:', error);
    }
  };

  const handleUpdateKB = async () => {
    if (!selectedKB || !formName.trim() || !user) return;

    try {
      const response = await fetch(`http://localhost:4000/api/subjects/${selectedKB.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          name: formName,
          description: formDescription,
          color: formColor
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedKB(null);
        resetForm();
        loadSubjects();
      }
    } catch (error) {
      console.error('Failed to update KB:', error);
    }
  };

  const handleDeleteKB = async (kb: Subject) => {
    if (!window.confirm(`Are you sure you want to delete "${kb.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:4000/api/subjects/${kb.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        loadSubjects();
      }
    } catch (error) {
      console.error('Failed to delete KB:', error);
    }
  };

  const handleToggleFavorite = async (kb: Subject) => {
    try {
      const response = await fetch(`http://localhost:4000/api/subjects/${kb.id}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id,
          isFavorite: !kb.is_favorite
        })
      });

      if (response.ok) {
        loadSubjects();
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const openEditModal = (kb: Subject) => {
    setSelectedKB(kb);
    setFormName(kb.name);
    setFormDescription(kb.description || '');
    setFormColor(kb.color || '#6366f1');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor('#6366f1');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-xl font-semibold text-gray-800">Loading Knowledge Bases...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2 md:gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center">
                <Brain className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <span className="hidden xs:inline">Knowledge Bases</span>
              <span className="xs:hidden">Knowledge</span>
            </h1>
            <p className="text-gray-600 mt-2 text-sm md:text-base">Manage your learning materials and enhance lessons with contextual knowledge</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden xs:inline">Create Knowledge Base</span>
            <span className="xs:hidden">Create KB</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total Knowledge Bases</p>
                  <p className="text-2xl md:text-3xl font-bold text-indigo-600">{subjects.length}</p>
                </div>
                <div className="p-3 md:p-4 bg-indigo-100 rounded-full">
                  <Brain className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total Documents</p>
                  <p className="text-2xl md:text-3xl font-bold text-purple-600">
                    {subjects.reduce((sum, kb) => sum + (kb.document_count || 0), 0)}
                  </p>
                </div>
                <div className="p-3 md:p-4 bg-purple-100 rounded-full">
                  <FileText className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Total Chapters</p>
                  <p className="text-2xl md:text-3xl font-bold text-pink-600">
                    {subjects.reduce((sum, kb) => sum + (kb.chapter_count || 0), 0)}
                  </p>
                </div>
                <div className="p-3 md:p-4 bg-pink-100 rounded-full">
                  <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="border-0 shadow-lg bg-white mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search knowledge bases..."
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Recently Created</option>
                <option value="name">Name (A-Z)</option>
              </select>

              {/* Filter Favorites */}
              <Button
                onClick={() => setFilterFavorites(!filterFavorites)}
                variant={filterFavorites ? 'default' : 'outline'}
                className="gap-2"
              >
                <Star className={`w-4 h-4 ${filterFavorites ? 'fill-white' : ''}`} />
                Favorites
              </Button>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('grid')}
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Bases */}
        {filteredSubjects.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">
                {searchQuery || filterFavorites ? 'No knowledge bases found' : 'No knowledge bases yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || filterFavorites
                  ? 'Try adjusting your search or filters'
                  : 'Create your first knowledge base to enhance lessons with contextual information'}
              </p>
              {!searchQuery && !filterFavorites && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Knowledge Base
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredSubjects.map((kb) => (
              <Card
                key={kb.id}
                className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer bg-white overflow-hidden group"
                onClick={() => navigate(`/knowledge/${kb.id}`)}
              >
                {/* Color Strip */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: kb.color || '#6366f1' }}
                />

                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                          {kb.name}
                        </h3>
                        {kb.is_favorite && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </div>
                      {kb.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{kb.description}</p>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(kb);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Star className={`w-4 h-4 ${kb.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(kb);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteKB(kb);
                        }}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Documents</p>
                        <p className="font-semibold text-gray-800">{kb.document_count || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="p-2 bg-pink-100 rounded-lg">
                        <BookOpen className="w-4 h-4 text-pink-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Chapters</p>
                        <p className="font-semibold text-gray-800">{kb.chapter_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(kb.updated_at)}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {kb.document_count === 0 ? 'Empty' : 'Active'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Computer Science, History..."
                />
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
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKB}
                  disabled={!formName.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedKB && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Computer Science, History..."
                />
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
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedKB(null);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateKB}
                  disabled={!formName.trim()}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
