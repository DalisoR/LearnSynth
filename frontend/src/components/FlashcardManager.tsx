import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import flashcardsService, { FlashcardData, FlashcardDeck, ImageOcclusionData } from '../services/api/flashcards';

const FlashcardManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'cards' | 'decks'>('cards');
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardData | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [cardsData, decksData] = await Promise.all([
        flashcardsService.getFlashcards({ limit: 100 }),
        flashcardsService.getDecks(),
      ]);

      setFlashcards(cardsData.flashcards || []);
      setDecks(decksData.decks || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError('Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flashcards</h1>
          <p className="text-gray-600">Create and manage your flashcard collection</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/flashcards/study')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <span>📝</span>
            Start Study Session
          </button>
          <button
            onClick={() => {
              setEditingCard(null);
              setShowCreateForm(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Create Flashcard
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'cards'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Cards ({flashcards.length})
        </button>
        <button
          onClick={() => setActiveTab('decks')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'decks'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Decks ({decks.length})
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 text-sm text-red-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'cards' ? (
        <FlashcardsList
          flashcards={flashcards}
          decks={decks}
          onEdit={(card) => {
            setEditingCard(card);
            setShowCreateForm(true);
          }}
          onDelete={async (id) => {
            if (confirm('Are you sure you want to delete this flashcard?')) {
              try {
                await flashcardsService.deleteFlashcard(id);
                setFlashcards(flashcards.filter(c => c.id !== id));
              } catch (err) {
                alert('Failed to delete flashcard');
              }
            }
          }}
          onRefresh={loadData}
        />
      ) : (
        <DecksList
          decks={decks}
          flashcards={flashcards}
          onRefresh={loadData}
        />
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <FlashcardForm
          card={editingCard}
          decks={decks}
          onClose={() => {
            setShowCreateForm(false);
            setEditingCard(null);
          }}
          onSave={async (data) => {
            try {
              if (editingCard) {
                const result = await flashcardsService.updateFlashcard(editingCard.id, data);
                setFlashcards(
                  flashcards.map(c => c.id === editingCard.id ? result.flashcard : c)
                );
              } else {
                const result = await flashcardsService.createFlashcard(data);
                setFlashcards([result.flashcard, ...flashcards]);
              }
              setShowCreateForm(false);
              setEditingCard(null);
            } catch (err) {
              alert('Failed to save flashcard');
            }
          }}
        />
      )}
    </div>
  );
};

// Flashcards List Component
interface FlashcardsListProps {
  flashcards: FlashcardData[];
  decks: FlashcardDeck[];
  onEdit: (card: FlashcardData) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const FlashcardsList: React.FC<FlashcardsListProps> = ({
  flashcards,
  decks,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">All Flashcards</h2>
          <button
            onClick={onRefresh}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {flashcards.length === 0 ? (
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600 mb-4">No flashcards yet</p>
          <p className="text-sm text-gray-500">Create your first flashcard to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Front
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Back
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deck
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flashcards.map((card) => (
                <tr key={card.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {card.front}
                    </div>
                    {card.tags && card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {card.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {card.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{card.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {card.back}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {card.flashcard_decks?.name || 'No deck'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {card.flashcard_spaced_repetition?.review_count || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        card.difficulty >= 80
                          ? 'bg-red-100 text-red-800'
                          : card.difficulty >= 60
                          ? 'bg-orange-100 text-orange-800'
                          : card.difficulty >= 40
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {card.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(card)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(card.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Decks List Component
interface DecksListProps {
  decks: FlashcardDeck[];
  flashcards: FlashcardData[];
  onRefresh: () => void;
}

const DecksList: React.FC<DecksListProps> = ({ decks, flashcards, onRefresh }) => {
  const getCardsInDeck = (deckId: string) => {
    return flashcards.filter(c => c.deck_id === deckId).length;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {decks.map((deck) => (
        <div key={deck.id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-900">{deck.name}</h3>
            <span className="text-2xl">📁</span>
          </div>
          {deck.description && (
            <p className="text-sm text-gray-600 mb-4">{deck.description}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {getCardsInDeck(deck.id)} cards
            </span>
            <span className="text-gray-500">
              {new Date(deck.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}

      {decks.length === 0 && (
        <div className="col-span-full p-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <p className="text-gray-600 mb-4">No decks yet</p>
          <p className="text-sm text-gray-500">Organize your flashcards into decks</p>
        </div>
      )}
    </div>
  );
};

// Flashcard Form Component
interface FlashcardFormProps {
  card?: FlashcardData | null;
  decks: FlashcardDeck[];
  onClose: () => void;
  onSave: (data: any) => void;
}

const FlashcardForm: React.FC<FlashcardFormProps> = ({ card, decks, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    front: card?.front || '',
    back: card?.back || '',
    tags: card?.tags?.join(', ') || '',
    deckId: card?.deck_id || '',
    difficulty: card?.difficulty || 50,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    onSave({
      front: formData.front,
      back: formData.back,
      tags,
      deckId: formData.deckId || undefined,
      difficulty: formData.difficulty,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {card ? 'Edit Flashcard' : 'Create Flashcard'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Front
            </label>
            <textarea
              value={formData.front}
              onChange={(e) => setFormData({ ...formData, front: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Back
            </label>
            <textarea
              value={formData.back}
              onChange={(e) => setFormData({ ...formData, back: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="biology, anatomy, heart"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deck
            </label>
            <select
              value={formData.deckId}
              onChange={(e) => setFormData({ ...formData, deckId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No deck</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty: {formData.difficulty}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Easy</span>
              <span>Medium</span>
              <span>Hard</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {card ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FlashcardManager;
