import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Clock, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UploadBook from '@/components/UploadBook';
import { documentsAPI } from '@/services/api';
import { Document } from '@/types/api';

export default function MyBooks() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await documentsAPI.getAll();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const handleDeleteClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;

    setDeleting(true);
    try {
      await documentsAPI.delete(documentToDelete.id);
      setDocuments(documents.filter(d => d.id !== documentToDelete.id));
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
      alert('Failed to delete document. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Books</h1>
        <Button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Upload Book
        </Button>
      </div>

      {showUpload && (
        <div className="mb-8">
          <UploadBook onUploadComplete={() => {
            loadDocuments();
            setShowUpload(false);
          }} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">No books uploaded yet</p>
          <p className="text-sm">Upload your first textbook to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.upload_status)}
                  <span className="text-sm">{getStatusText(doc.upload_status)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    onClick={(e) => handleDeleteClick(doc, e)}
                    title="Delete book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div onClick={() => doc.upload_status === 'completed' && navigate(`/documents/${doc.id}`)}>
                <h3 className="font-semibold mb-2 line-clamp-2">{doc.title}</h3>
                <div className="text-sm text-gray-500">
                  <p>{(doc.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="capitalize">{doc.file_type.toUpperCase()}</p>
                  <p>{new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
                {doc.upload_status === 'completed' && (
                  <div className="mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/workspace/${doc.id}`);
                      }}
                    >
                      Open Lesson Workspace
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.title}"? This action will permanently remove:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The document file</li>
                <li>All chapters and content</li>
                <li>All generated lessons</li>
                <li>All associated data</li>
              </ul>
              <span className="font-semibold text-red-600 block mt-2">
                This action cannot be undone.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
