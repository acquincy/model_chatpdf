import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import FormData from 'form-data';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables, falling back to .env.example if needed
dotenv.config();
dotenv.config({ path: '.env.example' });

// Use memory storage for multer
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API route to proxy webhook to n8n
  app.post('/api/webhook', upload.single('file'), async (req, res) => {
    try {
      // The webhook URL should be set in the environment
      const webhookUrl = process.env.VITE_N8N_WEBHOOK_URL;
      
      if (!webhookUrl) {
        return res.status(500).json({ error: 'VITE_N8N_WEBHOOK_URL is not configured' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append('filename', req.body.filename || req.file.originalname);
      formData.append('timestamp', req.body.timestamp || new Date().toISOString());

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData as any,
        // FormData from 'form-data' package sets its own headers
        headers: formData.getHeaders(),
      });

      if (!response.ok) {
        console.error(`n8n webhook failed with status: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ error: `n8n webhook failed: ${response.statusText}` });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error proxying to n8n webhook:', error);
      res.status(500).json({ error: 'Failed to trigger n8n webhook' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
