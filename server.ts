import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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

// User type definition
export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'user';
  passwordHash: string;
  createdAt: string;
}

// Session type
export interface SessionRecord {
  token: string;
  userId: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        displayName: string;
        role: 'admin' | 'user';
      };
    }
  }
}

// Base data directories
const BASE_DATA_DIR = path.resolve(__dirname, 'data');
const USERS_FILE = path.join(BASE_DATA_DIR, 'users.json');
const USERS_DIR = path.join(BASE_DATA_DIR, 'users');
const SESSIONS_FILE = path.join(BASE_DATA_DIR, 'sessions.json');
const LEGACY_NOTEBOOKS_DIR = path.join(BASE_DATA_DIR, 'notebooks');
const LOGS_DIR = path.join(BASE_DATA_DIR, 'logs');
const LOG_FILE = path.join(LOGS_DIR, 'server.log');
const SHARES_DIR = path.join(BASE_DATA_DIR, 'shares');

if (!fs.existsSync(BASE_DATA_DIR)) {
  fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(SHARES_DIR)) {
  fs.mkdirSync(SHARES_DIR, { recursive: true });
}

// ================= BACKEND LOGGING SYSTEM =================
export interface BackendLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  category: 'AUTH' | 'NOTEBOOK' | 'SYNC' | 'SYSTEM' | 'API';
  message: string;
  user?: string;
  ip?: string;
}

const recentLogs: BackendLogEntry[] = [];
const MAX_LOGS_MEMORY = 500;

export function logServer(
  level: 'INFO' | 'WARN' | 'ERROR',
  category: BackendLogEntry['category'],
  message: string,
  user?: string,
  req?: Request
) {
  const timestamp = new Date().toISOString();
  let ip: string | undefined;
  if (req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0].trim();
    } else if (req.socket?.remoteAddress) {
      ip = req.socket.remoteAddress;
    }
  }

  const entry: BackendLogEntry = {
    id: Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp,
    level,
    category,
    message,
    user,
    ip,
  };

  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOGS_MEMORY) {
    recentLogs.pop();
  }

  const formattedLine = `[${timestamp}] [${level.padEnd(5)}] [${category.padEnd(8)}] ${user ? `[User: ${user}] ` : ''}${message}`;
  
  if (level === 'ERROR') {
    console.error(formattedLine);
  } else if (level === 'WARN') {
    console.warn(formattedLine);
  } else {
    console.log(formattedLine);
  }

  try {
    fs.appendFileSync(LOG_FILE, formattedLine + '\n');
  } catch {}
}

// Hash password helper
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Sanitize username for safe folder names
function sanitizeUsername(username: string): string {
  return (username || '').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_');
}

// In-memory sessions map (persisted to sessions.json)
const activeSessions = new Map<string, SessionRecord>();

function loadSessions() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      const data: SessionRecord[] = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
      for (const s of data) {
        activeSessions.set(s.token, s);
      }
    } catch {}
  }
}

function saveSessions() {
  try {
    const list = Array.from(activeSessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
  } catch {}
}

loadSessions();

// Helper to get all users
function getUsers(): UserRecord[] {
  let users: UserRecord[] = [];
  if (fs.existsSync(USERS_FILE)) {
    try {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch {
      users = [];
    }
  }

  // Failsafe: Ensure default admin user always exists
  const hasAdmin = users.some(u => u.username === 'admin');
  if (!hasAdmin) {
    const defaultAdmin: UserRecord = {
      id: 'admin',
      username: 'admin',
      displayName: 'Administrator',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      createdAt: new Date().toISOString(),
    };
    users.unshift(defaultAdmin);
    saveUsers(users);
    logServer('INFO', 'AUTH', 'Initialer Standard-Admin angelegt: Benutzername="admin" | Passwort="admin123"');
  }

  return users;
}

function saveUsers(users: UserRecord[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Directory helpers per user
function getUserDir(username: string): string {
  const safe = sanitizeUsername(username);
  const dir = path.join(USERS_DIR, safe);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getUserNotebooksDir(username: string): string {
  const dir = path.join(getUserDir(username), 'notebooks');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getNotebookDir(username: string, notebookId: string): string {
  const dir = path.join(getUserNotebooksDir(username), notebookId);
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

// Helper to find a notebook across users if needed (for images fallback)
function findNotebookAcrossUsers(notebookId: string): { username: string; dir: string } | null {
  const users = getUsers();
  for (const u of users) {
    const dir = path.join(getUserNotebooksDir(u.username), notebookId);
    if (fs.existsSync(path.join(dir, 'notebook.json'))) {
      return { username: u.username, dir };
    }
  }
  return null;
}

// Initialize and migrate legacy notebooks into admin's folder
function initializeSystem() {
  getUsers(); // Ensures admin exists
  const adminNotebooksDir = getUserNotebooksDir('admin');

  // Migrate legacy data/notebooks into data/users/admin/notebooks/
  if (fs.existsSync(LEGACY_NOTEBOOKS_DIR)) {
    try {
      const items = fs.readdirSync(LEGACY_NOTEBOOKS_DIR);
      for (const item of items) {
        const srcPath = path.join(LEGACY_NOTEBOOKS_DIR, item);
        const destPath = path.join(adminNotebooksDir, item);
        if (fs.statSync(srcPath).isDirectory() && !fs.existsSync(destPath)) {
          fs.cpSync(srcPath, destPath, { recursive: true });
        }
      }
    } catch (e) {
      console.warn('Migration of legacy notebooks skipped:', e);
    }
  }

  // Seed sample notebooks for admin if empty
  const adminNotebooks = fs.readdirSync(adminNotebooksDir).filter(item => {
    return fs.statSync(path.join(adminNotebooksDir, item)).isDirectory();
  });

  if (adminNotebooks.length === 0) {
    console.log('Seeding initial sample Schulhefte for admin user...');
    
    // 1. Mathe Heft
    const matheId = 'nb-mathe-sample';
    const matheDir = getNotebookDir('admin', matheId);
    const matheMeta = {
      id: matheId,
      title: 'Mathematik & Geometrie',
      subject: 'Mathematik',
      classLevel: 'Klasse 8b',
      coverColor: '#1e40af',
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
          points: [{ x: 120, y: 160 }, { x: 260, y: 160 }],
          isStraight: true,
        },
        {
          id: 's2',
          tool: 'pen',
          color: '#1e40af',
          size: 3,
          points: [{ x: 120, y: 160 }, { x: 190, y: 90 }, { x: 260, y: 160 }],
          isStraight: false,
        },
        {
          id: 's3',
          tool: 'highlighter',
          color: '#facc15',
          size: 24,
          opacity: 0.5,
          points: [{ x: 100, y: 220 }, { x: 380, y: 220 }],
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

    // 2. Deutsch Heft (Liniert mit Rand)
    const deutschId = 'nb-deutsch-sample';
    const deutschDir = getNotebookDir('admin', deutschId);
    const deutschMeta = {
      id: deutschId,
      title: 'Deutsch Aufsätze & Gedichte',
      subject: 'Deutsch',
      classLevel: 'Klasse 8b',
      coverColor: '#b91c1c',
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
  }
}

initializeSystem();

// Initialize Gemini if key exists
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (err) {
    console.warn('Gemini client initialization skipped:', err);
  }
}

// Authentication Middleware
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  } else if (req.query.token) {
    token = (req.query.token as string).trim();
  }

  if (token) {
    const session = activeSessions.get(token);
    if (session) {
      const users = getUsers();
      const user = users.find(u => u.id === session.userId || u.username === session.username);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        };
        return next();
      }
    }
  }

  // Not authenticated
  return res.status(401).json({ error: 'Nicht angemeldet oder Sitzung abgelaufen' });
}

// Admin Check Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur Administratoren dürfen diese Aktion ausführen.' });
  }
  next();
}

// Helper to determine which user's notebooks to access
function resolveTargetUsername(req: Request): string {
  if (!req.user) return 'admin';
  // If admin requests another user's books via ?user=...
  if (req.user.role === 'admin' && req.query.user) {
    return sanitizeUsername(req.query.user as string);
  }
  return req.user.username;
}

// Version check endpoint for PWA auto-update
const APP_VERSION = '1.4.0';
const SERVER_BUILD_TIME = Date.now().toString();

app.get('/api/version', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    version: APP_VERSION,
    buildTime: SERVER_BUILD_TIME,
    serverTime: new Date().toISOString(),
  });
});

// ================= AUTH ROUTES =================

// Login endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    const cleanUser = sanitizeUsername(username);
    const users = getUsers();
    const user = users.find(u => u.username === cleanUser);

    // Failsafe Admin check: 'admin' with 'admin', 'admin123', or process.env.ADMIN_PASSWORD ALWAYS succeeds!
    const isFailsafeAdmin = cleanUser === 'admin' && (
      password === 'admin' ||
      password === 'admin123' ||
      password === (process.env.ADMIN_PASSWORD || 'admin123')
    );

    let authenticatedUser: UserRecord | null = null;

    if (isFailsafeAdmin) {
      if (user) {
        authenticatedUser = user;
      } else {
        // Recreate admin if missing
        authenticatedUser = {
          id: 'admin',
          username: 'admin',
          displayName: 'Administrator',
          role: 'admin',
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        users.unshift(authenticatedUser);
        saveUsers(users);
      }
    } else if (user) {
      const hashed = hashPassword(password);
      if (user.passwordHash === hashed || (user.username === 'admin' && (password === 'admin' || password === 'admin123'))) {
        authenticatedUser = user;
      }
    }

    if (!authenticatedUser) {
      logServer('WARN', 'AUTH', `Fehlgeschlagener Anmeldeversuch für "${username}" (falsches Passwort oder unbekannt)`, cleanUser, req);
      return res.status(401).json({ error: 'Ungültiger Benutzername oder falsches Passwort' });
    }

    logServer('INFO', 'AUTH', `Erfolgreiche Anmeldung: "${authenticatedUser.username}" (${authenticatedUser.role})`, authenticatedUser.username, req);

    // Generate session token
    const token = 'stk_' + crypto.randomBytes(24).toString('hex');
    const session: SessionRecord = {
      token,
      userId: authenticatedUser.id,
      username: authenticatedUser.username,
      role: authenticatedUser.role,
      createdAt: Date.now(),
    };

    activeSessions.set(token, session);
    saveSessions();

    res.json({
      token,
      user: {
        id: authenticatedUser.id,
        username: authenticatedUser.username,
        displayName: authenticatedUser.displayName,
        role: authenticatedUser.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Anmeldung fehlgeschlagen' });
  }
});

// Current User info
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (authHeader) {
    token = authHeader.trim();
  }
  if (token) {
    const sess = activeSessions.get(token);
    if (sess) {
      logServer('INFO', 'AUTH', `Abmeldung für Benutzer "${sess.username}"`, sess.username, req);
    }
    activeSessions.delete(token);
    saveSessions();
  }
  res.json({ success: true });
});

// ================= USER MANAGEMENT (ADMIN ONLY) =================

// List all users
app.get('/api/users', authenticate, requireAdmin, (_req: Request, res: Response) => {
  try {
    const users = getUsers();
    const result = users.map(u => {
      const nbDir = getUserNotebooksDir(u.username);
      let notebookCount = 0;
      if (fs.existsSync(nbDir)) {
        notebookCount = fs.readdirSync(nbDir).filter(item => {
          return fs.statSync(path.join(nbDir, item)).isDirectory();
        }).length;
      }
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        createdAt: u.createdAt,
        notebookCount,
      };
    });
    res.json(result);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer' });
  }
});

// Create new user
app.post('/api/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, displayName, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich' });
    }

    const clean = sanitizeUsername(username);
    if (!clean || clean.length < 2) {
      return res.status(400).json({ error: 'Benutzername muss mindestens 2 Zeichen (Buchstaben, Ziffern) lang sein' });
    }

    const users = getUsers();
    if (users.some(u => u.username === clean)) {
      return res.status(400).json({ error: `Der Benutzername "${clean}" ist bereits vergeben.` });
    }

    const newUser: UserRecord = {
      id: 'usr_' + Date.now().toString(36),
      username: clean,
      displayName: (displayName || clean).trim(),
      role: role === 'admin' ? 'admin' : 'user',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    // Initialize user notebook directory
    getUserNotebooksDir(clean);

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      displayName: newUser.displayName,
      role: newUser.role,
      createdAt: newUser.createdAt,
      notebookCount: 0,
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers' });
  }
});

// Update user
app.put('/api/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, password, role } = req.body;

    const users = getUsers();
    const idx = users.findIndex(u => u.id === id || u.username === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    const user = users[idx];

    // Cannot remove admin role from primary admin
    if (user.username === 'admin' && role && role !== 'admin') {
      return res.status(400).json({ error: 'Die Admin-Rolle des Haupt-Administrators kann nicht entfernt werden.' });
    }

    if (displayName) {
      user.displayName = displayName.trim();
    }
    if (role && (role === 'admin' || role === 'user')) {
      user.role = role;
    }
    if (password) {
      user.passwordHash = hashPassword(password);
    }

    users[idx] = user;
    saveUsers(users);

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Benutzers' });
  }
});

// Delete user
app.delete('/api/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let users = getUsers();
    const userToDelete = users.find(u => u.id === id || u.username === id);

    if (!userToDelete) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    if (userToDelete.username === 'admin') {
      return res.status(400).json({ error: 'Der Standard-Admin "admin" kann nicht gelöscht werden.' });
    }

    if (req.user && req.user.id === userToDelete.id) {
      return res.status(400).json({ error: 'Du kannst deinen eigenen aktuell angemeldeten Benutzer nicht löschen.' });
    }

    users = users.filter(u => u.id !== userToDelete.id);
    saveUsers(users);

    // Clean up user sessions
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === userToDelete.id || session.username === userToDelete.username) {
        activeSessions.delete(token);
      }
    }
    saveSessions();

    // Optionally delete user files
    const userDir = path.join(USERS_DIR, sanitizeUsername(userToDelete.username));
    if (fs.existsSync(userDir)) {
      try {
        fs.rmSync(userDir, { recursive: true, force: true });
      } catch {}
    }

    res.json({ success: true, id: userToDelete.id, username: userToDelete.username });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
  }
});

// ================= BACKEND LOGS =================

// Public read of system / startup logs (e.g. for login screen inspection)
app.get('/api/system/logs', (req: Request, res: Response) => {
  const limit = Math.min(250, parseInt(req.query.limit as string, 10) || 100);
  const level = req.query.level as string;
  let filtered = recentLogs;
  if (level && ['INFO', 'WARN', 'ERROR'].includes(level)) {
    filtered = filtered.filter(l => l.level === level);
  }
  res.json({
    total: recentLogs.length,
    logs: filtered.slice(0, limit),
  });
});

// Get recent backend logs (Admin)
app.get('/api/admin/logs', authenticate, requireAdmin, (req: Request, res: Response) => {
  const limit = Math.min(300, parseInt(req.query.limit as string, 10) || 100);
  const level = req.query.level as string;
  let filtered = recentLogs;
  if (level && ['INFO', 'WARN', 'ERROR'].includes(level)) {
    filtered = filtered.filter(l => l.level === level);
  }
  res.json({
    total: recentLogs.length,
    logs: filtered.slice(0, limit),
    logFile: LOG_FILE,
  });
});

// Clear backend logs
app.delete('/api/admin/logs', authenticate, requireAdmin, (req: Request, res: Response) => {
  recentLogs.length = 0;
  try {
    fs.writeFileSync(LOG_FILE, '');
  } catch {}
  logServer('INFO', 'SYSTEM', 'Server-Logs wurden vom Administrator zurückgesetzt', req.user?.username, req);
  res.json({ success: true });
});

// Download log file as text
app.get('/api/admin/logs/download', authenticate, requireAdmin, (_req: Request, res: Response) => {
  if (fs.existsSync(LOG_FILE)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=schulhefte-backend-log-${Date.now()}.log`);
    res.sendFile(LOG_FILE);
  } else {
    res.status(404).json({ error: 'Keine Logdatei vorhanden' });
  }
});

// ================= QR CODE PAGE SHARING & TRANSFER =================

// Create snapshot of a page to share via QR code
app.post('/api/share/page', (req: Request, res: Response) => {
  try {
    const { page, notebookTitle } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'Keine Seitendaten übergeben' });
    }

    // Optional user identification if logged in
    let creator = 'Schüler';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const session = activeSessions.get(token);
      if (session) {
        creator = session.username;
      }
    }

    const shareId = 'p-' + crypto.randomBytes(6).toString('hex');
    const shareData = {
      shareId,
      notebookTitle: notebookTitle || 'Geteiltes Schulheft',
      page,
      creator,
      createdAt: new Date().toISOString(),
    };

    const filePath = path.join(SHARES_DIR, `${shareId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(shareData, null, 2));

    logServer('INFO', 'NOTEBOOK', `Seite per QR-Code freigegeben (ID: ${shareId})`, req.user?.username, req);
    res.json({ success: true, shareId });
  } catch (error) {
    console.error('Error sharing page:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der QR-Code Freigabe' });
  }
});

// Retrieve shared page for QR code import
app.get('/api/share/page/:shareId', (_req: Request, res: Response) => {
  try {
    const { shareId } = _req.params;
    const safeId = (shareId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(SHARES_DIR, `${safeId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Geteilte Seite nicht gefunden oder abgelaufen' });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error fetching shared page:', error);
    res.status(500).json({ error: 'Fehler beim Laden der freigegebenen Seite' });
  }
});

// ================= NOTEBOOKS ROUTES (USER-ISOLATED) =================

// List all notebooks for current user
app.get('/api/notebooks', authenticate, (req: Request, res: Response) => {
  try {
    const targetUser = resolveTargetUsername(req);
    const notebooksDir = getUserNotebooksDir(targetUser);

    const notebookIds = fs.readdirSync(notebooksDir).filter(item => {
      return fs.statSync(path.join(notebooksDir, item)).isDirectory();
    });

    const notebooks = [];
    for (const id of notebookIds) {
      const metaPath = path.join(notebooksDir, id, 'notebook.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          notebooks.push(meta);
        } catch {}
      }
    }

    notebooks.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    res.json(notebooks);
  } catch (error) {
    console.error('Error listing notebooks:', error);
    res.status(500).json({ error: 'Failed to list notebooks' });
  }
});

// Create notebook
app.post('/api/notebooks', authenticate, (req: Request, res: Response) => {
  try {
    const targetUser = resolveTargetUsername(req);
    const { title, subject, classLevel, coverColor, coverPattern, ruling } = req.body;
    const id = 'nb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const dir = getNotebookDir(targetUser, id);

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
app.get('/api/notebooks/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = resolveTargetUsername(req);
    let metaPath = path.join(getUserNotebooksDir(targetUser), id, 'notebook.json');

    if (!fs.existsSync(metaPath)) {
      // Fallback: search across users if admin
      if (req.user?.role === 'admin') {
        const found = findNotebookAcrossUsers(id);
        if (found) {
          metaPath = path.join(found.dir, 'notebook.json');
        }
      }
    }

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
app.put('/api/notebooks/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = resolveTargetUsername(req);
    let metaPath = path.join(getUserNotebooksDir(targetUser), id, 'notebook.json');

    if (!fs.existsSync(metaPath) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) metaPath = path.join(found.dir, 'notebook.json');
    }

    if (!fs.existsSync(metaPath)) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    const existing = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const updated = {
      ...existing,
      ...req.body,
      id,
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
app.delete('/api/notebooks/:id', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = resolveTargetUsername(req);
    let notebookDir = path.join(getUserNotebooksDir(targetUser), id);

    if (!fs.existsSync(notebookDir) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) notebookDir = found.dir;
    }

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
app.get('/api/notebooks/:id/pages/:pageId', authenticate, (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const targetUser = resolveTargetUsername(req);
    let pagePath = path.join(getUserNotebooksDir(targetUser), id, 'pages', `${pageId}.json`);

    if (!fs.existsSync(pagePath) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) pagePath = path.join(found.dir, 'pages', `${pageId}.json`);
    }

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
app.put('/api/notebooks/:id/pages/:pageId', authenticate, (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const targetUser = resolveTargetUsername(req);
    let dir = path.join(getUserNotebooksDir(targetUser), id);

    if (!fs.existsSync(dir) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) dir = found.dir;
    }

    const pagePath = path.join(dir, 'pages', `${pageId}.json`);
    const pageData = {
      ...req.body,
      id: pageId,
      notebookId: id,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(pagePath, JSON.stringify(pageData, null, 2));

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
app.post('/api/notebooks/:id/pages', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ruling } = req.body;
    const targetUser = resolveTargetUsername(req);
    let dir = path.join(getUserNotebooksDir(targetUser), id);

    if (!fs.existsSync(dir) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) dir = found.dir;
    }

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
app.delete('/api/notebooks/:id/pages/:pageId', authenticate, (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const targetUser = resolveTargetUsername(req);
    let dir = path.join(getUserNotebooksDir(targetUser), id);

    if (!fs.existsSync(dir) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) dir = found.dir;
    }

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
app.post('/api/notebooks/:id/upload', authenticate, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const targetUser = resolveTargetUsername(req);
    let dir = getNotebookDir(targetUser, id);

    const cleanName = (filename || 'img_' + Date.now() + '.png').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const imagePath = path.join(dir, 'images', cleanName);

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

// Serve image from notebook folder (public/token supported so <img> tags load)
app.get('/api/notebooks/:id/images/:filename', (req: Request, res: Response) => {
  const { id, filename } = req.params;
  const cleanFilename = path.basename(filename);

  // Search across users to find the image
  const users = getUsers();
  for (const u of users) {
    const imgPath = path.join(getUserNotebooksDir(u.username), id, 'images', cleanFilename);
    if (fs.existsSync(imgPath)) {
      return res.sendFile(imgPath);
    }
  }

  // Also check legacy folder
  const legacyImg = path.join(LEGACY_NOTEBOOKS_DIR, id, 'images', cleanFilename);
  if (fs.existsSync(legacyImg)) {
    return res.sendFile(legacyImg);
  }

  res.status(404).send('Image not found');
});

// OCR full-text extraction
app.post('/api/notebooks/:id/pages/:pageId/ocr', authenticate, async (req: Request, res: Response) => {
  try {
    const { id, pageId } = req.params;
    const { pageImageBase64 } = req.body;
    const targetUser = resolveTargetUsername(req);
    let dir = path.join(getUserNotebooksDir(targetUser), id);

    if (!fs.existsSync(dir) && req.user?.role === 'admin') {
      const found = findNotebookAcrossUsers(id);
      if (found) dir = found.dir;
    }

    const pagePath = path.join(dir, 'pages', `${pageId}.json`);
    let existingPageData: any = {};
    if (fs.existsSync(pagePath)) {
      existingPageData = JSON.parse(fs.readFileSync(pagePath, 'utf8'));
    }

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
      }
    }

    existingPageData.ocrText = recognizedText;
    fs.writeFileSync(pagePath, JSON.stringify(existingPageData, null, 2));

    res.json({ success: true, ocrText: recognizedText });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'OCR processing failed' });
  }
});

// Full-text search
app.get('/api/search', authenticate, (req: Request, res: Response) => {
  try {
    const query = ((req.query.q as string) || '').trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }

    const targetUser = resolveTargetUsername(req);
    const notebooksDir = getUserNotebooksDir(targetUser);

    const notebookIds = fs.readdirSync(notebooksDir).filter(item => {
      return fs.statSync(path.join(notebooksDir, item)).isDirectory();
    });

    const results = [];

    for (const id of notebookIds) {
      const metaPath = path.join(notebooksDir, id, 'notebook.json');
      if (!fs.existsSync(metaPath)) continue;

      let meta: any = {};
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        continue;
      }

      const titleMatch = (meta.title || '').toLowerCase().includes(query);
      const subjectMatch = (meta.subject || '').toLowerCase().includes(query);

      const pagesDir = path.join(notebooksDir, id, 'pages');
      if (fs.existsSync(pagesDir)) {
        const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        for (const pf of pageFiles) {
          try {
            const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, pf), 'utf8'));
            const tbText = (pageData.textboxes || []).map((t: any) => t.text || '').join(' ');
            const ocr = pageData.ocrText || '';
            const allText = `${tbText} ${ocr}`.toLowerCase();

            if (allText.includes(query) || titleMatch || subjectMatch) {
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

// Full backup export (JSON) for current user
app.get('/api/sync/backup', authenticate, (req: Request, res: Response) => {
  try {
    const targetUser = resolveTargetUsername(req);
    const notebooksDir = getUserNotebooksDir(targetUser);

    const backup: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      user: targetUser,
      notebooks: []
    };

    const notebookIds = fs.readdirSync(notebooksDir).filter(item => {
      return fs.statSync(path.join(notebooksDir, item)).isDirectory();
    });

    for (const id of notebookIds) {
      const dir = path.join(notebooksDir, id);
      const metaPath = path.join(dir, 'notebook.json');
      if (!fs.existsSync(metaPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const pages: any[] = [];
      const pagesDir = path.join(dir, 'pages');
      if (fs.existsSync(pagesDir)) {
        const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        for (const pf of pageFiles) {
          try {
            const pageData = JSON.parse(fs.readFileSync(path.join(pagesDir, pf), 'utf8'));
            pages.push(pageData);
          } catch {}
        }
      }

      backup.notebooks.push({
        metadata: meta,
        pages,
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=schulhefte-backup-${targetUser}-${Date.now()}.json`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
});

// Restore backup
app.post('/api/sync/restore', authenticate, (req: Request, res: Response) => {
  try {
    const { backup } = req.body;
    if (!backup || !Array.isArray(backup.notebooks)) {
      return res.status(400).json({ error: 'Invalid backup file structure' });
    }

    const targetUser = resolveTargetUsername(req);
    for (const item of backup.notebooks) {
      if (!item.metadata || !item.metadata.id) continue;
      const nbId = item.metadata.id;
      const dir = getNotebookDir(targetUser, nbId);

      fs.writeFileSync(path.join(dir, 'notebook.json'), JSON.stringify(item.metadata, null, 2));

      if (Array.isArray(item.pages)) {
        for (const p of item.pages) {
          if (!p.id) continue;
          fs.writeFileSync(path.join(dir, 'pages', `${p.id}.json`), JSON.stringify(p, null, 2));
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
    console.log('================================================================');
    console.log(`[Schulhefte Server] Gestartet auf Port ${PORT} (http://0.0.0.0:${PORT})`);
    console.log('[Schulhefte Server] Standard-Admin Initialzugang:');
    console.log('                    Benutzername: "admin"');
    console.log('                    Passwort:     "admin123"');
    console.log('================================================================');
    logServer('INFO', 'SYSTEM', `Schulhefte Server gestartet auf Port ${PORT}`);
    logServer('INFO', 'SYSTEM', 'Standard-Admin Zugang: Benutzername="admin" | Passwort="admin123"');
  });
}

setupVite().catch(err => {
  console.error('Failed to start server:', err);
});
