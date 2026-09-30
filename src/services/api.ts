import { Notebook, Page, SearchResult } from '../types/notebook';

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
        headers: { 'Content-Type': 'application/json' },
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
  // Fetch all notebooks
  async getNotebooks(): Promise<Notebook[]> {
    try {
      const res = await fetch('/api/notebooks');
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('Network offline, using local cached notebooks:', err);
    }

    // Offline fallback
    const local = localStorage.getItem(STORAGE_KEY_NOTEBOOKS);
    return local ? JSON.parse(local) : [];
  },

  // Create notebook
  async createNotebook(data: Partial<Notebook>): Promise<Notebook> {
    try {
      const res = await fetch('/api/notebooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        // Update local cache
        const local = await this.getNotebooks();
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify([created, ...local]));
        return created;
      }
    } catch (err) {
      console.warn('Offline create notebook:', err);
    }

    // Offline generation
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

  // Get single notebook
  async getNotebook(id: string): Promise<Notebook | null> {
    try {
      const res = await fetch(`/api/notebooks/${id}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network offline, using local notebook:', err);
    }

    const list = await this.getNotebooks();
    return list.find(n => n.id === id) || null;
  },

  // Update notebook
  async updateNotebook(id: string, updates: Partial<Notebook>): Promise<Notebook> {
    try {
      const res = await fetch(`/api/notebooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // Delete notebook
  async deleteNotebook(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
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

  // Get Page
  async getPage(notebookId: string, pageId: string): Promise<Page | null> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}`);
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

  // Save Page
  async savePage(notebookId: string, page: Page): Promise<Page> {
    // Immediate save to localStorage
    localStorage.setItem(STORAGE_KEY_PAGES + notebookId + '_' + page.id, JSON.stringify(page));

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  // Add Page
  async addPage(notebookId: string, ruling?: string): Promise<{ page: Page; notebook: Notebook }> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Delete Page
  async deletePage(notebookId: string, pageId: string): Promise<Notebook> {
    // Remove from local storage cache
    localStorage.removeItem(STORAGE_KEY_PAGES + notebookId + '_' + pageId);

    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        // Update cached notebook
        const nb = data.notebook;
        const list = await this.getNotebooks();
        const updatedList = list.map(item => item.id === notebookId ? nb : item);
        localStorage.setItem(STORAGE_KEY_NOTEBOOKS, JSON.stringify(updatedList));
        return nb;
      }
    } catch (err) {
      console.warn('Offline deletePage fallback:', err);
    }

    // Local offline delete fallback
    const nb = await this.getNotebook(notebookId);
    if (nb) {
      nb.pageIds = nb.pageIds.filter(pid => pid !== pageId);
      nb.updatedAt = new Date().toISOString();
      await this.updateNotebook(notebookId, nb);
      return nb;
    }
    throw new Error('Fehler beim Löschen der Seite');
  },

  // Upload image
  async uploadImage(notebookId: string, imageBase64: string, filename?: string): Promise<{ url: string; filename: string }> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, filename }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Upload image network failed, using data URI locally:', err);
    }

    // Offline: use base64 data directly
    return { url: imageBase64, filename: filename || 'offline_img.png' };
  },

  // Trigger OCR
  async triggerOCR(notebookId: string, pageId: string, pageImageBase64: string): Promise<string> {
    try {
      const res = await fetch(`/api/notebooks/${notebookId}/pages/${pageId}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Full-text search
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Search request offline, performing local search:', err);
    }

    // Local search fallback
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

  // Cloud / JSON Backup download
  async downloadBackup(): Promise<void> {
    window.location.href = '/api/sync/backup';
  },

  // Cloud / JSON Backup restore
  async restoreBackup(backupData: any): Promise<number> {
    const res = await fetch('/api/sync/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup: backupData }),
    });
    if (!res.ok) {
      throw new Error('Wiederherstellung fehlgeschlagen');
    }
    const data = await res.json();
    return data.count;
  },
};
