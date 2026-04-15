import React, { useState, useEffect } from 'react';
import { FileText, Upload, ArrowLeft, Loader2 } from 'lucide-react';

interface PreviewViewProps {
  file: File;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export function PreviewView({ file, onUploadComplete, onCancel }: PreviewViewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
      if (webhookUrl) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        formData.append('timestamp', new Date().toISOString());

        const response = await fetch('/api/webhook', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          console.error(`n8n webhook failed with status: ${response.status} ${response.statusText}`);
        } else {
          console.log('n8n webhook triggered successfully');
        }
      }
    } catch (err) {
      console.error('Failed to trigger n8n webhook via proxy.', err);
    } finally {
      setIsUploading(false);
      onUploadComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <button 
            onClick={onCancel} 
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ff5a1f]" />
            <span className="font-medium text-gray-700 truncate max-w-[300px]">{file.name}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col items-center max-w-5xl mx-auto w-full">
        <div className="w-full flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 min-h-[60vh]">
          {pdfUrl && (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full"
              title="PDF Preview"
            />
          )}
        </div>
        
        <button 
          onClick={handleUpload}
          disabled={isUploading}
          className="bg-[#ff5a1f] hover:bg-[#e04a15] disabled:bg-orange-300 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Confirm & Upload
            </>
          )}
        </button>
      </div>
    </div>
  );
}
