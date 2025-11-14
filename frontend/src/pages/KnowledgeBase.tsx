import { useState, useEffect } from 'react';
import { Brain, Plus, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { subjectsAPI } from '@/services/api';
import { Subject } from '@/types/api';

export default function KnowledgeBase() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await subjectsAPI.getAll();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSubject = async () => {
    const name = prompt('Enter subject name:');
    if (!name) return;

    try {
      await subjectsAPI.create({ name });
      loadSubjects();
    } catch (error) {
      console.error('Failed to create subject:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !selectedSubject) return;

    setSearching(true);
    try {
      const data = await subjectsAPI.retrieve(selectedSubject, searchQuery);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Failed to search:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8" />
          Knowledge Base
        </h1>
        <Button onClick={createSubject} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Subject
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Vector Search</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Knowledge Base</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full border rounded-lg p-2"
            >
              <option value="">Choose a subject...</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Search Query</label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question about your materials..."
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={!selectedSubject || !searchQuery.trim()}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {searchResults.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Search Results</h3>
          <div className="space-y-4">
            {searchResults.map((result, idx) => (
              <div key={idx} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600">
                    {result.metadata.source}
                  </span>
                  <span className="text-sm text-gray-500">
                    Score: {(result.score * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-gray-700">{result.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
        {subjects.map((subject) => (
          <Card key={subject.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              {subject.color && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
              )}
            </div>

            <h3 className="text-xl font-semibold mb-2">{subject.name}</h3>

            {subject.description && (
              <p className="text-gray-600 text-sm mb-4">{subject.description}</p>
            )}

            <div className="text-sm text-gray-500">
              <p>Created {new Date(subject.created_at).toLocaleDateString()}</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setSelectedSubject(subject.id)}
            >
              Search This KB
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
