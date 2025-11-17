import { Router } from 'express';
import { supabase } from '../services/supabase';
import logger from '../utils/logger';

const router = Router();

const userId = '00000000-0000-0000-0000-000000000000';

// Get KB usage analytics
router.get('/kb/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;

    // Get enhanced lessons using this KB
    const { data: lessons, error: lessonsError } = await supabase
      .from('enhanced_lessons')
      .select('id, created_at, view_count, last_accessed, teaching_style')
      .eq('chapter_id', id)
      .order('created_at', { ascending: false });

    if (lessonsError) throw lessonsError;

    // Get document count
    const { data: docLinks, error: docError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (docError) throw docError;

    const documentCount = docLinks?.length || 0;
    const documentIds = docLinks?.map(link => link.document_id) || [];

    // Get chapter count
    let chapterCount = 0;
    if (documentIds.length > 0) {
      const { data: chapters, error: chapterError } = await supabase
        .from('chapters')
        .select('id', { count: 'exact' })
        .in('document_id', documentIds);

      if (chapterError) throw chapterError;
      chapterCount = chapters?.length || 0;
    }

    // Get search queries for this KB (mock data for now)
    const searchQueries = [
      { query: 'What is machine learning?', count: 15 },
      { query: 'Explain neural networks', count: 12 },
      { query: 'Deep learning basics', count: 8 },
    ];

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLessons = lessons?.filter(
      lesson => new Date(lesson.created_at) >= thirtyDaysAgo
    ) || [];

    res.json({
      subjectId: id,
      totalLessons: lessons?.length || 0,
      totalDocuments: documentCount,
      totalChapters: chapterCount,
      totalViews: lessons?.reduce((sum, l) => sum + (l.view_count || 0), 0) || 0,
      recentActivity: {
        lessonsGenerated: recentLessons.length,
        averageViews: recentLessons.length > 0
          ? recentLessons.reduce((sum, l) => sum + (l.view_count || 0), 0) / recentLessons.length
          : 0,
      },
      searchQueries,
      teachingStyleDistribution: lessons?.reduce((acc: any, lesson) => {
        acc[lesson.teaching_style] = (acc[lesson.teaching_style] || 0) + 1;
        return acc;
      }, {}) || {},
      timeline: lessons?.map(lesson => ({
        date: lesson.created_at,
        views: lesson.view_count || 0,
        teachingStyle: lesson.teaching_style
      })) || [],
    });
  } catch (error) {
    logger.error('Error fetching KB usage analytics:', error);
    res.status(500).json({ error: 'Failed to fetch KB usage analytics' });
  }
});

// Get KB popular content
router.get('/kb/:id/popular-content', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document-subject links
    const { data: docLinks, error: linkError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (linkError) throw linkError;

    const documentIds = docLinks?.map(link => link.document_id) || [];

    // Get documents with their view counts
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('id, title, file_type, created_at, metadata')
      .in('id', documentIds);

    if (docsError) throw docsError;

    // Get chapters for each document
    const documentsWithChapters = await Promise.all(
      (documents || []).map(async (doc) => {
        const { data: chapters, error: chaptersError } = await supabase
          .from('chapters')
          .select('id, title, chapter_number')
          .eq('document_id', doc.id)
          .order('chapter_number', { ascending: true });

        if (chaptersError) throw chaptersError;

        // Get enhanced lessons for these chapters
        const chapterIds = chapters?.map(ch => ch.id) || [];
        let totalViews = 0;
        let lessonsCount = 0;

        if (chapterIds.length > 0) {
          const { data: lessons, error: lessonsError } = await supabase
            .from('enhanced_lessons')
            .select('view_count')
            .in('chapter_id', chapterIds);

          if (!lessonsError && lessons) {
            totalViews = lessons.reduce((sum, l) => sum + (l.view_count || 0), 0);
            lessonsCount = lessons.length;
          }
        }

        return {
          ...doc,
          chapters: chapters || [],
          totalViews,
          lessonsCount,
          averageViews: lessonsCount > 0 ? totalViews / lessonsCount : 0
        };
      })
    );

    // Sort by total views
    documentsWithChapters.sort((a, b) => b.totalViews - a.totalViews);

    res.json({
      subjectId: id,
      documents: documentsWithChapters
    });
  } catch (error) {
    logger.error('Error fetching popular content:', error);
    res.status(500).json({ error: 'Failed to fetch popular content' });
  }
});

// Get KB embeddings stats
router.get('/kb/:id/embeddings-stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Get document-subject links
    const { data: docLinks, error: linkError } = await supabase
      .from('document_subjects')
      .select('document_id')
      .eq('subject_id', id);

    if (linkError) throw linkError;

    const documentIds = docLinks?.map(link => link.document_id) || [];
    const chapterIds = docLinks?.map(link => link.document_id) || [];

    let embeddingsCount = 0;
    let totalChunks = 0;

    if (documentIds.length > 0) {
      // Get chapters for these documents
      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('id, content')
        .in('document_id', documentIds);

      if (chaptersError) throw chaptersError;

      totalChunks = chapters?.length || 0;

      // Count embeddings
      const chapterIdList = chapters?.map(ch => ch.id) || [];
      if (chapterIdList.length > 0) {
        const { count, error: countError } = await supabase
          .from('embeddings')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', id)
          .in('chapter_id', chapterIdList);

        if (!countError) {
          embeddingsCount = count || 0;
        }
      }
    }

    // Calculate coverage
    const coverage = totalChunks > 0 ? (embeddingsCount / totalChunks) * 100 : 0;

    res.json({
      subjectId: id,
      totalDocuments: documentIds.length,
      totalChunks,
      totalEmbeddings: embeddingsCount,
      coverage: Math.round(coverage * 100) / 100,
      status: coverage === 100 ? 'complete' : coverage > 0 ? 'partial' : 'empty'
    });
  } catch (error) {
    logger.error('Error fetching embeddings stats:', error);
    res.status(500).json({ error: 'Failed to fetch embeddings stats' });
  }
});

export default router;
