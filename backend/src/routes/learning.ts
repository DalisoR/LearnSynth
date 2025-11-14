/**
 * Learning Routes
 * API endpoints for adaptive learning, chapters, quizzes, and progress tracking
 */

import { Router } from 'express';
import { adaptivePdfParser } from '../services/learning/adaptivePdfParser';
import { chapterManager } from '../services/learning/chapterManager';
import { aiQuizEngine } from '../services/learning/aiQuizEngine';
import { userProgressService } from '../services/learning/userProgress';
import { enhancedLessonGenerator } from '../services/learning/enhancedLessonGenerator';
import { supabase } from '../services/supabase';

const router = Router();

// Upload and parse PDF document
router.post('/upload', async (req, res) => {
  try {
    const { documentId, buffer } = req.body;

    if (!documentId || !buffer) {
      return res.status(400).json({ error: 'documentId and buffer are required' });
    }

    console.log(`📄 Parsing PDF for document: ${documentId}`);
    const parsedDoc = await adaptivePdfParser.parsePdf(
      Buffer.from(buffer, 'base64'),
      documentId
    );

    // Store chapters in database
    const chaptersToInsert = parsedDoc.chapters.map(chapter => ({
      id: chapter.id,
      document_id: documentId,
      chapter_number: chapter.chapterNumber,
      title: chapter.title,
      content: chapter.content,
      word_count: chapter.wordCount,
      key_topics: JSON.stringify(chapter.keyTopics),
      estimated_read_time: chapter.estimatedReadTime,
      difficulty: chapter.difficulty,
      prerequisites: JSON.stringify(chapter.prerequisites),
      summary: chapter.summary,
      section_count: chapter.sectionCount,
      created_at: new Date()
    }));

    const { error } = await supabase
      .from('chapters')
      .upsert(chaptersToInsert);

    if (error) {
      throw error;
    }

    console.log(`✅ Successfully parsed ${parsedDoc.totalChapters} chapters`);

    res.json({
      success: true,
      document: parsedDoc
    });

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all chapters for a document
router.get('/chapters/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const chapters = await chapterManager.getChapterList(documentId, userId as string);

    res.json({
      success: true,
      chapters
    });

  } catch (error: any) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific chapter content
router.get('/chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const chapter = await chapterManager.getChapterContent(
      chapterId,
      userId as string
    );

    res.json({
      success: true,
      chapter
    });

  } catch (error: any) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chapter navigation
router.get('/navigation/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const navigation = await chapterManager.getChapterNavigation(
      chapterId,
      userId as string
    );

    res.json({
      success: true,
      navigation
    });

  } catch (error: any) {
    console.error('Error fetching navigation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate quiz for a chapter
router.post('/quiz/generate', async (req, res) => {
  try {
    const { chapterId, questionCount, adaptive, passMark } = req.body;

    if (!chapterId) {
      return res.status(400).json({ error: 'chapterId is required' });
    }

    console.log(`🎯 Generating quiz for chapter: ${chapterId}`);
    const quiz = await aiQuizEngine.generateQuiz(
      chapterId,
      questionCount || 10,
      adaptive !== false,
      passMark
    );

    res.json({
      success: true,
      quiz
    });

  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit quiz answers
router.post('/quiz/submit', async (req, res) => {
  try {
    const { quizId, userId, answers, timeSpent } = req.body;

    if (!quizId || !userId || !answers) {
      return res.status(400).json({ error: 'quizId, userId, and answers are required' });
    }

    // Get quiz
    const quiz = await aiQuizEngine.getQuiz(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Grade quiz
    const result = aiQuizEngine.gradeQuiz(quiz, answers);
    result.userId = userId;
    result.timeSpent = timeSpent || 0;

    // Save result
    await aiQuizEngine.saveQuizResult(result);

    // Update user progress
    await userProgressService.recordQuizAttempt(
      userId,
      quiz.chapterId,
      quizId,
      result.score,
      result.totalPoints,
      result.earnedPoints,
      result.timeSpent,
      result.answers
    );

    // Mark chapter as completed if passed
    if (result.passed) {
      await chapterManager.completeChapter(
        userId,
        quiz.chapterId,
        result.score,
        quiz.passMark
      );
    }

    console.log(`✅ Quiz submitted - Score: ${result.score}%, Passed: ${result.passed}`);

    res.json({
      success: true,
      result
    });

  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user progress for a chapter
router.get('/progress/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const progress = await userProgressService.getChapterProgress(
      userId as string,
      chapterId
    );

    res.json({
      success: true,
      progress
    });

  } catch (error: any) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update reading progress
router.post('/progress/update', async (req, res) => {
  try {
    const { userId, chapterId, progressPercent } = req.body;

    if (!userId || !chapterId || progressPercent === undefined) {
      return res.status(400).json({ error: 'userId, chapterId, and progressPercent are required' });
    }

    const updated = await userProgressService.updateReadingProgress(
      userId,
      chapterId,
      progressPercent
    );

    res.json({
      success: true,
      progress: updated
    });

  } catch (error: any) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user analytics
router.get('/analytics/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const analytics = await userProgressService.getUserAnalytics(
      userId as string,
      documentId
    );

    res.json({
      success: true,
      analytics
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get learning streak
router.get('/streak', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const streak = await userProgressService.getLearningStreak(userId as string);

    res.json({
      success: true,
      streak
    });

  } catch (error: any) {
    console.error('Error fetching streak:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get weak areas
router.get('/weak-areas', async (req, res) => {
  try {
    const { userId, documentId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const weakAreas = await userProgressService.getWeakAreas(
      userId as string,
      documentId as string | undefined
    );

    res.json({
      success: true,
      weakAreas
    });

  } catch (error: any) {
    console.error('Error fetching weak areas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get next chapter
router.get('/next-chapter', async (req, res) => {
  try {
    const { documentId, currentChapterId, userId } = req.query;

    if (!documentId || !currentChapterId || !userId) {
      return res.status(400).json({ error: 'documentId, currentChapterId, and userId are required' });
    }

    const nextChapter = await chapterManager.getNextChapter(
      documentId as string,
      currentChapterId as string,
      userId as string
    );

    res.json({
      success: true,
      chapter: nextChapter
    });

  } catch (error: any) {
    console.error('Error fetching next chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check if chapter is unlocked
router.get('/check-unlocked/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const isUnlocked = await chapterManager.isChapterUnlocked(
      userId as string,
      chapterId
    );

    res.json({
      success: true,
      isUnlocked
    });

  } catch (error: any) {
    console.error('Error checking chapter unlock status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate contextual quiz from content text
router.post('/generate-quiz', async (req, res) => {
  try {
    const { content, questionCount } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    console.log('🎯 Generating contextual quiz from content...');

    // Generate quiz questions using AI based on the content
    const questions = await aiQuizEngine.generateQuizFromContent(
      content,
      questionCount || 1
    );

    res.json({
      success: true,
      questions
    });

  } catch (error: any) {
    console.error('Error generating contextual quiz:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ask question to AI teaching assistant
router.post('/ask-question', async (req, res) => {
  try {
    const { question, chapterId, userId } = req.body;

    if (!question || !chapterId || !userId) {
      return res.status(400).json({ error: 'question, chapterId, and userId are required' });
    }

    const { aiTeachingAssistant } = await import('../services/learning/aiTeachingAssistant');
    const message = await aiTeachingAssistant.answerQuestion(question, chapterId, userId, null);

    res.json({
      success: true,
      message
    });

  } catch (error: any) {
    console.error('Error answering question:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start study session
router.post('/start-session', async (req, res) => {
  try {
    const { userId, chapterId } = req.body;

    if (!userId || !chapterId) {
      return res.status(400).json({ error: 'userId and chapterId are required' });
    }

    const { aiTeachingAssistant } = await import('../services/learning/aiTeachingAssistant');
    const session = await aiTeachingAssistant.startStudySession(userId, chapterId);

    res.json({
      success: true,
      session
    });

  } catch (error: any) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get learning analytics
router.get('/analytics/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { learningAnalytics } = await import('../services/learning/learningAnalytics');
    const insights = await learningAnalytics.generateInsights(userId as string);
    const recommendations = await learningAnalytics.getRecommendations(userId as string);

    res.json({
      success: true,
      insights,
      recommendations
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate AI-enhanced lesson with teaching styles
router.post('/generate-enhanced-lesson', async (req, res) => {
  try {
    const { chapterId, chapterTitle, chapterContent, teachingStyle } = req.body;

    if (!chapterId || !chapterContent) {
      return res.status(400).json({ error: 'chapterId and chapterContent are required' });
    }

    console.log(`🎓 Generating AI-enhanced lesson with ${teachingStyle || 'direct'} style...`);

    const enhancedLesson = await enhancedLessonGenerator.generateEnhancedLesson(
      chapterId,
      chapterTitle || 'Chapter',
      chapterContent,
      (teachingStyle as 'socratic' | 'direct' | 'constructivist' | 'encouraging') || 'direct'
    );

    res.json({
      success: true,
      lesson: enhancedLesson,
      teachingStyle: teachingStyle || 'direct'
    });

  } catch (error: any) {
    console.error('Error generating enhanced lesson:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get enhanced chapter content
router.get('/enhanced-chapter/:chapterId', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { userId, teachingStyle } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get chapter content
    const chapter = await chapterManager.getChapterContent(
      chapterId,
      userId as string
    );

    // Generate AI-enhanced version
    console.log(`🎓 Generating AI-enhanced content for chapter: ${chapterId}`);
    const enhancedLesson = await enhancedLessonGenerator.generateEnhancedLesson(
      chapterId,
      chapter.title || 'Chapter',
      chapter.content,
      (teachingStyle as 'socratic' | 'direct' | 'constructivist' | 'encouraging') || 'direct'
    );

    res.json({
      success: true,
      originalChapter: chapter,
      enhancedLesson,
      teachingStyle: teachingStyle || 'direct'
    });

  } catch (error: any) {
    console.error('Error fetching enhanced chapter:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;