import React, { useState, useEffect } from 'react';
import {
  generateMindMap,
  getMindMaps,
  getMindMap,
  updateMindMap,
  deleteMindMap,
  regenerateLayout,
  updateTheme,
  exportMindMap,
  getMindMapAnalytics,
  getLayoutTypeLabel,
  getThemeLabel,
  getThemeColors,
  getComplexityInfo,
  getSourceTypeIcon,
  formatDate,
  formatNodeCount,
  type MindMap,
  type MindMapWithStructure,
  type GenerateMindMapRequest,
  type MindMapAnalytics,
} from '../services/api/mindMaps';

const MindMapGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'view' | 'manage'>('generate');
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [selectedMindMap, setSelectedMindMap] = useState<MindMapWithStructure | null>(null);
  const [analytics, setAnalytics] = useState<MindMapAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate form state
  const [generateForm, setGenerateForm] = useState<GenerateMindMapRequest>({
    title: '',
    content: '',
    sourceType: 'lesson',
    layoutType: 'mind_map',
    theme: 'default',
    maxDepth: 3,
    maxNodes: 20,
    includeDetails: false,
  });

  // Load user's mind maps
  const loadMindMaps = async () => {
    try {
      setLoading(true);
      const data = await getMindMaps({ limit: 50 });
      setMindMaps(data.mindMaps);
    } catch (err: any) {
      setError('Failed to load mind maps');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load mind map details
  const loadMindMapDetails = async (id: string) => {
    try {
      setLoading(true);
      const data = await getMindMap(id);
      setSelectedMindMap(data.mindMap as MindMapWithStructure);
      setAnalytics(data.analytics);
    } catch (err: any) {
      setError('Failed to load mind map details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle generate
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.title || !generateForm.content) {
      setError('Title and content are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await generateMindMap(generateForm);
      setSuccess('Mind map generated successfully!');
      await loadMindMaps();
      setActiveTab('view');
      setSelectedMindMap(data.mindMap as MindMapWithStructure);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate mind map');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mind map?')) return;

    try {
      setLoading(true);
      await deleteMindMap(id);
      setSuccess('Mind map deleted successfully');
      await loadMindMaps();
      if (selectedMindMap?.id === id) {
        setSelectedMindMap(null);
      }
    } catch (err: any) {
      setError('Failed to delete mind map');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async (id: string, format: 'json' | 'markdown') => {
    try {
      setLoading(true);
      const blob = await exportMindMap(id, { format });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mind-map-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess(`Mind map exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      setError('Failed to export mind map');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle layout change
  const handleLayoutChange = async (id: string, layoutType: string) => {
    try {
      setLoading(true);
      await regenerateLayout(id, { layoutType: layoutType as any });
      setSuccess('Layout updated successfully');
      await loadMindMapDetails(id);
    } catch (err: any) {
      setError('Failed to update layout');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle theme change
  const handleThemeChange = async (id: string, theme: string) => {
    try {
      setLoading(true);
      await updateTheme(id, { theme: theme as any });
      setSuccess('Theme updated successfully');
      await loadMindMapDetails(id);
    } catch (err: any) {
      setError('Failed to update theme');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMindMaps();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <div className="mind-map-generator">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Mind Map Generator</h1>
          <p className="text-gray-600">
            Generate AI-powered mind maps from your lesson content
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('generate')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'generate'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Generate Mind Map
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'view'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Mind Maps
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manage'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Manage & Analyze
              </button>
            </nav>
          </div>
        </div>

        {/* Generate Tab */}
        {activeTab === 'generate' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Generate New Mind Map</h2>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={generateForm.title}
                  onChange={(e) => setGenerateForm({ ...generateForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mind map title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Source Type *
                </label>
                <select
                  value={generateForm.sourceType}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, sourceType: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="lesson">Lesson</option>
                  <option value="chapter">Chapter</option>
                  <option value="document">Document</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Layout Type
                  </label>
                  <select
                    value={generateForm.layoutType}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, layoutType: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mind_map">Mind Map</option>
                    <option value="radial">Radial</option>
                    <option value="hierarchical">Hierarchical</option>
                    <option value="flowchart">Flowchart</option>
                    <option value="tree">Tree</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={generateForm.theme}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, theme: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Default</option>
                    <option value="colorful">Colorful</option>
                    <option value="dark">Dark</option>
                    <option value="minimal">Minimal</option>
                    <option value="academic">Academic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Depth: {generateForm.maxDepth}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={generateForm.maxDepth}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, maxDepth: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Nodes: {generateForm.maxNodes}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={generateForm.maxNodes}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, maxNodes: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={generateForm.includeDetails}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, includeDetails: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Include detailed descriptions
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={generateForm.content}
                  onChange={(e) => setGenerateForm({ ...generateForm, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste or type your lesson content here..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  value={generateForm.generationPrompt || ''}
                  onChange={(e) =>
                    setGenerateForm({ ...generateForm, generationPrompt: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any specific requirements or focus areas..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Generating...' : 'Generate Mind Map'}
              </button>
            </form>
          </div>
        )}

        {/* View Tab */}
        {activeTab === 'view' && (
          <div className="space-y-6">
            {selectedMindMap ? (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedMindMap.title}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {getSourceTypeIcon(selectedMindMap.source_type)} {selectedMindMap.source_type} •{' '}
                        {formatDate(selectedMindMap.created_at)} • v{selectedMindMap.version}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedMindMap(null)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => handleExport(selectedMindMap.id, 'json')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Export JSON
                      </button>
                      <button
                        onClick={() => handleExport(selectedMindMap.id, 'markdown')}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Export MD
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6 flex space-x-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Layout
                      </label>
                      <select
                        value={selectedMindMap.layout_type}
                        onChange={(e) => handleLayoutChange(selectedMindMap.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mind_map">Mind Map</option>
                        <option value="radial">Radial</option>
                        <option value="hierarchical">Hierarchical</option>
                        <option value="flowchart">Flowchart</option>
                        <option value="tree">Tree</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={selectedMindMap.theme}
                        onChange={(e) => handleThemeChange(selectedMindMap.id, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="default">Default</option>
                        <option value="colorful">Colorful</option>
                        <option value="dark">Dark</option>
                        <option value="minimal">Minimal</option>
                        <option value="academic">Academic</option>
                      </select>
                    </div>
                  </div>

                  {/* Mind Map Visualization Placeholder */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                      Mind Map Visualization
                    </h3>
                    <p className="text-gray-500">
                      {selectedMindMap.structure.nodes.length} nodes, {selectedMindMap.structure.connections.length} connections
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Layout: {getLayoutTypeLabel(selectedMindMap.layout_type)} • Theme: {getThemeLabel(selectedMindMap.theme)}
                    </p>
                  </div>

                  {/* Structure Preview */}
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Structure Preview</h3>
                    <div className="space-y-2">
                      {selectedMindMap.structure.nodes.slice(0, 10).map((node, index) => (
                        <div key={node.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-500 w-8">
                            L{node.level}
                          </span>
                          <span className="text-sm font-semibold">{node.label}</span>
                          {node.content && (
                            <span className="text-sm text-gray-600">- {node.content}</span>
                          )}
                        </div>
                      ))}
                      {selectedMindMap.structure.nodes.length > 10 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          ...and {selectedMindMap.structure.nodes.length - 10} more nodes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mindMaps.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="text-6xl mb-4">🗺️</div>
                    <p className="text-gray-500">No mind maps yet. Generate your first one!</p>
                  </div>
                ) : (
                  mindMaps.map((mindMap) => (
                    <div
                      key={mindMap.id}
                      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 cursor-pointer"
                      onClick={() => loadMindMapDetails(mindMap.id)}
                    >
                      <h3 className="font-bold text-lg mb-2">{mindMap.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {getSourceTypeIcon(mindMap.source_type)} {mindMap.source_type} •{' '}
                        {formatDate(mindMap.created_at)}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {getLayoutTypeLabel(mindMap.layout_type)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                          {getThemeLabel(mindMap.theme)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Manage Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {selectedMindMap && analytics && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6">Analytics: {selectedMindMap.title}</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analytics.nodeCount}</div>
                    <div className="text-sm text-gray-600">Total Nodes</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{analytics.connectionCount}</div>
                    <div className="text-sm text-gray-600">Connections</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{analytics.maxLevel}</div>
                    <div className="text-sm text-gray-600">Max Depth</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {getComplexityInfo(analytics.complexity).label}
                    </div>
                    <div className="text-sm text-gray-600">Complexity</div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold mb-2">Main Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {analytics.mainTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(selectedMindMap.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete Mind Map
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold">All Mind Maps</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {mindMaps.map((mindMap) => (
                  <div key={mindMap.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{mindMap.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {getSourceTypeIcon(mindMap.source_type)} {mindMap.source_type} •{' '}
                          {formatDate(mindMap.created_at)} • v{mindMap.version}
                        </p>
                        <div className="flex space-x-2">
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            {getLayoutTypeLabel(mindMap.layout_type)}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                            {getThemeLabel(mindMap.theme)}
                          </span>
                          {mindMap.is_public && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                              Public
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => loadMindMapDetails(mindMap.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(mindMap.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {mindMaps.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No mind maps found
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMapGenerator;
