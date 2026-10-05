import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './server/db';
import { normalizeMimeType, cleanBase64Data, extractPdfText, extractDetailsFromDocument } from './server/utils/documentProcessor';

import authRouter from './server/routes/auth';
import subjectsRouter from './server/routes/subjects';
import attendanceRouter from './server/routes/attendance';
import timetableRouter from './server/routes/timetable';
import notesRouter from './server/routes/notes';
import eventsRouter from './server/routes/events';
import settingsRouter from './server/routes/settings';

dotenv.config();

async function startServer() {
  await db.ready();
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '25mb' }));

  // CORS middleware for Vite dev & API clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Syncademic Academic Workspace API',
      version: '1.1.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Sub-routers
  app.use('/api/auth', authRouter);
  app.use('/api/subjects', subjectsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/timetable', timetableRouter);
  app.use('/api/notes', notesRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/settings', settingsRouter);

  // Multimodal Universal Academic Details Extractor (PDF, JPEG, PNG, Text, CSV, Excel)
  app.post('/api/ai/extract-details', async (req, res) => {
    try {
      const { fileBase64, mimeType, rawText, fileName, customKey, targetCategory } = req.body;
      const result = await extractDetailsFromDocument({
        fileBase64,
        mimeType,
        rawText,
        fileName,
        customKey,
        targetCategory: targetCategory || 'all'
      });
      return res.json(result);
    } catch (err: any) {
      console.error('Universal extraction error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to extract details from document'
      });
    }
  });

  // AI Assistance Server Route (Multimodal: supports text + PDF / JPEG / PNG documents)
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { prompt, systemInstruction, customKey, context, fileBase64, mimeType: rawMimeType, fileName } = req.body;

      const apiKey = customKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured. Please set your key in Settings or environment.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      let enrichedInstruction = systemInstruction || 'You are Syncademic AI, a calm, disciplined academic assistant for college students. Provide structured, precise academic answers with clean markdown.';
      
      if (context?.currentSubject) {
        enrichedInstruction += `\nCurrent Subject Context: ${context.currentSubject.name} (${context.currentSubject.code}), Faculty: ${context.currentSubject.faculty}, Attendance: ${context.currentSubject.attendedClasses}/${context.currentSubject.totalClasses}`;
      }

      const parts: any[] = [];

      // Multimodal file processing if attached
      if (fileBase64) {
        const normalizedMime = normalizeMimeType(rawMimeType, fileName);
        const cleanedBase64 = cleanBase64Data(fileBase64);

        if (cleanedBase64) {
          parts.push({
            inlineData: {
              mimeType: normalizedMime,
              data: cleanedBase64
            }
          });

          // If PDF, extract digital text to enrich context
          if (normalizedMime === 'application/pdf') {
            try {
              const pdfBuf = Buffer.from(cleanedBase64, 'base64');
              const pdfText = await extractPdfText(pdfBuf);
              if (pdfText) {
                enrichedInstruction += `\n\n[Digital Text Extracted from Attached PDF ${fileName || 'Document'}]:\n${pdfText.slice(0, 10000)}`;
              }
            } catch (err) {
              console.warn('PDF text extraction error in chat:', err);
            }
          }
        }
      }

      parts.push({ text: prompt || 'Please analyze this document and answer my academic question.' });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        config: {
          systemInstruction: enrichedInstruction,
          temperature: 0.7,
        }
      });

      const text = response.text || '';
      return res.json({ text });
    } catch (err: any) {
      console.error('Gemini API execution error:', err);
      return res.status(500).json({ error: err.message || 'Internal AI service error' });
    }
  });

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
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
    console.log(`Syncademic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
