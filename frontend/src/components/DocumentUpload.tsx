import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploadProps {
  onUploadComplete?: (document: any) => void;
  onClose?: () => void;
  subjectId?: string; // Add subjectId to link uploaded document to KB
}

export default function DocumentUpload({ onUploadComplete, onClose, subjectId }: DocumentUploadProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, DOC, DOCX, and TXT files are allowed');
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);

      // Upload to server
      const response = await fetch('http://localhost:4000/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      setProgress(100);
      clearInterval(progressInterval);

      // Link document to KB if subjectId is provided
      if (subjectId && data.document?.id) {
        try {
          await fetch(`http://localhost:4000/api/subjects/${subjectId}/add-document`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ documentId: data.document.id })
          });
        } catch (linkError) {
          console.error('Failed to link document to KB:', linkError);
          // Don't fail the upload if linking fails
        }
      }

      // Call completion handler
      if (onUploadComplete) {
        onUploadComplete(data.document);
      }

      // Close after short delay
      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Upload Document</h2>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Upload Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${dragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
              ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={!uploading ? handleFileSelect : undefined}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-800">Uploading...</p>
                  <div className="w-full max-w-xs mx-auto bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{progress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    Drag & drop your document here
                  </p>
                  <p className="text-gray-600">
                    or <span className="text-indigo-600 font-semibold">browse files</span>
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  <p>Supported formats: PDF, DOC, DOCX, TXT</p>
                  <p>Maximum file size: 50MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {/* File Info */}
          {!uploading && !error && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>💡 <strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Use descriptive file names for easier organization</li>
                <li>Documents with clear chapter structure work best</li>
                <li>Large documents may take longer to process</li>
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
