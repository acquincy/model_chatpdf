/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UploadView } from './components/UploadView';
import { ChatView } from './components/ChatView';

export default function App() {
  const [file, setFile] = useState<File | null>(null);

  if (file) {
    return <ChatView file={file} onBack={() => setFile(null)} />;
  }

  return <UploadView onFileUpload={setFile} />;
}
