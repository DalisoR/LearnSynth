// IndexedDB Offline Cache Service
// Stores lessons, quizzes, and other content for offline access

interface CacheEntry<T = any> {
  id: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
  size: number; // Size in bytes
}

interface LessonCache {
  id: string;
  title: string;
  content: string;
  enhancedContent?: any;
  subjectId: string;
  chapterId: string;
  downloadedAt: number;
  lastAccessed: number;
  size: number;
}

interface QuizCache {
  id: string;
  title: string;
  questions: any[];
  subjectId: string;
  downloadedAt: number;
  lastAccessed: number;
  size: number;
}

interface OfflineMetadata {
  totalSize: number;
  lastSync: number;
  pendingActions: OfflineAction[];
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'lesson' | 'quiz' | 'note' | 'progress';
  entityId: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

class OfflineCacheService {
  private dbName = 'LearnSynthOfflineDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private readonly MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[OfflineCache] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineCache] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;

        // Lessons store
        if (!db.objectStoreNames.contains('lessons')) {
          const lessonsStore = db.createObjectStore('lessons', { keyPath: 'id' });
          lessonsStore.createIndex('subjectId', 'subjectId', { unique: false });
          lessonsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          lessonsStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Quizzes store
        if (!db.objectStoreNames.contains('quizzes')) {
          const quizzesStore = db.createObjectStore('quizzes', { keyPath: 'id' });
          quizzesStore.createIndex('subjectId', 'subjectId', { unique: false });
          quizzesStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          quizzesStore.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        }

        // Documents store
        if (!db.objectStoreNames.contains('documents')) {
          const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
          documentsStore.createIndex('type', 'fileType', { unique: false });
          documentsStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // Pending actions store (for sync)
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id' });
        }

        console.log('[OfflineCache] Database upgrade completed');
      };
    });
  }

  /**
   * Cache a lesson for offline access
   */
  async cacheLesson(lesson: any): Promise<void> {
    if (!this.db) await this.init();

    const lessonCache: LessonCache = {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      enhancedContent: lesson.enhancedContent,
      subjectId: lesson.subjectId,
      chapterId: lesson.chapterId,
      downloadedAt: Date.now(),
      lastAccessed: Date.now(),
      size: this.calculateSize(lesson),
    };

    await this.put('lessons', lessonCache);
    await this.updateMetadata({ totalSize: await this.getTotalCacheSize() });

    console.log('[OfflineCache] Lesson cached:', lesson.id);
  }

  /**
   * Get a lesson from cache
   */
  async getCachedLesson(lessonId: string): Promise<LessonCache | null> {
    if (!this.db) await this.init();

    const lesson = await this.get<LessonCache>('lessons', lessonId);

    if (lesson) {
      // Update last accessed
      lesson.lastAccessed = Date.now();
      await this.put('lessons', lesson);
    }

    return lesson;
  }

  /**
   * Cache a quiz for offline access
   */
  async cacheQuiz(quiz: any): Promise<void> {
    if (!this.db) await this.init();

    const quizCache: QuizCache = {
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions,
      subjectId: quiz.subjectId,
      downloadedAt: Date.now(),
      lastAccessed: Date.now(),
      size: this.calculateSize(quiz),
    };

    await this.put('quizzes', quizCache);
    await this.updateMetadata({ totalSize: await this.getTotalCacheSize() });

    console.log('[OfflineCache] Quiz cached:', quiz.id);
  }

  /**
   * Get a quiz from cache
   */
  async getCachedQuiz(quizId: string): Promise<QuizCache | null> {
    if (!this.db) await this.init();

    const quiz = await this.get<QuizCache>('quizzes', quizId);

    if (quiz) {
      quiz.lastAccessed = Date.now();
      await this.put('quizzes', quiz);
    }

    return quiz;
  }

  /**
   * Get all cached lessons for a subject
   */
  async getCachedLessonsBySubject(subjectId: string): Promise<LessonCache[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lessons'], 'readonly');
      const store = transaction.objectStore('lessons');
      const index = store.index('subjectId');
      const request = index.getAll(subjectId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get all cached quizzes for a subject
   */
  async getCachedQuizzesBySubject(subjectId: string): Promise<QuizCache[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['quizzes'], 'readonly');
      const store = transaction.objectStore('quizzes');
      const index = store.index('subjectId');
      const request = index.getAll(subjectId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Remove a lesson from cache
   */
  async removeCachedLesson(lessonId: string): Promise<void> {
    if (!this.db) await this.init();

    await this.delete('lessons', lessonId);
    await this.updateMetadata({ totalSize: await this.getTotalCacheSize() });

    console.log('[OfflineCache] Lesson removed from cache:', lessonId);
  }

  /**
   * Remove a quiz from cache
   */
  async removeCachedQuiz(quizId: string): Promise<void> {
    if (!this.db) await this.init();

    await this.delete('quizzes', quizId);
    await this.updateMetadata({ totalSize: await this.getTotalCacheSize() });

    console.log('[OfflineCache] Quiz removed from cache:', quizId);
  }

  /**
   * Clear all cached content
   */
  async clearCache(): Promise<void> {
    if (!this.db) await this.init();

    const storeNames = ['lessons', 'quizzes', 'documents', 'pendingActions'];

    await Promise.all(
      storeNames.map((storeName) => this.clearStore(storeName))
    );

    await this.updateMetadata({
      totalSize: 0,
      lastSync: Date.now(),
      pendingActions: [],
    });

    console.log('[OfflineCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    lessonCount: number;
    quizCount: number;
    documentCount: number;
    pendingActions: number;
  }> {
    if (!this.db) await this.init();

    const lessonCount = await this.count('lessons');
    const quizCount = await this.count('quizzes');
    const documentCount = await this.count('documents');
    const pendingActions = await this.count('pendingActions');

    const metadata = await this.get<OfflineMetadata>('metadata', 'cache');
    const totalSize = metadata?.totalSize || 0;

    return {
      totalSize,
      lessonCount,
      quizCount,
      documentCount,
      pendingActions,
    };
  }

  /**
   * Check if content is cached
   */
  async isCached(storeName: string, id: string): Promise<boolean> {
    if (!this.db) await this.init();

    const item = await this.get(storeName, id);
    return item !== null;
  }

  /**
   * Store pending action for later sync
   */
  async storePendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    if (!this.db) await this.init();

    const pendingAction: OfflineAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
      ...action,
    };

    await this.put('pendingActions', pendingAction);
    console.log('[OfflineCache] Pending action stored:', pendingAction.id);

    // Register background sync if online
    if (navigator.onLine && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-offline-data');
        console.log('[OfflineCache] Background sync registered');
      } catch (error) {
        console.error('[OfflineCache] Failed to register background sync:', error);
      }
    }
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    return this.getAll<OfflineAction>('pendingActions');
  }

  /**
   * Mark pending action as synced
   */
  async markActionSynced(actionId: string): Promise<void> {
    if (!this.db) await this.init();

    const action = await this.get<OfflineAction>('pendingActions', actionId);

    if (action) {
      action.synced = true;
      await this.put('pendingActions', action);
    }
  }

  /**
   * Remove synced actions (cleanup)
   */
  async cleanupSyncedActions(): Promise<void> {
    if (!this.db) await this.init();

    const allActions = await this.getAll<OfflineAction>('pendingActions');
    const syncedActions = allActions.filter(a => a.synced);

    await Promise.all(
      syncedActions.map(action => this.delete('pendingActions', action.id))
    );

    console.log('[OfflineCache] Cleaned up synced actions:', syncedActions.length);
  }

  /**
   * Clean up old cache entries (LRU eviction)
   */
  async cleanupOldEntries(): Promise<void> {
    if (!this.db) await this.init();

    const metadata = await this.get<OfflineMetadata>('metadata', 'cache');
    const totalSize = metadata?.totalSize || 0;

    if (totalSize <= this.MAX_CACHE_SIZE * 0.8) {
      return; // No need to clean up
    }

    console.log('[OfflineCache] Starting cache cleanup...');

    // Get least recently accessed lessons
    const oldLessons = await this.getOldEntries('lessons', 50);
    for (const lesson of oldLessons) {
      await this.delete('lessons', lesson.id);
    }

    // Get least recently accessed quizzes
    const oldQuizzes = await this.getOldEntries('quizzes', 50);
    for (const quiz of oldQuizzes) {
      await this.delete('quizzes', quiz.id);
    }

    await this.updateMetadata({ totalSize: await this.getTotalCacheSize() });

    console.log('[OfflineCache] Cache cleanup completed');
  }

  // ====== Private Helper Methods ======

  private async put<T>(storeName: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async get<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateMetadata(updates: Partial<OfflineMetadata>): Promise<void> {
    const existing = await this.get<OfflineMetadata>('metadata', 'cache') || {
      totalSize: 0,
      lastSync: Date.now(),
      pendingActions: [],
    };

    const updated = { ...existing, ...updates };
    await this.put('metadata', updated);
  }

  private async getTotalCacheSize(): Promise<number> {
    const lessons = await this.getAll('lessons');
    const quizzes = await this.getAll('quizzes');
    const documents = await this.getAll('documents');

    return (
      lessons.reduce((sum, l) => sum + (l as any).size, 0) +
      quizzes.reduce((sum, q) => sum + (q as any).size, 0) +
      documents.reduce((sum, d) => sum + (d as any).size, 0)
    );
  }

  private async getOldEntries(storeName: string, limit: number): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('lastAccessed');
      const request = index.openCursor();

      const oldEntries: any[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;

        if (cursor && count < limit) {
          oldEntries.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(oldEntries);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private calculateSize(obj: any): number {
    return new Blob([JSON.stringify(obj)]).size;
  }

  /**
   * Register online/offline event listeners for automatic sync
   */
  setupOnlineListener(): void {
    window.addEventListener('online', () => {
      console.log('[OfflineCache] Back online, triggering sync');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineCache] Gone offline');
    });
  }

  /**
   * Manually trigger sync of pending actions
   */
  async syncPendingActions(): Promise<void> {
    if (!navigator.onLine) {
      console.log('[OfflineCache] Still offline, skipping sync');
      return;
    }

    const pendingActions = await this.getPendingActions();
    const unsyncedActions = pendingActions.filter(a => !a.synced);

    console.log(`[OfflineCache] Syncing ${unsyncedActions.length} pending actions`);

    for (const action of unsyncedActions) {
      try {
        // Send action to server based on type
        await this.syncAction(action);
        await this.markActionSynced(action.id);
        console.log('[OfflineCache] Synced action:', action.id);
      } catch (error) {
        console.error('[OfflineCache] Failed to sync action:', action.id, error);
      }
    }
  }

  /**
   * Sync a single action to the server
   */
  private async syncAction(action: OfflineAction): Promise<void> {
    const api = (await import('../../services/api')).default;

    switch (action.entity) {
      case 'lesson':
        if (action.type === 'create' || action.type === 'update') {
          await api.lessons.updateLesson(action.entityId, action.data);
        } else if (action.type === 'delete') {
          await api.lessons.deleteLesson(action.entityId);
        }
        break;

      case 'quiz':
        if (action.type === 'create' || action.type === 'update') {
          await api.quizzes.updateQuiz(action.entityId, action.data);
        } else if (action.type === 'delete') {
          await api.quizzes.deleteQuiz(action.entityId);
        }
        break;

      case 'note':
        if (action.type === 'create' || action.type === 'update') {
          await api.notes.updateNote(action.entityId, action.data);
        } else if (action.type === 'delete') {
          await api.notes.deleteNote(action.entityId);
        }
        break;

      case 'progress':
        await api.progress.updateProgress(action.data);
        break;

      default:
        console.warn('[OfflineCache] Unknown action type:', action.entity);
    }
  }
}

export default new OfflineCacheService();
