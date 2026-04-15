/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadView } from './components/UploadView';
import { PreviewView } from './components/PreviewView';
import { ChatView } from './components/ChatView';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);

  if (file && isUploaded) {
    return (
      <ChatView 
        file={file} 
        onBack={() => {
          setFile(null);
          setIsUploaded(false);
        }} 
      />
    );
  }

  if (file && !isUploaded) {
    return (
      <PreviewView 
        file={file} 
        onUploadComplete={() => setIsUploaded(true)} 
        onCancel={() => setFile(null)} 
      />
    );
  }

  return <UploadView onFileUpload={setFile} />;
}
