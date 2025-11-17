import { useState, useEffect, useCallback } from 'react';
import offlineCacheService from '../services/offline/offlineCacheService';
import offlineSyncService from '../services/offline/offlineSyncService';
import api from '../services/api';

interface DownloadItem {
  id: string;
  type: 'lesson' | 'quiz';
  title: string;
  subjectId: string;
  size: number;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
}

interface DownloadStats {
  totalSize: number;
  lessonCount: number;
  quizCount: number;
  pendingActions: number;
}

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<DownloadStats>({
    totalSize: 0,
    lessonCount: 0,
    quizCount: 0,
    pendingActions: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load all available items and their download status
   */
  const loadDownloads = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch lessons and quizzes
      const [lessons, quizzes] = await Promise.all([
        api.lessons.getAllLessons(),
        api.quizzes.getAllQuizzes(),
      ]);

      const downloadItems: DownloadItem[] = [];

      // Process lessons
      for (const lesson of lessons) {
        const isDownloaded = await offlineCacheService.isCached('lessons', lesson.id);
        downloadItems.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          subjectId: lesson.subjectId,
          size: calculateItemSize(lesson),
          isDownloaded,
          isDownloading: false,
          downloadProgress: 0,
        });
      }

      // Process quizzes
      for (const quiz of quizzes) {
        const isDownloaded = await offlineCacheService.isCached('quizzes', quiz.id);
        downloadItems.push({
          id: quiz.id,
          type: 'quiz',
          title: quiz.title,
          subjectId: quiz.subjectId,
          size: calculateItemSize(quiz),
          isDownloaded,
          isDownloading: false,
          downloadProgress: 0,
        });
      }

      setDownloads(downloadItems);

      // Load cache stats
      const cacheStats = await offlineCacheService.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('[DownloadManager] Failed to load downloads:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Download an item for offline use
   */
  const downloadItem = useCallback(async (itemId: string) => {
    const item = downloads.find(d => d.id === itemId);
    if (!item || item.isDownloading) return;

    // Update state to show downloading
    setDownloads(prev =>
      prev.map(d =>
        d.id === itemId ? { ...d, isDownloading: true, downloadProgress: 0 } : d
      )
    );

    try {
      if (item.type === 'lesson') {
        const lesson = await api.lessons.getLesson(itemId);
        await offlineCacheService.cacheLesson(lesson);
      } else if (item.type === 'quiz') {
        const quiz = await api.quizzes.getQuiz(itemId);
        await offlineCacheService.cacheQuiz(quiz);
      }

      // Update state to show downloaded
      setDownloads(prev =>
        prev.map(d =>
          d.id === itemId
            ? { ...d, isDownloading: false, isDownloaded: true, downloadProgress: 100 }
            : d
        )
      );

      console.log(`[DownloadManager] Downloaded ${item.type}:`, itemId);
    } catch (error) {
      console.error(`[DownloadManager] Failed to download ${item.type}:`, itemId, error);

      // Reset state on error
      setDownloads(prev =>
        prev.map(d =>
          d.id === itemId ? { ...d, isDownloading: false, downloadProgress: 0 } : d
        )
      );
    }
  }, [downloads]);

  /**
   * Remove item from offline cache
   */
  const removeItem = useCallback(async (itemId: string) => {
    const item = downloads.find(d => d.id === itemId);
    if (!item) return;

    try {
      if (item.type === 'lesson') {
        await offlineCacheService.removeCachedLesson(itemId);
      } else if (item.type === 'quiz') {
        await offlineCacheService.removeCachedQuiz(itemId);
      }

      // Update state
      setDownloads(prev =>
        prev.map(d =>
          d.id === itemId
            ? { ...d, isDownloaded: false, downloadProgress: 0 }
            : d
        )
      );

      console.log(`[DownloadManager] Removed ${item.type} from cache:`, itemId);
    } catch (error) {
      console.error(`[DownloadManager] Failed to remove ${item.type}:`, itemId, error);
    }
  }, [downloads]);

  /**
   * Download multiple items
   */
  const downloadMultiple = useCallback(async (itemIds: string[]) => {
    console.log(`[DownloadManager] Starting batch download of ${itemIds.length} items`);

    for (const itemId of itemIds) {
      await downloadItem(itemId);
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('[DownloadManager] Batch download complete');
  }, [downloadItem]);

  /**
   * Clear all downloaded content
   */
  const clearAll = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all offline content? This cannot be undone.')) {
      return;
    }

    try {
      await offlineCacheService.clearCache();
      setDownloads(prev => prev.map(d => ({ ...d, isDownloaded: false, downloadProgress: 0 })));
      console.log('[DownloadManager] Cleared all offline content');
    } catch (error) {
      console.error('[DownloadManager] Failed to clear cache:', error);
    }
  }, []);

  /**
   * Sync pending actions
   */
  const syncPending = useCallback(async () => {
    try {
      await offlineSyncService.syncNow({
        onStart: () => console.log('[DownloadManager] Starting sync...'),
        onProgress: (completed, total) => {
          console.log(`[DownloadManager] Sync progress: ${completed}/${total}`);
        },
        onComplete: (success, failed) => {
          console.log(`[DownloadManager] Sync complete: ${success} success, ${failed} failed`);
          loadDownloads(); // Refresh stats
        },
      });
    } catch (error) {
      console.error('[DownloadManager] Sync failed:', error);
    }
  }, [loadDownloads]);

  /**
   * Get items by subject
   */
  const getItemsBySubject = useCallback((subjectId: string) => {
    return downloads.filter(d => d.subjectId === subjectId);
  }, [downloads]);

  /**
   * Calculate total download size
   */
  const calculateTotalDownloadSize = useCallback((itemIds: string[]) => {
    return itemIds.reduce((total, id) => {
      const item = downloads.find(d => d.id === id);
      return total + (item?.size || 0);
    }, 0);
  }, [downloads]);

  /**
   * Auto-cleanup old entries
   */
  const cleanupOldEntries = useCallback(async () => {
    try {
      await offlineCacheService.cleanupOldEntries();
      await loadDownloads(); // Refresh stats
      console.log('[DownloadManager] Cleaned up old entries');
    } catch (error) {
      console.error('[DownloadManager] Cleanup failed:', error);
    }
  }, [loadDownloads]);

  // Load downloads on mount
  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const cacheStats = await offlineCacheService.getCacheStats();
      setStats(cacheStats);
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    downloads,
    stats,
    isLoading,
    downloadItem,
    removeItem,
    downloadMultiple,
    clearAll,
    syncPending,
    getItemsBySubject,
    calculateTotalDownloadSize,
    cleanupOldEntries,
    refresh: loadDownloads,
  };
};

// Helper function to calculate item size
function calculateItemSize(item: any): number {
  return new Blob([JSON.stringify(item)]).size;
}
