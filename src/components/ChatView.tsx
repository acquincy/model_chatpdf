import React, { useState, useEffect, useRef } from 'react';
import { Send, FileText, Loader2, CheckCircle, Upload } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
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
  const [base64Data, setBase64Data] = useState<string>('');
  
  // New state for upload flow
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    
    // Convert file to base64 for Gemini API
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      setBase64Data(base64);
    };
    reader.readAsDataURL(file);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpload = async () => {
    setUploadStatus('uploading');
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
          setUploadStatus('error');
          return;
        }
      }
      setUploadStatus('success');
      setShowSuccessBanner(true);
      setTimeout(() => setShowSuccessBanner(false), 5000); // Hide banner after 5s
    } catch (err) {
      console.error('Failed to trigger n8n webhook via proxy.', err);
      setUploadStatus('error');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !base64Data) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Build history for context
      const history = messages.map((m, index) => {
        const parts: any[] = [];
        if (index === 0 && m.role === 'user') {
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: file.type || 'application/pdf'
            }
          });
        }
        parts.push({ text: m.text });
        return {
          role: m.role,
          parts
        };
      });

      const currentMessageParts: any[] = [];
      if (messages.length === 0) {
        currentMessageParts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type || 'application/pdf'
          }
        });
      }
      currentMessageParts.push({ text: userMessage });

      // Add the document to the current request
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...history,
          {
            role: 'user',
            parts: currentMessageParts
          }
        ]
      });

      if (response.text) {
        setMessages(prev => [...prev, { role: 'model', text: response.text }]);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error while processing your request.' }]);
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
                disabled={isLoading || !base64Data}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim() || !base64Data}
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
