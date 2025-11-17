// Offline Sync Manager Service
// Handles synchronization of offline actions when connection is restored

import offlineCacheService from './offlineCacheService';

interface SyncEvent {
  onStart?: () => void;
  onProgress?: (completed: number, total: number) => void;
  onComplete?: (successCount: number, failedCount: number) => void;
  onError?: (error: Error) => void;
}

class OfflineSyncService {
  private syncInProgress = false;
  private syncQueue: Promise<void> = Promise.resolve();

  /**
   * Initialize the sync service
   */
  async init(): Promise<void> {
    await offlineCacheService.init();
    offlineCacheService.setupOnlineListener();

    console.log('[OfflineSync] Service initialized');
  }

  /**
   * Queue a sync operation
   */
  private queueSync<T>(operation: () => Promise<T>): Promise<T> {
    this.syncQueue = this.syncQueue.then(operation).catch(error => {
      console.error('[OfflineSync] Sync operation failed:', error);
    });
    return this.syncQueue as Promise<T>;
  }

  /**
   * Trigger manual sync of all pending actions
   */
  async syncNow(event?: SyncEvent): Promise<{ success: number; failed: number }> {
    if (this.syncInProgress) {
      console.log('[OfflineSync] Sync already in progress');
      return { success: 0, failed: 0 };
    }

    this.syncInProgress = true;

    try {
      event?.onStart?.();

      const pendingActions = await offlineCacheService.getPendingActions();
      const unsyncedActions = pendingActions.filter(a => !a.synced);

      if (unsyncedActions.length === 0) {
        console.log('[OfflineSync] No pending actions to sync');
        event?.onComplete?.(0, 0);
        return { success: 0, failed: 0 };
      }

      console.log(`[OfflineSync] Starting sync of ${unsyncedActions.length} actions`);

      let successCount = 0;
      let failedCount = 0;

      for (let i = 0; i < unsyncedActions.length; i++) {
        const action = unsyncedActions[i];

        try {
          await this.syncAction(action);
          await offlineCacheService.markActionSynced(action.id);
          successCount++;
          console.log('[OfflineSync] ✓ Synced action:', action.id);
        } catch (error) {
          failedCount++;
          console.error('[OfflineSync] ✗ Failed to sync action:', action.id, error);
          event?.onError?.(error as Error);
        }

        event?.onProgress?.(i + 1, unsyncedActions.length);
      }

      // Clean up synced actions
      await offlineCacheService.cleanupSyncedActions();

      console.log(`[OfflineSync] Sync complete: ${successCount} success, ${failedCount} failed`);
      event?.onComplete?.(successCount, failedCount);

      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
      event?.onError?.(error as Error);
      return { success: 0, failed: 0 };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a single action
   */
  private async syncAction(action: any): Promise<void> {
    const api = (await import('../api')).default;

    switch (action.entity) {
      case 'lesson':
        await this.syncLesson(action);
        break;

      case 'quiz':
        await this.syncQuiz(action);
        break;

      case 'note':
        await this.syncNote(action);
        break;

      case 'progress':
        await this.syncProgress(action);
        break;

      default:
        throw new Error(`Unknown entity type: ${action.entity}`);
    }
  }

  /**
   * Sync lesson action
   */
  private async syncLesson(action: any): Promise<void> {
    const api = (await import('../api')).default;

    if (action.type === 'create') {
      await api.lessons.createLesson(action.data);
    } else if (action.type === 'update') {
      await api.lessons.updateLesson(action.entityId, action.data);
    } else if (action.type === 'delete') {
      await api.lessons.deleteLesson(action.entityId);
    }
  }

  /**
   * Sync quiz action
   */
  private async syncQuiz(action: any): Promise<void> {
    const api = (await import('../api')).default;

    if (action.type === 'create') {
      await api.quizzes.createQuiz(action.data);
    } else if (action.type === 'update') {
      await api.quizzes.updateQuiz(action.entityId, action.data);
    } else if (action.type === 'delete') {
      await api.quizzes.deleteQuiz(action.entityId);
    }
  }

  /**
   * Sync note action
   */
  private async syncNote(action: any): Promise<void> {
    const api = (await import('../api')).default;

    if (action.type === 'create') {
      await api.notes.createNote(action.data);
    } else if (action.type === 'update') {
      await api.notes.updateNote(action.entityId, action.data);
    } else if (action.type === 'delete') {
      await api.notes.deleteNote(action.entityId);
    }
  }

  /**
   * Sync progress action
   */
  private async syncProgress(action: any): Promise<void> {
    const api = (await import('../api')).default;
    await api.progress.updateProgress(action.data);
  }

  /**
   * Check if currently syncing
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    isSyncing: boolean;
    pendingActions: number;
    lastSync: number | null;
  }> {
    const pendingActions = await offlineCacheService.getPendingActions();
    const unsyncedCount = pendingActions.filter(a => !a.synced).length;

    const metadata = await offlineCacheService.get<any>('metadata', 'cache');
    const lastSync = metadata?.lastSync || null;

    return {
      isSyncing: this.syncInProgress,
      pendingActions: unsyncedCount,
      lastSync,
    };
  }

  /**
   * Force sync (skip queue, not recommended)
   */
  async forceSync(): Promise<{ success: number; failed: number }> {
    const currentQueue = this.syncQueue;
    this.syncQueue = Promise.resolve();
    return this.syncNow();
  }
}

export default new OfflineSyncService();
