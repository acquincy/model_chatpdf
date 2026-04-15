import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload } from 'lucide-react';

interface UploadViewProps {
  onFileUpload: (file: File) => void;
}

export function UploadView({ onFileUpload }: UploadViewProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ff5a1f] rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">Chat PDF</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-gray-600 hover:text-gray-900 font-medium text-sm">Pricing</button>
          <button className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
            Sign up
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center py-20 px-4">
        <div className="max-w-3xl w-full text-center space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chat with PDF</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            Upload any PDF to Chat PDF, ask a question, and get concise,
            citation-linked answers, summaries, and follow-ups in seconds—free tier, 256-
            bit encrypted, no data training, supports 75 + languages.
          </p>

          <div
            {...getRootProps()}
            className={`mt-12 border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer
              ${isDragActive ? 'border-[#ff5a1f] bg-orange-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
          >
            <input {...getInputProps()} />
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-xl font-medium text-gray-700 mb-2">
              Drag and drop or click here to browse
            </p>
            <p className="text-sm text-gray-500 mb-8">Max. 100 MB per file</p>
            
            <button className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
              <Upload className="w-5 h-5" />
              Upload PDFs
            </button>
            
            <p className="mt-6 text-sm text-gray-500">
              Or <button className="text-[#ff5a1f] hover:underline" onClick={(e) => { e.stopPropagation(); /* load sample */ }}>Try a sample pdf</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
