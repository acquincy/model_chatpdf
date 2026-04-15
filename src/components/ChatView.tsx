import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Loader2, CheckCircle, Upload } from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatViewProps {
  file: File;
  onBack: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export function ChatView({ file, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New state for upload flow
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpload = async () => {
    setUploadStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      formData.append('timestamp', new Date().toISOString());

      const response = await fetch('/api/webhook', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Webhook failed: ${response.status} ${response.statusText}`, errorData);
        setUploadStatus('error');
        return;
      }
      
      setUploadStatus('success');
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000); // Hide banner after 5s
    } catch (err) {
      console.error('Failed to trigger webhook via proxy.', err);
      setUploadStatus('error');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          fileName: file.name
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Extract response text from n8n payload
      let replyText = "Received response from n8n.";
      if (data.text) replyText = data.text;
      else if (data.message) replyText = data.message;
      else if (data.output) replyText = data.output;
      else if (typeof data === 'string') replyText = data;
      else replyText = JSON.stringify(data, null, 2);

      setMessages(prev => [...prev, { role: 'model', text: replyText }]);
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error communicating with n8n.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Left Panel - PDF Viewer */}
      <div className={`${uploadStatus === 'success' ? 'w-1/2 border-r' : 'w-full max-w-5xl mx-auto shadow-lg'} flex flex-col bg-white border-gray-200 transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ff5a1f]" />
            <span className="font-medium text-gray-700 truncate max-w-[300px]">{file.name}</span>
          </div>
          <button 
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Upload different file
          </button>
        </div>
        <div className="flex-1 bg-gray-100 p-4">
          {pdfUrl && (
            <iframe 
              src={`${pdfUrl}#toolbar=0`} 
              className="w-full h-full rounded-lg shadow-sm border border-gray-200 bg-white"
              title="PDF Viewer"
            />
          )}
        </div>
        
        {/* Upload Footer (only visible before success) */}
        {uploadStatus !== 'success' && (
          <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {uploadStatus === 'error' ? (
                <span className="text-red-500">Upload failed. Please try again.</span>
              ) : (
                'Please confirm and upload the document to continue.'
              )}
            </p>
            <button 
              onClick={handleUpload}
              disabled={uploadStatus === 'uploading'}
              className="bg-[#ff5a1f] hover:bg-[#e04a15] disabled:bg-orange-300 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              {uploadStatus === 'uploading' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-5 h-5" /> Confirm & Upload</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Chat */}
      {uploadStatus === 'success' && (
        <div className="w-1/2 flex flex-col bg-white">
          {showSuccessBanner && (
            <div className="bg-green-50 border-b border-green-100 p-3 flex items-center justify-center gap-2 text-green-700 text-sm animate-in slide-in-from-top-2">
              <CheckCircle className="w-4 h-4" />
              Document successfully sent to webhook!
            </div>
          )}
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-800">Chat</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-10">
                <p>Ask me anything about the document!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-[#ff5a1f] text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  {msg.role === 'model' ? (
                    <div className="markdown-body prose prose-sm max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask a question..."
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff5a1f] focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#ff5a1f] disabled:opacity-50 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
