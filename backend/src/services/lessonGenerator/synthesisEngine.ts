import { LessonStructure, Topic, SynthesisResult, CrossReference, ConsensusArea, ConflictArea, SourceAttribution } from './types';
import { ContextResult } from '../rag/types';
import { llmService } from '../llm/factory';

export class CrossBookSynthesisEngine {
  async synthesizeKnowledge(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<SynthesisResult> {
    // Identify cross-references
    const crossReferences = await this.identifyCrossReferences(lesson, context);

    // Find consensus areas
    const consensusAreas = await this.findConsensusAreas(lesson, context);

    // Identify and reconcile conflicts
    const conflicts = await this.reconcileConflicts(lesson, context);

    // Generate source attribution
    const sourceAttribution = await this.generateSourceAttribution(context);

    return {
      baseLesson: lesson,
      crossReferences,
      consensusAreas,
      conflicts,
      sourceAttribution
    };
  }

  private async identifyCrossReferences(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<CrossReference[]> {
    const crossRefs: CrossReference[] = [];

    for (const topic of lesson.topics) {
      // For each concept in the topic, find references in other documents
      const conceptRefs = await this.findConceptReferences(topic.title, context);

      if (conceptRefs.length > 0) {
        crossRefs.push({
          concept: topic.title,
          references: conceptRefs
        });
      }

      // Also check for related concepts
      for (const related of topic.relatedConcepts) {
        const relatedRefs = await this.findConceptReferences(related, context);
        if (relatedRefs.length > 0) {
          crossRefs.push({
            concept: related,
            references: relatedRefs
          });
        }
      }
    }

    return crossRefs;
  }

  private async findConceptReferences(
    concept: string,
    context: ContextResult
  ): Promise<CrossReference['references']> {
    const references = [];

    // Find all chunks that mention this concept
    const relevantChunks = context.chunks.filter(chunk =>
      chunk.content.toLowerCase().includes(concept.toLowerCase())
    );

    // Group by document
    const docMap = new Map<string, any[]>();
    relevantChunks.forEach(chunk => {
      const docId = chunk.metadata.documentId;
      if (!docMap.has(docId)) {
        docMap.set(docId, []);
      }
      docMap.get(docId)!.push(chunk);
    });

    // Create references for documents that have the concept
    docMap.forEach((chunks, docId) => {
      const docName = chunks[0].metadata.documentName;
      const avgRelevance = chunks.reduce((sum, c) => sum + c.metadata.relevanceScore, 0) / chunks.length;

      references.push({
        sourceDocumentId: docId,
        sourceName: docName,
        chapter: chunks[0].metadata.chapter,
        relevance: avgRelevance
      });
    });

    return references.sort((a, b) => b.relevance - a.relevance);
  }

  private async findConsensusAreas(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<ConsensusArea[]> {
    const consensus: ConsensusArea[] = [];

    // Use the consensus information from context
    if (context.consensus && context.consensus.length > 0) {
      for (const consensusItem of context.consensus) {
        const synthesis = await this.synthesizeConsensus(consensusItem, lesson);

        consensus.push({
          concept: consensusItem.concept,
          sources: consensusItem.sources,
          synthesis
        });
      }
    }

    // Also look for natural consensus areas in the lesson structure
    const naturalConsensus = await this.findNaturalConsensus(lesson, context);
    consensus.push(...naturalConsensus);

    return consensus;
  }

  private async synthesizeConsensus(
    consensusItem: any,
    lesson: LessonStructure
  ): Promise<string> {
    const synthesisPrompt = `
      Create a unified explanation for the concept "${consensusItem.concept}" based on agreement across multiple sources.

      Source perspectives:
      ${consensusItem.sources.map((s: any) => `- ${s.documentName}: ${s.claim}`).join('\n')}

      Write a synthesis that:
      1. States what the sources agree on
      2. Explains why this consensus is significant
      3. Presents it as a unified understanding
      4. Is 2-3 sentences

      Keep it clear and authoritative.
    `;

    try {
      const response = await llmService.complete({
        prompt: synthesisPrompt,
        maxTokens: 300
      });

      return response;
    } catch (error) {
      console.error('Error synthesizing consensus:', error);
      return `There is strong agreement across multiple sources about ${consensusItem.concept}.`;
    }
  }

  private async findNaturalConsensus(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<ConsensusArea[]> {
    // Find areas where multiple sources naturally align
    const consensus: ConsensusArea[] = [];

    // Look for repeated themes across documents
    const sourceMap = new Map<string, Set<string>>();
    context.chunks.forEach(chunk => {
      if (!sourceMap.has(chunk.metadata.documentId)) {
        sourceMap.set(chunk.metadata.documentId, new Set());
      }
      // Extract key phrases (simplified)
      const sentences = chunk.content.split(/[.!?]+/);
      sentences.forEach(sentence => {
        if (sentence.length > 50 && sentence.length < 200) {
          sourceMap.get(chunk.metadata.documentId)!.add(sentence.trim());
        }
      });
    });

    // Find overlapping themes
    const allSentences = Array.from(sourceMap.values());
    for (let i = 0; i < allSentences.length; i++) {
      for (let j = i + 1; j < allSentences.length; j++) {
        const overlap = findSemanticOverlap(
          Array.from(allSentences[i]),
          Array.from(allSentences[j])
        );

        if (overlap.length > 0) {
          consensus.push({
            concept: 'Shared Understanding',
            sources: [
              {
                documentId: `source-${i}`,
                documentName: `Document ${i + 1}`,
                claim: overlap[0]
              },
              {
                documentId: `source-${j}`,
                documentName: `Document ${j + 1}`,
                claim: overlap[0]
              }
            ],
            synthesis: 'Multiple sources present similar perspectives on this concept.'
          });
        }
      }
    }

    return consensus;
  }

  private async reconcileConflicts(
    lesson: LessonStructure,
    context: ContextResult
  ): Promise<ConflictArea[]> {
    const conflicts: ConflictArea[] = [];

    // Use conflict information from context
    if (context.conflicts && context.conflicts.length > 0) {
      for (const conflictItem of context.conflicts) {
        const reconciliation = await this.generateReconciliation(conflictItem, lesson);

        conflicts.push({
          concept: conflictItem.concept,
          conflictingViews: conflictItem.sources,
          reconciliation
        });
      }
    }

    // Also look for potential conflicts in the lesson itself
    const lessonConflicts = await this.detectLessonConflicts(lesson);
    conflicts.push(...lessonConflicts);

    return conflicts;
  }

  private async generateReconciliation(
    conflictItem: any,
    lesson: LessonStructure
  ): Promise<string> {
    const reconciliationPrompt = `
      Generate a balanced reconciliation for conflicting views on "${conflictItem.concept}"

      Conflicting positions:
      ${conflictItem.sources.map((s: any) => `- ${s.documentName}: ${s.position}`).join('\n')}

      Provide a balanced explanation that:
      1. Acknowledges both perspectives
      2. Explains possible reasons for the disagreement
      3. Suggests how to evaluate the different viewpoints
      4. Maintains academic neutrality

      Keep it objective and educational (3-4 sentences).
    `;

    try {
      const response = await llmService.complete({
        prompt: reconciliationPrompt,
        maxTokens: 400
      });

      return response;
    } catch (error) {
      console.error('Error generating reconciliation:', error);
      return `Different perspectives exist on ${conflictItem.concept}. Consider evaluating the evidence for each position.`;
    }
  }

  private async detectLessonConflicts(lesson: LessonStructure): Promise<ConflictArea[]> {
    // Analyze lesson content for potential contradictions
    // This is a placeholder for more sophisticated conflict detection
    return [];
  }

  private async generateSourceAttribution(context: ContextResult): Promise<SourceAttribution[]> {
    // Create detailed source attribution
    const attribution: SourceAttribution[] = [];

    context.sources.forEach(source => {
      const chunks = context.chunks.filter(c => c.metadata.documentId === source.documentId);
      const totalContribution = chunks.reduce((sum, c) => sum + c.metadata.relevanceScore, 0);

      attribution.push({
        documentId: source.documentId,
        documentName: source.documentName,
        contribution: `${chunks.length} passages used (avg. relevance: ${(totalContribution / chunks.length).toFixed(2)})`,
        chapter: chunks[0]?.metadata.chapter
      });
    });

    return attribution.sort((a, b) => b.documentName.localeCompare(a.documentName));
  }
}

function findSemanticOverlap(sentences1: string[], sentences2: string[]): string[] {
  // Simplified semantic overlap detection
  const overlap: string[] = [];

  sentences1.forEach(s1 => {
    sentences2.forEach(s2 => {
      const words1 = new Set(s1.toLowerCase().split(/\s+/));
      const words2 = new Set(s2.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const overlapRatio = intersection.size / Math.min(words1.size, words2.size);

      if (overlapRatio > 0.6 && s1.length > 30) {
        overlap.push(s1);
      }
    });
  });

  return [...new Set(overlap)];
}
