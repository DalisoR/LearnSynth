import React, { useState } from 'react';
import { useDownloadManager } from '../hooks/useDownloadManager';

const DownloadManager: React.FC = () => {
  const {
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
    refresh,
  } = useDownloadManager();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'lesson' | 'quiz'>('all');
  const [showStats, setShowStats] = useState(true);

  const filteredDownloads = downloads.filter(d =>
    filter === 'all' || d.type === filter
  );

  const downloadedCount = downloads.filter(d => d.isDownloaded).length;
  const totalCount = downloads.length;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredDownloads.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredDownloads.map(d => d.id));
    }
  };

  const handleBulkDownload = async () => {
    const notDownloaded = selectedItems.filter(id => {
      const item = downloads.find(d => d.id === id);
      return item && !item.isDownloaded;
    });

    if (notDownloaded.length > 0) {
      await downloadMultiple(notDownloaded);
      setSelectedItems([]);
    }
  };

  const handleBulkRemove = async () => {
    const downloaded = selectedItems.filter(id => {
      const item = downloads.find(d => d.id === id);
      return item && item.isDownloaded;
    });

    if (downloaded.length > 0) {
      for (const id of downloaded) {
        await removeItem(id);
      }
      setSelectedItems([]);
    }
  };

  // Group by subject
  const groupedBySubject = filteredDownloads.reduce((acc, item) => {
    if (!acc[item.subjectId]) {
      acc[item.subjectId] = [];
    }
    acc[item.subjectId].push(item);
    return acc;
  }, {} as Record<string, typeof filteredDownloads>);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Offline Downloads</h1>
            <p className="text-gray-600 mt-1">
              Download lessons and quizzes for offline study
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isLoading}
            >
              {isLoading ? '⟳ Refreshing...' : '⟳ Refresh'}
            </button>

            <button
              onClick={syncPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              ⬆ Sync Changes
            </button>
          </div>
        </div>

        {/* Stats Card */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow border">
              <div className="text-sm text-gray-600">Downloaded</div>
              <div className="text-2xl font-bold text-gray-900">
                {downloadedCount} / {totalCount}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow border">
              <div className="text-sm text-gray-600">Storage Used</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatSize(stats.totalSize)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow border">
              <div className="text-sm text-gray-600">Lessons</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.lessonCount}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow border">
              <div className="text-sm text-gray-600">Quizzes</div>
              <div className="text-2xl font-bold text-purple-600">
                {stats.quizCount}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('lesson')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'lesson'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Lessons
            </button>
            <button
              onClick={() => setFilter('quiz')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'quiz'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Quizzes
            </button>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkDownload}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ⬇ Download Selected ({selectedItems.length})
              </button>
              <button
                onClick={handleBulkRemove}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                🗑 Remove Selected
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Storage Actions */}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={cleanupOldEntries}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              🧹 Cleanup
            </button>
            <button
              onClick={clearAll}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              🗑 Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && downloads.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading downloads...</div>
        </div>
      ) : downloads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow border">
          <div className="text-gray-500 text-lg">No content available</div>
          <div className="text-gray-400 text-sm mt-2">
            Check back later for lessons and quizzes to download
          </div>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedItems.length === filteredDownloads.length}
              onChange={handleSelectAll}
              className="w-5 h-5"
            />
            <label className="text-gray-700">
              Select All ({filteredDownloads.length} items)
            </label>
          </div>

          {/* Downloads List */}
          <div className="space-y-4">
            {Object.entries(groupedBySubject).map(([subjectId, items]) => (
              <div key={subjectId} className="bg-white rounded-lg shadow border overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <h3 className="font-semibold text-gray-900">
                    Subject: {subjectId}
                    <span className="ml-2 text-sm text-gray-600">
                      ({items.length} items, {items.filter(i => i.isDownloaded).length} downloaded)
                    </span>
                  </h3>
                </div>

                <div className="divide-y">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="w-5 h-5"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.type === 'lesson'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.type}
                          </span>
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Size: {formatSize(item.size)}
                        </div>
                        {item.isDownloading && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${item.downloadProgress}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Downloading... {item.downloadProgress}%
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.isDownloaded ? (
                          <>
                            <span className="text-green-600 text-sm font-medium">
                              ✓ Downloaded
                            </span>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => downloadItem(item.id)}
                            disabled={item.isDownloading}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                          >
                            {item.isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DownloadManager;
