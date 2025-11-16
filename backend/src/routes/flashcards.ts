import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Test user ID for development
const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

// ========================================
// FLASHCARD CRUD OPERATIONS
// ========================================

// Create a new flashcard
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    const { front, back, imageUrl, occlusionData, tags, deckId, difficulty } = req.body;

    if (!front || !back) {
      return res.status(400).json({ error: 'Front and back are required' });
    }

    const cardId = uuidv4();

    // Insert flashcard
    const { data: flashcard, error: flashcardError } = await supabase
      .from('flashcards')
      .insert({
        id: cardId,
        user_id: userId,
        front,
        back,
        image_url: imageUrl,
        occlusion_data: occlusionData,
        tags: tags || [],
        deck_id: deckId,
        difficulty: difficulty || 50,
      })
      .select()
      .single();

    if (flashcardError) {
      return res.status(500).json({ error: flashcardError.message });
    }

    // Spaced repetition data is automatically created by trigger
    const { data: spacedRepetition } = await supabase
      .from('flashcard_spaced_repetition')
      .select('*')
      .eq('flashcard_id', cardId)
      .single();

    res.status(201).json({
      flashcard,
      spacedRepetition,
    });
  } catch (error: any) {
    console.error('Error creating flashcard:', error);
    res.status(500).json({ error: 'Failed to create flashcard' });
  }
});

// Get flashcards for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    const { deckId, tags, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('flashcards')
      .select(`
        *,
        flashcard_spaced_repetition(*),
        flashcard_decks(name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : [tags];
      query = query.overlaps('tags', tagsArray);
    }

    const { data: flashcards, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ flashcards });
  } catch (error: any) {
    console.error('Error fetching flashcards:', error);
    res.status(500).json({ error: 'Failed to fetch flashcards' });
  }
});

// Get flashcard by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .select(`
        *,
        flashcard_spaced_repetition(*),
        flashcard_decks(name)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }

    res.json({ flashcard });
  } catch (error: any) {
    console.error('Error fetching flashcard:', error);
    res.status(500).json({ error: 'Failed to fetch flashcard' });
  }
});

// Update flashcard
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { front, back, imageUrl, occlusionData, tags, deckId, difficulty, isActive } = req.body;

    const { data: flashcard, error } = await supabase
      .from('flashcards')
      .update({
        front,
        back,
        image_url: imageUrl,
        occlusion_data: occlusionData,
        tags,
        deck_id: deckId,
        difficulty,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ flashcard });
  } catch (error: any) {
    console.error('Error updating flashcard:', error);
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
});

// Delete flashcard
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('flashcards')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Flashcard deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting flashcard:', error);
    res.status(500).json({ error: 'Failed to delete flashcard' });
  }
});

// ========================================
// DECKS OPERATIONS
// ========================================

// Create a new deck
router.post('/decks', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Deck name is required' });
    }

    const deckId = uuidv4();

    const { data: deck, error } = await supabase
      .from('flashcard_decks')
      .insert({
        id: deckId,
        user_id: userId,
        name,
        description,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ deck });
  } catch (error: any) {
    console.error('Error creating deck:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Get all decks for a user
router.get('/decks', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { data: decks, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ decks });
  } catch (error: any) {
    console.error('Error fetching decks:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// ========================================
// STUDY SESSION OPERATIONS
// ========================================

// Start a study session
router.post('/sessions/start', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { sessionType, deckId } = req.body;

    const sessionId = uuidv4();

    const { data: session, error } = await supabase
      .from('flashcard_study_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        session_type: sessionType || 'mixed',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// End a study session
router.put('/sessions/:id/end', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { cardsReviewed, cardsCorrect, totalResponseTime } = req.body;

    const { data: session, error } = await supabase
      .from('flashcard_study_sessions')
      .update({
        end_time: new Date().toISOString(),
        cards_reviewed: cardsReviewed,
        cards_correct: cardsCorrect,
        total_response_time: totalResponseTime,
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ session });
  } catch (error: any) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// ========================================
// REVIEW OPERATIONS
// ========================================

// Get cards due for review
router.get('/review/due', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { limit = 20, deckId } = req.query;

    // Get cards with next review date <= now
    let query = supabase
      .from('flashcard_progress')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', new Date().toISOString())
      .limit(Number(limit));

    if (deckId) {
      // This would need a join or different approach
      // For now, we'll filter in memory
    }

    const { data: cards, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ cards });
  } catch (error: any) {
    console.error('Error fetching due cards:', error);
    res.status(500).json({ error: 'Failed to fetch due cards' });
  }
});

// Get new cards for learning
router.get('/review/new', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { limit = 10, deckId } = req.query;

    // Get cards with review_count = 0
    const { data: cards, error } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('review_count', 0)
      .limit(Number(limit));

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ cards });
  } catch (error: any) {
    console.error('Error fetching new cards:', error);
    res.status(500).json({ error: 'Failed to fetch new cards' });
  }
});

// Submit a review result
router.post('/review/submit', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const {
      flashcardId,
      sessionId,
      quality,
      responseTime,
      reviewType = 'review',
    } = req.body;

    if (!flashcardId || quality === undefined || responseTime === undefined) {
      return res.status(400).json({
        error: 'flashcardId, quality, and responseTime are required',
      });
    }

    // Record the review
    const reviewId = uuidv4();
    const { error: reviewError } = await supabase
      .from('flashcard_reviews')
      .insert({
        id: reviewId,
        flashcard_id: flashcardId,
        user_id: userId,
        session_id: sessionId,
        quality,
        response_time: responseTime,
        review_type: reviewType,
      });

    if (reviewError) {
      return res.status(500).json({ error: reviewError.message });
    }

    // Get current spaced repetition data
    const { data: currentSR, error: srFetchError } = await supabase
      .from('flashcard_spaced_repetition')
      .select('*')
      .eq('flashcard_id', flashcardId)
      .single();

    if (srFetchError) {
      return res.status(500).json({ error: srFetchError.message });
    }

    // Calculate next review using SM-2 algorithm
    const result = {
      quality: Number(quality),
      responseTime: Number(responseTime),
      timestamp: Date.now(),
    };

    const updatedSR = calculateNextReview(currentSR, result);

    // Update spaced repetition data
    const { data: updatedData, error: updateError } = await supabase
      .from('flashcard_spaced_repetition')
      .update({
        easiness_factor: updatedSR.easinessFactor,
        interval_days: updatedSR.interval,
        repetitions: updatedSR.repetitions,
        next_review_date: new Date(updatedSR.nextReviewDate).toISOString(),
        last_reviewed_at: new Date().toISOString(),
        review_count: currentSR.review_count + 1,
        correct_count: updatedSR.correctReviews,
        average_response_time: updatedSR.averageResponseTime,
        updated_at: new Date().toISOString(),
      })
      .eq('flashcard_id', flashcardId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({
      review: { id: reviewId },
      spacedRepetition: updatedData,
    });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get study queue (due cards + new cards)
router.get('/study-queue', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { deckId } = req.query;

    // Get due cards
    const { data: dueCards, error: dueError } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('user_id', userId)
      .lte('next_review_date', new Date().toISOString());

    if (dueError) {
      return res.status(500).json({ error: dueError.message });
    }

    // Get new cards
    const { data: newCards, error: newError } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('review_count', 0);

    if (newError) {
      return res.status(500).json({ error: newError.message });
    }

    res.json({
      dueCards: dueCards || [],
      newCards: newCards || [],
      totalCount: (dueCards?.length || 0) + (newCards?.length || 0),
      reviewCount: dueCards?.length || 0,
      newCount: newCards?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching study queue:', error);
    res.status(500).json({ error: 'Failed to fetch study queue' });
  }
});

// ========================================
// ANALYTICS & PROGRESS
// ========================================

// Get flashcard progress for a user
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { data: progress, error } = await supabase
      .from('flashcard_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Calculate summary statistics
    const totalCards = progress?.length || 0;
    const matureCards = progress?.filter(c => c.interval_days >= 21).length || 0;
    const learningCards = progress?.filter(c => c.repetitions === 0).length || 0;
    const youngCards = progress?.filter(c => c.interval_days < 21 && c.repetitions > 0).length || 0;

    const totalReviews = progress?.reduce((sum, c) => sum + c.review_count, 0) || 0;
    const totalCorrect = progress?.reduce((sum, c) => sum + c.correct_count, 0) || 0;

    const averageEasiness = totalCards > 0
      ? progress!.reduce((sum, c) => sum + c.easiness_factor, 0) / totalCards
      : 0;

    const retentionRate = totalReviews > 0
      ? (totalCorrect / totalReviews) * 100
      : 0;

    res.json({
      progress: progress || [],
      summary: {
        totalCards,
        matureCards,
        learningCards,
        youngCards,
        averageEasiness: Math.round(averageEasiness * 100) / 100,
        retentionRate: Math.round(retentionRate),
      },
    });
  } catch (error: any) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get study sessions for a user
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = TEST_USER_ID;

    const { limit = 20, offset = 0 } = req.query;

    const { data: sessions, error } = await supabase
      .from('flashcard_study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Helper function: SM-2 Algorithm for calculating next review
function calculateNextReview(
  currentSR: any,
  result: { quality: number; responseTime: number; timestamp: number }
): any {
  let { easiness_factor, interval_days, repetitions } = currentSR;

  // If quality is 0-2, reset repetition count
  if (result.quality < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    // If quality is 3+, increment repetition count
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * easiness_factor);
    }
    repetitions += 1;
  }

  // Update easiness factor
  easiness_factor = easiness_factor + (0.1 - (5 - result.quality) * (0.08 + (5 - result.quality) * 0.02));

  // Ensure easiness factor doesn't go below 1.3
  if (easiness_factor < 1.3) {
    easiness_factor = 1.3;
  }

  // Calculate next review date
  const nextReviewDate = Date.now() + interval_days * 24 * 60 * 60 * 1000;

  // Calculate correct count
  const correctCount = result.quality >= 3 ? currentSR.correct_count + 1 : currentSR.correct_count;

  // Calculate average response time
  const totalResponseTime = currentSR.review_count * currentSR.average_response_time + result.responseTime;
  const totalReviews = currentSR.review_count + 1;
  const averageResponseTime = totalResponseTime / totalReviews;

  return {
    easinessFactor: easiness_factor,
    interval: interval_days,
    repetitions,
    nextReviewDate,
    correctReviews: correctCount,
    averageResponseTime,
  };
}

export default router;
