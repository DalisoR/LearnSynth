import { useState } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { documentsAPI } from '@/services/api';

interface UploadBookProps {
  onUploadComplete?: () => void;
}

export default function UploadBook({ onUploadComplete }: UploadBookProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await documentsAPI.upload(formData);
      setProgress(100);
      setTimeout(() => {
        onUploadComplete?.();
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.docx,.epub"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <p className="text-lg font-medium">Uploading...</p>
              <div className="w-64 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-blue-100 rounded-full">
                <UploadCloud className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium">Upload your textbook</p>
                <p className="text-sm text-gray-500">
                  Drag and drop or click to select (PDF, DOCX, EPUB)
                </p>
              </div>
              <Button>Select File</Button>
            </>
          )}
        </div>
      </label>
    </div>
  );
}
