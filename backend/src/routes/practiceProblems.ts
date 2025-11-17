import express, { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import aiPracticeProblemsService from '../services/learning/aiPracticeProblemsService';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ========================================
// PROBLEM GENERATION
// ========================================

// Generate AI practice problems
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { topic, subtopic, difficultyLevel, problemType, count, subject, learningObjectives, context } =
      req.body;

    if (!topic || !difficultyLevel || !problemType || !count) {
      return res.status(400).json({
        error: 'topic, difficultyLevel, problemType, and count are required',
      });
    }

    // Generate problems using AI service
    const generatedProblems = await aiPracticeProblemsService.generateProblems(userId, {
      topic,
      subtopic,
      difficultyLevel,
      problemType,
      count,
      subject,
      learningObjectives,
      context,
    });

    // Save problems to database
    const problemsToSave = generatedProblems.map((problem) => ({
      id: problem.id,
      user_id: userId,
      subject_id: problem.subjectId || null,
      topic: problem.topic,
      subtopic: problem.subtopic || null,
      difficulty_level: problem.difficultyLevel,
      problem_type: problem.problemType,
      question: problem.question,
      question_data: problem.questionData,
      correct_answer: problem.correctAnswer,
      incorrect_options: problem.incorrectOptions || [],
      explanation: problem.explanation,
      hints: problem.hints || [],
      tags: problem.tags || [],
      points: problem.points,
      estimated_time: problem.estimatedTime,
      ai_generated: problem.aiGenerated,
      generation_context: problem.generationContext,
    }));

    const { data: savedProblems, error: saveError } = await supabase
      .from('practice_problems')
      .insert(problemsToSave)
      .select();

    if (saveError) {
      return res.status(500).json({ error: saveError.message });
    }

    res.status(201).json({ problems: savedProblems });
  } catch (error: any) {
    console.error('Error generating problems:', error);
    res.status(500).json({ error: 'Failed to generate problems' });
  }
});

// Generate personalized practice set
router.post('/generate-personalized', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { subjectId, targetSkills, count } = req.body;

    if (!subjectId || !targetSkills) {
      return res.status(400).json({ error: 'subjectId and targetSkills are required' });
    }

    const personalizedSet = await aiPracticeProblemsService.generatePersonalizedSet(
      userId,
      subjectId,
      targetSkills
    );

    // Save problems to database
    const problemsToSave = personalizedSet.problems.map((problem) => ({
      id: problem.id,
      user_id: userId,
      subject_id: subjectId,
      topic: problem.topic,
      subtopic: problem.subtopic || null,
      difficulty_level: problem.difficultyLevel,
      problem_type: problem.problemType,
      question: problem.question,
      question_data: problem.questionData,
      correct_answer: problem.correctAnswer,
      incorrect_options: problem.incorrectOptions || [],
      explanation: problem.explanation,
      hints: problem.hints || [],
      tags: problem.tags || [],
      points: problem.points,
      estimated_time: problem.estimatedTime,
      ai_generated: problem.aiGenerated,
      generation_context: problem.generationContext,
    }));

    const { data: savedProblems, error: saveError } = await supabase
      .from('practice_problems')
      .insert(problemsToSave)
      .select();

    if (saveError) {
      return res.status(500).json({ error: saveError.message });
    }

    res.status(201).json({
      problems: savedProblems,
      sessionPlan: personalizedSet.sessionPlan,
    });
  } catch (error: any) {
    console.error('Error generating personalized set:', error);
    res.status(500).json({ error: 'Failed to generate personalized problems' });
  }
});

// ========================================
// PRACTICE SESSIONS
// ========================================

// Create a new practice session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { title, subjectId, topic, difficultyLevel, sessionType } = req.body;

    const sessionId = uuidv4();

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        title,
        subject_id: subjectId || null,
        topic,
        difficulty_level: difficultyLevel || 50,
        session_type: sessionType || 'practice',
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get user's practice sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { limit = 20, offset = 0 } = req.query;

    const { data: sessions, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
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

// Get a specific practice session
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session problems
    const { data: problems } = await supabase
      .from('practice_problems')
      .select('*')
      .eq('user_id', userId);

    res.json({ session, problems });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Complete a practice session
router.put('/sessions/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: session, error } = await supabase
      .from('practice_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
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
    console.error('Error completing session:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// ========================================
// PROBLEMS & ATTEMPTS
// ========================================

// Get user's practice problems
router.get('/problems', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { topic, subjectId, difficultyLevel, problemType, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('practice_problems')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (topic) {
      query = query.eq('topic', topic);
    }
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (difficultyLevel) {
      query = query.eq('difficulty_level', difficultyLevel);
    }
    if (problemType) {
      query = query.eq('problem_type', problemType);
    }

    const { data: problems, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ problems });
  } catch (error: any) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Submit an answer to a problem
router.post('/attempts', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { problemId, sessionId, userAnswer, timeSpent, hintsUsed } = req.body;

    if (!problemId || userAnswer === undefined || timeSpent === undefined) {
      return res.status(400).json({
        error: 'problemId, userAnswer, and timeSpent are required',
      });
    }

    // Get the problem to check answer
    const { data: problem, error: problemError } = await supabase
      .from('practice_problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // Evaluate answer
    const evaluation = await aiPracticeProblemsService.evaluateAnswer(problem, userAnswer);

    // Record the attempt
    const attemptId = uuidv4();
    const { data: attempt, error: attemptError } = await supabase
      .from('practice_attempts')
      .insert({
        id: attemptId,
        problem_id: problemId,
        user_id: userId,
        session_id: sessionId || null,
        user_answer: userAnswer,
        is_correct: evaluation.isCorrect,
        time_spent: timeSpent,
        hints_used: hintsUsed || 0,
      })
      .select()
      .single();

    if (attemptError) {
      return res.status(500).json({ error: attemptError.message });
    }

    res.status(201).json({
      attempt,
      evaluation: {
        isCorrect: evaluation.isCorrect,
        score: evaluation.score,
        feedback: evaluation.feedback,
        correctAnswer: problem.correctAnswer,
        explanation: problem.explanation,
      },
    });
  } catch (error: any) {
    console.error('Error submitting attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

// Get attempts for a specific problem
router.get('/problems/:problemId/attempts', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { problemId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: attempts, error } = await supabase
      .from('practice_attempts')
      .select('*')
      .eq('problem_id', problemId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ attempts });
  } catch (error: any) {
    console.error('Error fetching attempts:', error);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

// ========================================
// ANALYTICS & PERFORMANCE
// ========================================

// Get user's practice performance
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { topic, subjectId, timeframe = '30d' } = req.query;

    // Calculate date filter
    const now = new Date();
    const daysAgo = parseInt(timeframe as string);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    let query = supabase
      .from('practice_attempts')
      .select(`
        *,
        practice_problems!inner(topic, subject_id, difficulty_level)
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (topic) {
      query = query.eq('practice_problems.topic', topic);
    }
    if (subjectId) {
      query = query.eq('practice_problems.subject_id', subjectId);
    }

    const { data: attempts, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Calculate metrics
    const totalAttempts = attempts?.length || 0;
    const correctAttempts = attempts?.filter((a) => a.is_correct).length || 0;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    const averageTime =
      attempts && attempts.length > 0
        ? attempts.reduce((sum, a) => sum + a.time_spent, 0) / attempts.length
        : 0;

    // Group by topic
    const topicStats: { [key: string]: any } = {};
    attempts?.forEach((attempt) => {
      const topic = attempt.practice_problems.topic;
      if (!topicStats[topic]) {
        topicStats[topic] = {
          topic,
          totalAttempts: 0,
          correctAttempts: 0,
          averageTime: 0,
        };
      }
      topicStats[topic].totalAttempts++;
      if (attempt.is_correct) {
        topicStats[topic].correctAttempts++;
      }
      topicStats[topic].averageTime += attempt.time_spent;
    });

    // Calculate topic accuracy
    Object.values(topicStats).forEach((stat: any) => {
      stat.accuracy =
        stat.totalAttempts > 0
          ? Math.round((stat.correctAttempts / stat.totalAttempts) * 100)
          : 0;
      stat.averageTime = Math.round(stat.averageTime / stat.totalAttempts);
    });

    res.json({
      summary: {
        totalAttempts,
        correctAttempts,
        accuracy: Math.round(accuracy),
        averageTime: Math.round(averageTime),
      },
      topicStats: Object.values(topicStats),
    });
  } catch (error: any) {
    console.error('Error fetching performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// Get knowledge point mastery
router.get('/mastery/:userId?', async (req: Request, res: Response) => {
  try {
    const { userId: paramUserId } = req.params;
    const { userId: queryUserId, subjectId, topic } = req.query;

    // Use userId from params, query, or fallback to a default for testing
    const userId = (paramUserId || queryUserId || '00000000-0000-0000-0000-000000000000') as string;

    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    let query = supabase
      .from('knowledge_point_mastery')
      .select('*')
      .eq('user_id', userId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId as string);
    }
    if (topic) {
      query = query.eq('topic', topic as string);
    }

    const { data: mastery, error } = await query.order('mastery_score', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ mastery });
  } catch (error: any) {
    console.error('Error fetching mastery:', error);
    res.status(500).json({ error: 'Failed to fetch mastery' });
  }
});

// Get problem recommendations
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user ID for development

    const { topic, subjectId } = req.query;

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // Get current mastery
    const { data: mastery, error: masteryError } = await supabase
      .from('knowledge_point_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (masteryError && masteryError.code !== 'PGRST116') {
      return res.status(500).json({ error: masteryError.message });
    }

    const currentMastery = mastery?.mastery_score || 30;
    const recommendations = await aiPracticeProblemsService.recommendProblems(
      userId,
      topic,
      currentMastery
    );

    res.json({
      currentMastery,
      recommendations,
    });
  } catch (error: any) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ========================================
// PROBLEM TEMPLATES
// ========================================

// Get problem templates (admin only)
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { topic, problemType, difficultyLevel } = req.query;

    let query = supabase.from('practice_problem_templates').select('*');

    if (topic) {
      query = query.eq('topic', topic);
    }
    if (problemType) {
      query = query.eq('problem_type', problemType);
    }
    if (difficultyLevel) {
      query = query.eq('difficulty_level', difficultyLevel);
    }

    const { data: templates, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ templates });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create a problem from template
router.post('/from-template/:templateId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { templateId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customizations } = req.body;

    const problem = await aiPracticeProblemsService.createFromTemplate(
      userId,
      templateId,
      customizations
    );

    // Save to database
    const { data: savedProblem, error } = await supabase
      .from('practice_problems')
      .insert({
        id: problem.id,
        user_id: userId,
        subject_id: problem.subjectId || null,
        topic: problem.topic,
        subtopic: problem.subtopic || null,
        difficulty_level: problem.difficultyLevel,
        problem_type: problem.problemType,
        question: problem.question,
        question_data: problem.questionData,
        correct_answer: problem.correctAnswer,
        incorrect_options: problem.incorrectOptions || [],
        explanation: problem.explanation,
        hints: problem.hints || [],
        tags: problem.tags || [],
        points: problem.points,
        estimated_time: problem.estimatedTime,
        ai_generated: problem.aiGenerated,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ problem: savedProblem });
  } catch (error: any) {
    console.error('Error creating from template:', error);
    res.status(500).json({ error: 'Failed to create problem from template' });
  }
});

export default router;
