import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Support large payloads for canvas strokes and base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Notebook data directory
const DATA_DIR = path.resolve(__dirname, 'data', 'notebooks');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize Gemini if key exists
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (err) {
    console.warn('Gemini client initialization skipped:', err);
  }
}

// Helper to get notebook folder
function getNotebookDir(id: string): string {
  const dir = path.join(DATA_DIR, id);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const pagesDir = path.join(dir, 'pages');
  if (!fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }
  const imagesDir = path.join(dir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  return dir;
}

// Initial seed notebooks if empty
function initializeSampleNotebooks() {
  const notebooks = fs.readdirSync(DATA_DIR).filter(item => {
    return fs.statSync(path.join(DATA_DIR, item)).isDirectory();
  });

  if (notebooks.length === 0) {
    console.log('Seeding initial sample Schulhefte...');
    
    // 1. Mathe Heft
    const matheId = 'nb-mathe-sample';
    const matheDir = getNotebookDir(matheId);
    const matheMeta = {
      id: matheId,
      title: 'Mathematik & Geometrie',
      subject: 'Mathematik',
      classLevel: 'Klasse 8b',
      coverColor: '#1e40af', // Blau
      coverPattern: 'standard',
      ruling: 'kariert',
      pageIds: ['p1', 'p2'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(matheDir, 'notebook.json'), JSON.stringify(matheMeta, null, 2));

    const mathePage1 = {
      id: 'p1',
      notebookId: matheId,
      pageNumber: 1,
      ruling: 'kariert',
      strokes: [
        {
          id: 's1',
          tool: 'pen',
          color: '#1e40af',
          size: 3,
          points: [
            { x: 120, y: 160 }, { x: 260, y: 160 }
          ],
          isStraight: true,
        },
        {
          id: 's2',
          tool: 'pen',
          color: '#1e40af',
          size: 3,
          points: [
            { x: 120, y: 160 }, { x: 190, y: 90 }, { x: 260, y: 160 }
          ],
          isStraight: false,
        },
        {
          id: 's3',
          tool: 'highlighter',
          color: '#facc15',
          size: 24,
          opacity: 0.5,
          points: [
            { x: 100, y: 220 }, { x: 380, y: 220 }
          ],
        }
      ],
      textboxes: [
        {
          id: 't1',
          x: 100,
          y: 60,
          width: 380,
          height: 50,
          text: 'Thema: Dreieckskonstruktion & Satz des Pythagoras',
          fontSize: 18,
          color: '#0f172a',
          fontFamily: 'sans'
        },
        {
          id: 't2',
          x: 100,
          y: 205,
          width: 320,
          height: 40,
          text: 'a² + b² = c²  (Rechtwinkliges Dreieck)',
          fontSize: 16,
          color: '#1e3a8a',
          fontFamily: 'handwriting'
        },
        {
          id: 't3',
          x: 100,
          y: 280,
          width: 440,
          height: 90,
          text: 'Tipp: Benutze das virtuelle Geodreieck aus dem oberen Menü,\num exakte 90°-Winkel und Parallelen abzutragen!',
          fontSize: 14,
          color: '#334155',
          fontFamily: 'sans'
        }
      ],
      images: [],
      ocrText: 'Mathematik & Geometrie Thema: Dreieckskonstruktion Satz des Pythagoras a² + b² = c² Geodreieck',
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(matheDir, 'pages', 'p1.json'), JSON.stringify(mathePage1, null, 2));

    const mathePage2 = {
      id: 'p2',
      notebookId: matheId,
      pageNumber: 2,
      ruling: 'kariert',
      strokes: [],
      textboxes: [
        {
          id: 't2_1',
          x: 100,
          y: 60,
          width: 300,
          height: 40,
          text: 'Übungsaufgaben S. 42 / Nr. 3-6',
          fontSize: 18,
          color: '#1e293b',
          fontFamily: 'sans'
        }
      ],
      images: [],
      ocrText: 'Übungsaufgaben Seite 42',
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(matheDir, 'pages', 'p2.json'), JSON.stringify(mathePage2, null, 2));

    // 2. Deutsch Heft (Liniert)
    const deutschId = 'nb-deutsch-sample';
    const deutschDir = getNotebookDir(deutschId);
    const deutschMeta = {
      id: deutschId,
      title: 'Deutsch Aufsätze & Gedichte',
      subject: 'Deutsch',
      classLevel: 'Klasse 8b',
      coverColor: '#b91c1c', // Rot
      coverPattern: 'vintage',
      ruling: 'liniert_rand',
      pageIds: ['dp1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(deutschDir, 'notebook.json'), JSON.stringify(deutschMeta, null, 2));

    const deutschPage1 = {
      id: 'dp1',
      notebookId: deutschId,
      pageNumber: 1,
      ruling: 'liniert_rand',
      strokes: [
        {
          id: 'ds1',
          tool: 'highlighter',
          color: '#4ade80',
          size: 20,
          opacity: 0.5,
          points: [{ x: 120, y: 70 }, { x: 340, y: 70 }],
        }
      ],
      textboxes: [
        {
          id: 'dt1',
          x: 120,
          y: 55,
          width: 360,
          height: 45,
          text: 'Gedichtanalyse: Der Erlkönig (Goethe)',
          fontSize: 18,
          color: '#1e293b',
          fontFamily: 'sans'
        },
        {
          id: 'dt2',
          x: 120,
          y: 120,
          width: 480,
          height: 120,
          text: 'Wer reitet so spät durch Nacht und Wind?\nEs ist der Vater mit seinem Kind;\nEr hat den Knaben wohl in dem Arm,\nEr fasst ihn sicher, er hält ihn warm.',
          fontSize: 16,
          color: '#0f172a',
          fontFamily: 'handwriting'
        }
      ],
      images: [],
      ocrText: 'Gedichtanalyse Der Erlkönig Johann Wolfgang von Goethe Wer reitet so spät durch Nacht und Wind Vater Kind',
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(deutschDir, 'pages', 'dp1.json'), JSON.stringify(deutschPage1, null, 2));

    // 3. Biologie Heft (Punkteraster)
    const bioId = 'nb-bio-sample';
    const bioDir = getNotebookDir(bioId);
    const bioMeta = {
      id: bioId,
      title: 'Biologie & Naturkunde',
      subject: 'Biologie',
      classLevel: 'Klasse 8b',
      coverColor: '#047857', // Grün
      coverPattern: 'standard',
      ruling: 'punkte',
      pageIds: ['bp1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(bioDir, 'notebook.json'), JSON.stringify(bioMeta, null, 2));

    const bioPage1 = {
      id: 'bp1',
      notebookId: bioId,
      pageNumber: 1,
      ruling: 'punkte',
      strokes: [],
      textboxes: [
        {
          id: 'bt1',
          x: 100,
          y: 60,
          width: 340,
          height: 40,
          text: 'Pflanzenzelle & Photosynthese',
          fontSize: 18,
          color: '#064e3b',
          fontFamily: 'sans'
        },
        {
          id: 'bt2',
          x: 100,
          y: 120,
          width: 460,
          height: 80,
          text: '6 CO₂ + 6 H₂O + Lichtenergie ➔ C₆H₁₂O₆ + 6 O₂\nDie Chloroplasten sind die Kraftwerke der Pflanzenzelle.',
          fontSize: 15,
          color: '#134e4a',
          fontFamily: 'handwriting'
        }
      ],
      images: [],
      ocrText: 'Pflanzenzelle Photosynthese Chloroplasten Lichtenergie Sauerstoff Glukose',
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(bioDir, 'pages', 'bp1.json'), JSON.stringify(bioPage1, null, 2));
  }
}

initializeSampleNotebooks();

// API ROUTES

// List all notebooks
app.get('/api/notebooks', (req: Request, res: Response) => {
  try {
    const notebookIds = fs.readdirSync(DATA_DIR).filter(item => {
      return fs.statSync(path.join(DATA_DIR, item)).isDirectory();
    });

    const notebooks = [];
    for (const id of notebookIds) {
      const metaPath = path.join(DATA_DIR, id, 'notebook.json');
      if (fs.existsSync(metaPath)) {
        try {
          const raw = fs.readFileSync(metaPath, 'utf8');
          const data = JSON.parse(raw);
          notebooks.push(data);
        } catch {
          // Ignore corrupt file
        }
      }
    }

    // Sort by updatedAt descending
    notebooks.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    res.json(notebooks);
  } catch (error) {
    console.error('Error listing notebooks:', error);
    res.status(500).json({ error: 'Failed to list notebooks' });
  }
});

// Create notebook
app.post('/api/notebooks', (req: Request, res: Response) => {
  try {
    const { title, subject, classLevel, coverColor, coverPattern, ruling } = req.body;
    const id = 'nb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const dir = getNotebookDir(id);

    const initialPageId = 'p1';
    const newNotebook = {
      id,
      title: title || 'Neues Schulheft',
      subject: subject || 'Allgemein',
      classLevel: classLevel || '',
      coverColor: coverColor || '#1e40af',
      coverPattern: coverPattern || 'standard',
      ruling: ruling || 'kariert',
      pageIds: [initialPageId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(dir, 'notebook.json'), JSON.stringify(newNotebook, null, 2));

    // Create page 1
    const initialPage = {
      id: initialPageId,
      notebookId: id,
      pageNumber: 1,
      ruling: ruling || 'kariert',
      strokes: [],
      textboxes: [],
      images: [],
      ocrText: '',
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dir, 'pages', `${initialPageId}.json`), JSON.stringify(initialPage, null, 2));

    res.status(201).json(newNotebook);
  } catch (error) {
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
});

// Get single notebook
app.get('/api/notebooks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metaPath = path.join(DATA_DIR, id, 'notebook.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading notebook:', error);
    res.status(500).json({ error: 'Failed to read notebook' });
  }
});

// Update notebook metadata
app.put('/api/notebooks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const metaPath = path.join(DATA_DIR, id, 'notebook.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    const existing = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const updated = {
      ...existing,
      ...req.body,
      id, // Preserve id
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(metaPath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch (error) {
    console.error('Error updating notebook:', error);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
});

// Delete notebook
app.delete('/api/notebooks/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notebookDir = path.join(DATA_DIR, id);
    if (fs.existsSync(notebookDir)) {
      fs.rmSync(notebookDir, { recursive: true, force: true });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

// Get page
app.get('/api/notebooks/:id/pages/:pageId', (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const pagePath = path.join(DATA_DIR, id, 'pages', `${pageId}.json`);
    if (!fs.existsSync(pagePath)) {
      return res.status(404).json({ error: 'Page not found' });
    }
    const data = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading page:', error);
    res.status(500).json({ error: 'Failed to read page' });
  }
});

// Save page content
app.put('/api/notebooks/:id/pages/:pageId', (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const dir = getNotebookDir(id);
    const pagePath = path.join(dir, 'pages', `${pageId}.json`);

    const pageData = {
      ...req.body,
      id: pageId,
      notebookId: id,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(pagePath, JSON.stringify(pageData, null, 2));

    // Also update notebook updatedAt
    const metaPath = path.join(dir, 'notebook.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      meta.updatedAt = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    }

    res.json(pageData);
  } catch (error) {
    console.error('Error saving page:', error);
    res.status(500).json({ error: 'Failed to save page' });
  }
});

// Add new page to notebook
app.post('/api/notebooks/:id/pages', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ruling } = req.body;
    const dir = getNotebookDir(id);
    const metaPath = path.join(dir, 'notebook.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const newPageNumber = (meta.pageIds?.length || 0) + 1;
    const newPageId = 'p' + Date.now().toString(36);

    const newPage = {
      id: newPageId,
      notebookId: id,
      pageNumber: newPageNumber,
      ruling: ruling || meta.ruling || 'kariert',
      strokes: [],
      textboxes: [],
      images: [],
      ocrText: '',
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(dir, 'pages', `${newPageId}.json`), JSON.stringify(newPage, null, 2));

    meta.pageIds = [...(meta.pageIds || []), newPageId];
    meta.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    res.status(201).json({ page: newPage, notebook: meta });
  } catch (error) {
    console.error('Error adding page:', error);
    res.status(500).json({ error: 'Failed to add page' });
  }
});

// Delete a page
app.delete('/api/notebooks/:id/pages/:pageId', (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const dir = getNotebookDir(id);
    const metaPath = path.join(dir, 'notebook.json');
    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.pageIds.length <= 1) {
      return res.status(400).json({ error: 'Ein Schulheft muss mindestens eine Seite behalten.' });
    }

    meta.pageIds = meta.pageIds.filter((pid: string) => pid !== pageId);
    meta.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    const pagePath = path.join(dir, 'pages', `${pageId}.json`);
    if (fs.existsSync(pagePath)) {
      fs.unlinkSync(pagePath);
    }

    res.json({ success: true, notebook: meta });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// Upload image into notebook folder
app.post('/api/notebooks/:id/upload', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const dir = getNotebookDir(id);
    const cleanName = (filename || 'img_' + Date.now() + '.png').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const imagePath = path.join(dir, 'images', cleanName);

    // Extract base64 part
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(imageBase64, 'base64');

    fs.writeFileSync(imagePath, buffer);
    const url = `/api/notebooks/${id}/images/${cleanName}`;
    res.json({ url, filename: cleanName });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Serve image from notebook folder
app.get('/api/notebooks/:id/images/:filename', (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const filePath = path.join(DATA_DIR, id, 'images', filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Image not found');
  }
});

// OCR full-text extraction for handwriting & images
app.post('/api/notebooks/:id/pages/:pageId/ocr', async (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const { pageImageBase64 } = req.body;
    const dir = getNotebookDir(id);
    const pagePath = path.join(dir, 'pages', `${pageId}.json`);

    let existingPageData: any = {};
    if (fs.existsSync(pagePath)) {
      existingPageData = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
    }

    // Collect all existing textboxes text
    const textboxesText = (existingPageData.textboxes || [])
      .map((t: any) => t.text || '')
      .join(' ');

    let recognizedText = textboxesText;

    if (pageImageBase64 && aiClient) {
      try {
        const base64Data = pageImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Erkenne und transkribiere allen Text, alle mathematischen Formeln, handschriftlichen Notizen und Diagrammbeschriftungen auf dieser Schulheftseite. Gib nur den erkannten deutschen/mathematischen Text stichpunktartig zurück für eine Volltextsuche.'
                },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: base64Data,
                  }
                }
              ]
            }
          ]
        });

        const ocrResult = response.text || '';
        recognizedText = `${textboxesText}\n${ocrResult}`.trim();
      } catch (geminiErr) {
        console.warn('Gemini OCR failed or quota exceeded:', geminiErr);
        // Fallback: keep existing text
      }
    }

    // Update page
    existingPageData.ocrText = recognizedText;
    fs.writeFileSync(pagePath, JSON.stringify(existingPageData, null, 2));

    // Update notebook fulltext index cache
    const cachePath = path.join(dir, 'ocr_cache.json');
    let cache: Record<string, string> = {};
    if (fs.existsSync(cachePath)) {
      try {
        cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      } catch {}
    }
    cache[pageId] = recognizedText;
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

    res.json({ success: true, ocrText: recognizedText });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

// Full-text search across all notebooks
app.get('/api/search', (req: Request, res: Response) => {
  try {
    const query = ((req.query.q as string) || '').trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }

    const notebookIds = fs.readdirSync(DATA_DIR).filter(item => {
      return fs.statSync(path.join(DATA_DIR, item)).isDirectory();
    });

    const results = [];

    for (const id of notebookIds) {
      const metaPath = path.join(DATA_DIR, id, 'notebook.json');
      if (!fs.existsSync(metaPath)) continue;

      let meta: any = {};
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        continue;
      }

      const titleMatch = (meta.title || '').toLowerCase().includes(query);
      const subjectMatch = (meta.subject || '').toLowerCase().includes(query);

      // Check pages
      const pagesDir = path.join(DATA_DIR, id, 'pages');
      if (fs.existsSync(pagesDir)) {
        const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        for (const pf of pageFiles) {
          try {
            const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, pf), 'utf8'));
            const tbText = (pageData.textboxes || []).map((t: any) => t.text || '').join(' ');
            const ocr = pageData.ocrText || '';
            const allText = `${tbText} ${ocr}`.toLowerCase();

            if (allText.includes(query) || titleMatch || subjectMatch) {
              // Extract snippet
              const idx = allText.indexOf(query);
              const start = Math.max(0, idx - 40);
              const snippet = allText.length > 0 
                ? '...' + allText.substring(start, start + 100) + '...'
                : meta.title;

              results.push({
                notebookId: id,
                notebookTitle: meta.title,
                subject: meta.subject,
                coverColor: meta.coverColor,
                pageId: pageData.id,
                pageNumber: pageData.pageNumber || 1,
                snippet,
              });
            }
          } catch {}
        }
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Full backup export (JSON)
app.get('/api/sync/backup', (req: Request, res: Response) => {
  try {
    const backup: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      notebooks: []
    };

    const notebookIds = fs.readdirSync(DATA_DIR).filter(item => {
      return fs.statSync(path.join(DATA_DIR, item)).isDirectory();
    });

    for (const id of notebookIds) {
      const dir = path.join(DATA_DIR, id);
      const metaPath = path.join(dir, 'notebook.json');
      if (!fs.existsSync(metaPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const pages: any[] = [];
      const pagesDir = path.join(dir, 'pages');
      if (fs.existsSync(pagesDir)) {
        const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        for (const pf of pageFiles) {
          try {
            pages.push(JSON.parse(fs.readFileSync(path.join(pagesDir, pf), 'utf8')));
          } catch {}
        }
      }

      // Collect all images in this notebook's folder
      const images: Array<{ filename: string; base64: string }> = [];
      const imagesDir = path.join(dir, 'images');
      if (fs.existsSync(imagesDir)) {
        const imageFiles = fs.readdirSync(imagesDir);
        for (const imgFile of imageFiles) {
          try {
            const imgBuffer = fs.readFileSync(path.join(imagesDir, imgFile));
            images.push({
              filename: imgFile,
              base64: imgBuffer.toString('base64'),
            });
          } catch (err) {
            console.warn('Could not read image for backup:', imgFile, err);
          }
        }
      }

      backup.notebooks.push({
        metadata: meta,
        pages,
        images,
      });
    }

    res.setHeader('Content-Disposition', 'attachment; filename="schulhefte_backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
});

// Restore / import backup (restoring metadata, pages, and images)
app.post('/api/sync/restore', (req: Request, res: Response) => {
  try {
    const { backup } = req.body;
    if (!backup || !Array.isArray(backup.notebooks)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    for (const nb of backup.notebooks) {
      const id = nb.metadata.id || 'nb-' + Date.now();
      const dir = getNotebookDir(id);
      fs.writeFileSync(path.join(dir, 'notebook.json'), JSON.stringify(nb.metadata, null, 2));

      if (Array.isArray(nb.pages)) {
        for (const p of nb.pages) {
          fs.writeFileSync(path.join(dir, 'pages', `${p.id}.json`), JSON.stringify(p, null, 2));
        }
      }

      // Restore images if present in backup
      if (Array.isArray(nb.images)) {
        const imagesDir = path.join(dir, 'images');
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        for (const img of nb.images) {
          try {
            if (img.filename && img.base64) {
              const buffer = Buffer.from(img.base64, 'base64');
              fs.writeFileSync(path.join(imagesDir, img.filename), buffer);
            }
          } catch (err) {
            console.warn('Could not restore image:', img.filename, err);
          }
        }
      }
    }

    res.json({ success: true, count: backup.notebooks.length });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ error: 'Restore failed' });
  }
});

// VITE MIDDLEWARE / STATIC ASSETS
async function setupVite() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Schulheft Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch(err => {
  console.error('Failed to start server:', err);
});
