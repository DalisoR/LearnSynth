import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Brain, Globe, Settings2, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { chatAPI, subjectsAPI } from '@/services/api';
import { ChatMessage as ChatMessageType } from '@/types/api';

interface Subject {
  id: string;
  name: string;
  color?: string;
}

interface ChatInterfaceProps {
  subjectId?: string;
}

export default function ChatInterface({ subjectId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeKB, setIncludeKB] = useState(true);
  const [includeWebSearch, setIncludeWebSearch] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load available knowledge bases
  useEffect(() => {
    subjectsAPI.getAll()
      .then((data) => {
        setAvailableSubjects(data.subjects || []);
        // Auto-select the provided subjectId
        if (subjectId) {
          setSelectedSubjects([subjectId]);
        }
      })
      .catch((err) => console.error('Failed to load subjects:', err));
  }, [subjectId]);

  // Start a new session when component mounts
  useEffect(() => {
    chatAPI.startSession(undefined, subjectId, selectedSubjects).then((res) => {
      setSessionId(res.session.id);
    });
  }, [subjectId, selectedSubjects.join(',')]); // Re-start when KBs change

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setLoading(true);

    try {
      const response = await chatAPI.sendMessage(sessionId, messageText, {
        includeKB,
        subjectIds: selectedSubjects,
        includeWebSearch,
      });
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response.message.content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-lg border shadow-sm">
      {/* Header with Settings */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">AI Tutor Chat</h3>
          {selectedSubjects.length > 0 && (
            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
              {selectedSubjects.length} KB{selectedSubjects.length > 1 ? 's' : ''} Active
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="gap-2"
        >
          <Settings2 className="w-4 h-4" />
          Settings
          <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b bg-gray-50">
          <div className="space-y-4">
            {/* Knowledge Bases */}
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Knowledge Bases ({selectedSubjects.length} selected)
              </h4>
              {availableSubjects.length === 0 ? (
                <p className="text-sm text-gray-500">No knowledge bases available</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {availableSubjects.map((subject) => (
                    <Button
                      key={subject.id}
                      variant={selectedSubjects.includes(subject.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleSubject(subject.id)}
                      className="gap-2 h-8"
                    >
                      {selectedSubjects.includes(subject.id) && <X className="w-3 h-3" />}
                      {subject.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={includeKB} onCheckedChange={setIncludeKB} />
                <label className="text-sm font-medium flex items-center gap-1">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  Use Knowledge Base
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={includeWebSearch} onCheckedChange={setIncludeWebSearch} />
                <label className="text-sm font-medium flex items-center gap-1">
                  <Globe className="w-4 h-4 text-green-600" />
                  Web Search
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-16">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to your AI Tutor!</h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Ask questions about your materials or get help with any topic.
              {includeKB && selectedSubjects.length > 0 && (
                <span className="text-indigo-600">
                  {' '}Your {selectedSubjects.length} knowledge base{selectedSubjects.length > 1 ? 's are' : ' is'} active.
                </span>
              )}
            </p>
            <div className="text-sm text-gray-500">
              Try: "Explain this concept in simple terms" or "What are the key points from my notes?"
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
              <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl p-4 flex items-center gap-3 border border-gray-200">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              includeKB && selectedSubjects.length > 0
                ? "Ask about your materials or general knowledge..."
                : "Ask anything..."
            }
            className="flex-1 resize-none border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 max-h-32"
            rows={1}
            disabled={loading}
            style={{ minHeight: '48px', maxHeight: '128px' }}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 rounded-xl"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
