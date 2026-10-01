import { Notebook, Page, SearchResult, User } from '../types/notebook';

const STORAGE_KEY_TOKEN = 'schulheft_auth_token';
const STORAGE_KEY_USER = 'schulheft_auth_user';
const STORAGE_KEY_NOTEBOOKS = 'schulheft_offline_notebooks';
const STORAGE_KEY_PAGES = 'schulheft_offline_pages_';
const STORAGE_KEY_QUEUE = 'schulheft_sync_queue';

interface SyncTask {
  type: 'save_page' | 'save_notebook' | 'create_notebook' | 'delete_notebook' | 'add_page';
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: User) {
  localStorage.setItem(STORAGE_KEY_TOKEN, token);
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_USER);
  localStorage.removeItem(STORAGE_KEY_NOTEBOOKS);
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Queue sync helper
function enqueueSync(task: SyncTask) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
    const queue: SyncTask[] = raw ? JSON.parse(raw) : [];
    queue.push(task);
    localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to enqueue sync task:', err);
  }
}

export async function processSyncQueue(): Promise<number> {
  const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
  if (!raw) return 0;
  let queue: SyncTask[] = [];
  try {
    queue = JSON.parse(raw);
  } catch {
    return 0;
  }

  if (queue.length === 0) return 0;

  const remaining: SyncTask[] = [];
  let processedCount = 0;

  for (const task of queue) {
    try {
      const res = await fetch(task.url, {
        method: task.method,
        headers: authHeaders(),
        body: JSON.stringify(task.body),
      });
      if (res.ok) {
        processedCount++;
      } else {
        remaining.push(task);
      }
    } catch {
      remaining.push(task);
    }
  }

  localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));
  return processedCount;
}

export const api = {
  // ================= AUTH =================
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Anmeldung fehlgeschlagen');
    }

    const data = await res.json();
    setAuthSession(data.token, data.user);
    return data;
  },

  async getMe(): Promise<User | null> {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
        return data.user;
      }
      if (res.status === 401) {
        clearAuthSession();
        return null;
      }
    } catch (err) {
      console.warn('getMe network check failed, using stored user:', err);
    }
    return getStoredUser();
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(),
      });
    } catch {}
    clearAuthSession();
  },

  // ================= USER MANAGEMENT (ADMIN ONLY) =================
  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users', {
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fehler beim Laden der Benutzerliste');
    }
    return await res.json();
  },

  async createUser(data: { username: string; displayName?: string; password: string; role?: 'admin' | 'user' }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fehler beim Erstellen des Benutzers');
    }
    return await res.json();
  },

  async updateUser(id: string, updates: { displayName?: string; password?: string; role?: 'admin' | 'user' }): Promise<User> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fehler beim Aktualisieren des Benutzers');
    }
    return await res.json();
  },

  async deleteUser(id: string): Promise<boolean> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Fehler beim Löschen des Benutzers');
    }
    return true;
  },

  // ================= NOTEBOOKS =================
  async getNotebooks(targetUser?: string): Promise<Notebook[]> {
    try {
      const url = targetUser ? `/api/notebooks?user=${encodeURIComponent(targetUser)}` : '/api/notebooks';
      const res = await fetch(url, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (!targetUser) {
          localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(data));
        }
        return data;
      }
    } catch (err) {
      console.warn('Network offline, using local cached notebooks:', err);
    }

    const local = localStorage.getItem(STORAGE_KEY_NOTEBOOKS);
    return local ? JSON.parse(local) : [];
  },

  async createNotebook(data: Partial<Notebook>, targetUser?: string): Promise<Notebook> {
    try {
      const url = targetUser ? `/api/notebooks?user=${encodeURIComponent(targetUser)}` : '/api/notebooks';
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        const local = await this.getNotebooks();
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify([created, ...local]));
        return created;
      }
    } catch (err) {
      console.warn('Offline create notebook:', err);
    }

    // Offline fallback
    const id = 'nb-off-' + Date.now();
    const created: Notebook = {
      id,
      title: data.title || 'Neues Schulheft',
      subject: data.subject || 'Allgemein',
      classLevel: data.classLevel || '',
      coverColor: data.coverColor || '#1e40af',
      coverPattern: data.coverPattern || 'standard',
      ruling: data.ruling || 'kariert',
      pageIds: ['p1'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialPage: Page = {
      id: 'p1',
      notebookId: id,
      pageNumber: 1,
      ruling: data.ruling || 'kariert',
      strokes: [],
      textboxes: [],
      images: [],
      ocrText: '',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_PAGES + id + '_p1', JSON.stringify(initialPage));
    const list = await this.getNotebooks();
    localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify([created, ...list]));

    enqueueSync({
      type: 'create_notebook',
      url: '/api/notebooks',
      method: 'POST',
      body: data,
      timestamp: Date.now(),
    });

    return created;
  },

  async getNotebook(id: string): Promise<Notebook | null> {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network offline, using local notebook:', err);
    }

    const list = await this.getNotebooks();
    return list.find(n => n.id === id) || null;
  },

  async updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Offline update notebook:', err);
    }

    const list = await this.getNotebooks();
    const idx = list.findIndex(n => n.id === id);
    let updated: Notebook;
    if (idx >= 0) {
      updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      list[idx] = updated;
      localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(list));
    } else {
      updated = updates as Notebook;
    }

    enqueueSync({
      type: 'save_notebook',
      url: `/api/notebooks/${id}`,
      method: 'PUT',
      body: updates,
      timestamp: Date.now(),
    });

    return updated;
  },

  async deleteNotebook(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        const list = await this.getNotebooks();
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(list.filter(n => n.id !== id)));
        return true;
      }
    } catch (err) {
      console.warn('Offline delete notebook:', err);
    }

    const list = await this.getNotebooks();
    localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(list.filter(n => n.id !== id)));

    enqueueSync({
      type: 'delete_notebook',
      url: `/api/notebooks/${id}`,
      method: 'DELETE',
      body: {},
      timestamp: Date.now(),
    });

    return true;
  },

  // ================= PAGES =================
  async getPage(notebookId: string, pageId: string): Promise<Page | null> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const page = await res.json();
        localStorage.setItem(STORAGE_KEY_PAGES + notebookId + '_' + pageId, JSON.stringify(page));
        return page;
      }
    } catch (err) {
      console.warn('Offline getPage:', err);
    }

    const local = localStorage.getItem(STORAGE_KEY_PAGES + notebookId + '_' + pageId);
    return local ? JSON.parse(local) : null;
  },

  async savePage(notebookId: string, page: Page): Promise<Page> {
    localStorage.setItem(STORAGE_KEY_PAGES + notebookId + '_' + page.id, JSON.stringify(page));

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${page.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(page),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Offline savePage:', err);
    }

    enqueueSync({
      type: 'save_page',
      url: `/api/notebooks/${notebookId}/pages/${page.id}`,
      method: 'PUT',
      body: page,
      timestamp: Date.now(),
    });

    return page;
  },

  async addPage(notebookId: string, ruling?: string): Promise<{ page: Page; notebook: Notebook }> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ ruling }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Offline addPage:', err);
    }

    const nb = await this.getNotebook(notebookId);
    const newPageId = 'p' + Date.now().toString(36);
    const newPage: Page = {
      id: newPageId,
      notebookId,
      pageNumber: (nb?.pageIds?.length || 0) + 1,
      ruling: (ruling as any) || nb?.ruling || 'kariert',
      strokes: [],
      textboxes: [],
      images: [],
      ocrText: '',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY_PAGES + notebookId + '_' + newPageId, JSON.stringify(newPage));

    if (nb) {
      nb.pageIds.push(newPageId);
      nb.updatedAt = new Date().toISOString();
      await this.updateNotebook(notebookId, nb);
    }

    return { page: newPage, notebook: nb! };
  },

  async deletePage(notebookId: string, pageId: string): Promise<Notebook> {
    localStorage.removeItem(STORAGE_KEY_PAGES + notebookId + '_' + pageId);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const nb = data.notebook;
        const list = await this.getNotebooks();
        const updatedList = list.map(item => item.id === notebookId ? nb : item);
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(updatedList));
        return nb;
      }
    } catch (err) {
      console.warn('Offline deletePage fallback:', err);
    }

    const nb = await this.getNotebook(notebookId);
    if (nb) {
      nb.pageIds = nb.pageIds.filter(pid => pid !== pageId);
      nb.updatedAt = new Date().toISOString();
      await this.updateNotebook(notebookId, nb);
      return nb;
    }
    throw new Error('Fehler beim Löschen der Seite');
  },

  // ================= IMAGES & OCR =================
  async uploadImage(notebookId: string, imageBase64: string, filename?: string): Promise<{ url: string; filename: string }> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ imageBase64, filename }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Upload image network failed, using data URI locally:', err);
    }

    return { url: imageBase64, filename: filename || 'offline_img.png' };
  },

  async triggerOCR(notebookId: string, pageId: string, pageImageBase64: string): Promise<string> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}/ocr`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ pageImageBase64 }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.ocrText;
      }
    } catch (err) {
      console.warn('OCR request error:', err);
    }
    return '';
  },

  // ================= SEARCH =================
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Search request offline, performing local search:', err);
    }

    const list = await this.getNotebooks();
    const q = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const nb of list) {
      if (nb.title.toLowerCase().includes(q) || nb.subject.toLowerCase().includes(q)) {
        results.push({
          notebookId: nb.id,
          notebookTitle: nb.title,
          subject: nb.subject,
          coverColor: nb.coverColor,
          pageId: nb.pageIds[0] || 'p1',
          pageNumber: 1,
          snippet: nb.title + ' (' + nb.subject + ')',
        });
      }
    }
    return results;
  },

  // ================= BACKUP & SYNC =================
  async downloadBackup(): Promise<void> {
    const token = getAuthToken();
    window.location.href = `/api/sync/backup${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async restoreBackup(backupData: any): Promise<number> {
    const res = await fetch('/api/sync/restore', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ backup: backupData }),
    });
    if (!res.ok) {
      throw new Error('Wiederherstellung fehlgeschlagen');
    }
    const data = await res.json();
    return data.count;
  },
};
