import { ChatThread } from '../hooks/use-chat-threads';

const DB_NAME = 'FarmChatDB';
const DB_VERSION = 2;
const THREADS_STORE = 'chatThreads';
const SUGGESTED_QUERIES_STORE = 'suggestedQueries';

interface SuggestedQueries {
  id: string; // 'global' for global queries
  queries: string[];
  lastUpdated: string;
  contextHash: string;
}

// (Removed unused DBSchema interface to satisfy linter)

class ChatDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create chat threads object store
        if (!db.objectStoreNames.contains(THREADS_STORE)) {
          const threadsStore = db.createObjectStore(THREADS_STORE, { keyPath: 'id' });
          threadsStore.createIndex('createdAt', 'createdAt', { unique: false });
          threadsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create suggested queries object store
        if (!db.objectStoreNames.contains(SUGGESTED_QUERIES_STORE)) {
          db.createObjectStore(SUGGESTED_QUERIES_STORE, { keyPath: 'id' });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.initPromise) {
      this.initPromise = this.init();
    }
    await this.initPromise;
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async getAllThreads(): Promise<ChatThread[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readonly');
      const store = transaction.objectStore(THREADS_STORE);
      const index = store.index('updatedAt');
      const request = index.getAll();

      request.onsuccess = () => {
        // Sort by updatedAt in descending order (most recent first)
        const threads = request.result.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        resolve(threads);
      };

      request.onerror = () => {
        console.error('Error getting threads:', request.error);
        reject(request.error);
      };
    });
  }

  async getThread(id: string): Promise<ChatThread | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readonly');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Error getting thread:', request.error);
        reject(request.error);
      };
    });
  }

  async saveThread(thread: ChatThread): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readwrite');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.put(thread);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error saving thread:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteThread(id: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readwrite');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('Error deleting thread:', request.error);
        reject(request.error);
      };
    });
  }

  async saveThreads(threads: ChatThread[]): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([THREADS_STORE], 'readwrite');
      const store = transaction.objectStore(THREADS_STORE);
      
      let completed = 0;
      const total = threads.length;

      if (total === 0) {
        resolve();
        return;
      }

      threads.forEach(thread => {
        const request = store.put(thread);
        
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          console.error('Error saving thread:', request.error);
          reject(request.error);
        };
      });
    });
  }

  async clearAllThreads(): Promise<void> {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([THREADS_STORE], 'readwrite');
      const store = transaction.objectStore(THREADS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('Successfully cleared all threads from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('Error clearing threads:', request.error);
        reject(request.error);
      };
    });
  }

  // Migration helper: import threads from localStorage
  async migrateFromLocalStorage(): Promise<void> {
    try {
      const savedThreads = localStorage.getItem('farm-chat-threads');
      if (savedThreads) {
        const parsedThreads: ChatThread[] = JSON.parse(savedThreads);
        if (Array.isArray(parsedThreads) && parsedThreads.length > 0) {
          await this.saveThreads(parsedThreads);
          console.log(`Migrated ${parsedThreads.length} threads from localStorage to IndexedDB`);
          
          // Optionally remove from localStorage after successful migration
          localStorage.removeItem('farm-chat-threads');
        }
      }
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
    }
  }

  // Export threads for backup
  async exportThreads(): Promise<ChatThread[]> {
    return this.getAllThreads();
  }

  // Import threads from backup
  async importThreads(threads: ChatThread[]): Promise<void> {
    if (!Array.isArray(threads)) {
      throw new Error('Invalid threads data format');
    }
    
    // Validate thread structure
    const validThreads = threads.filter(thread => 
      thread && 
      typeof thread.id === 'string' && 
      typeof thread.title === 'string' && 
      Array.isArray(thread.messages) &&
      typeof thread.createdAt === 'string' &&
      typeof thread.updatedAt === 'string'
    );

    if (validThreads.length !== threads.length) {
      console.warn(`Filtered out ${threads.length - validThreads.length} invalid threads during import`);
    }

    await this.saveThreads(validThreads);
  }

  // Suggested Queries methods
  async saveSuggestedQueries(queries: string[], contextHash: string): Promise<void> {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SUGGESTED_QUERIES_STORE], 'readwrite');
      const store = transaction.objectStore(SUGGESTED_QUERIES_STORE);
      
      const suggestedQueries: SuggestedQueries = {
        id: 'global',
        queries,
        lastUpdated: new Date().toISOString(),
        contextHash
      };
      
      const request = store.put(suggestedQueries);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error saving suggested queries:', request.error);
        reject(request.error);
      };
    });
  }

  async getSuggestedQueries(): Promise<SuggestedQueries | null> {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SUGGESTED_QUERIES_STORE], 'readonly');
      const store = transaction.objectStore(SUGGESTED_QUERIES_STORE);
      const request = store.get('global');
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        console.error('Error getting suggested queries:', request.error);
        reject(request.error);
      };
    });
  }

  async clearSuggestedQueries(): Promise<void> {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SUGGESTED_QUERIES_STORE], 'readwrite');
      const store = transaction.objectStore(SUGGESTED_QUERIES_STORE);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Successfully cleared all suggested queries from IndexedDB');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Error clearing suggested queries:', request.error);
        reject(request.error);
      };
    });
  }

  // Migration helper: import suggested queries from localStorage
  async migrateSuggestedQueriesFromLocalStorage(): Promise<void> {
    try {
      const savedQueries = localStorage.getItem('suggested-queries');
      if (savedQueries) {
        const parsedQueries = JSON.parse(savedQueries);
        if (parsedQueries && Array.isArray(parsedQueries.queries)) {
          await this.saveSuggestedQueries(
            parsedQueries.queries,
            parsedQueries.contextHash || ''
          );
          console.log('Migrated suggested queries from localStorage to IndexedDB');
          
          // Remove from localStorage after successful migration
          localStorage.removeItem('suggested-queries');
        }
      }
    } catch (error) {
      console.error('Error migrating suggested queries from localStorage:', error);
    }
  }
}

// Create a singleton instance
export const chatDB = new ChatDatabase();

// Helper hook for using the database
export const useChatDB = () => {
  return chatDB;
};
