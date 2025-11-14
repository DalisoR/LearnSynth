import { EnhancedRAGService } from './enhancedRagService';
import { SearchResult } from './types';

interface AggregatedContext {
  chunks: SearchResult[];
  metadata: {
    totalSources: number;
    subjectCoverage: { [subjectId: string]: number };
    conceptClusters: ConceptCluster[];
    prerequisiteLinks: PrerequisiteLink[];
    difficultyDistribution: number[];
  };
}

interface ConceptCluster {
  concept: string;
  chunks: SearchResult[];
  centralityScore: number;
  relatedConcepts: string[];
}

interface PrerequisiteLink {
  concept: string;
  prerequisites: string[];
  strength: number;
}

export class KnowledgeBaseContextAggregator {
  constructor(private ragService: EnhancedRAGService) {}

  async aggregateBySubject(
    subjectId: string,
    query: string
  ): Promise<AggregatedContext> {
    // Get context from the specific subject
    const subjectContext = await this.ragService.retrieveContext({
      text: query,
      subjectId
    });

    // Get related subjects (if this is a knowledge base)
    const relatedSubjects = await this.getRelatedSubjects(subjectId);

    // Aggregate from all related subjects
    const allContexts = await Promise.all([
      Promise.resolve(subjectContext),
      ...relatedSubjects.map(sub =>
        this.ragService.retrieveContext({ text: query, subjectId: sub.id })
      )
    ]);

    // Combine all chunks
    const allChunks = allContexts.flatMap(ctx => ctx.chunks);

    // Cluster concepts
    const conceptClusters = await this.clusterConcepts(allChunks);

    // Identify prerequisite relationships
    const prerequisiteLinks = await this.identifyPrerequisites(allChunks);

    // Calculate metadata
    const metadata = {
      totalSources: new Set(allChunks.map(c => c.metadata.documentId)).size,
      subjectCoverage: this.calculateSubjectCoverage(allChunks),
      conceptClusters,
      prerequisiteLinks,
      difficultyDistribution: this.calculateDifficultyDistribution(allChunks)
    };

    return {
      chunks: allChunks,
      metadata
    };
  }

  async clusterConcepts(chunks: SearchResult[]): Promise<ConceptCluster[]> {
    const conceptMap = new Map<string, SearchResult[]>();

    // Group chunks by concept
    chunks.forEach(chunk => {
      const concepts = this.extractKeyConcepts(chunk.content);
      concepts.forEach(concept => {
        if (!conceptMap.has(concept)) {
          conceptMap.set(concept, []);
        }
        conceptMap.get(concept)!.push(chunk);
      });
    });

    // Create clusters
    const clusters: ConceptCluster[] = [];
    conceptMap.forEach((chunksForConcept, concept) => {
      // Find related concepts
      const relatedConcepts = this.findRelatedConcepts(concept, chunks);

      // Calculate centrality score
      const centralityScore = this.calculateCentrality(concept, chunks);

      clusters.push({
        concept,
        chunks: chunksForConcept,
        centralityScore,
        relatedConcepts
      });
    });

    // Sort by centrality and return top clusters
    return clusters
      .sort((a, b) => b.centralityScore - a.centralityScore)
      .slice(0, 20);
  }

  private async getRelatedSubjects(subjectId: string): Promise<{ id: string; name: string }[]> {
    // Query for subjects in the same knowledge base or related subjects
    // This is a placeholder - implement based on your subject hierarchy structure
    return [];
  }

  private extractKeyConcepts(text: string): string[] {
    // More sophisticated concept extraction
    // Could use named entity recognition or keyphrase extraction

    // Simple TF-IDF style extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 5 && !isStopWord(w));

    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  private findRelatedConcepts(concept: string, allChunks: SearchResult[]): string[] {
    const related: string[] = [];

    allChunks.forEach(chunk => {
      if (chunk.content.toLowerCase().includes(concept.toLowerCase())) {
        const concepts = this.extractKeyConcepts(chunk.content);
        concepts
          .filter(c => c !== concept)
          .forEach(c => {
            if (!related.includes(c)) {
              related.push(c);
            }
          });
      }
    });

    return related.slice(0, 10);
  }

  private calculateCentrality(concept: string, chunks: SearchResult[]): number {
    const mentions = chunks.filter(c =>
      c.content.toLowerCase().includes(concept.toLowerCase())
    ).length;

    // Normalize by number of chunks
    return mentions / chunks.length;
  }

  private calculateSubjectCoverage(chunks: SearchResult[]): { [subjectId: string]: number } {
    const coverage: { [subjectId: string]: number } = {};
    const total = chunks.length;

    chunks.forEach(chunk => {
      if (chunk.metadata.subjectId) {
        coverage[chunk.metadata.subjectId] =
          (coverage[chunk.metadata.subjectId] || 0) + 1;
      }
    });

    // Convert to percentages
    Object.keys(coverage).forEach(subjectId => {
      coverage[subjectId] = (coverage[subjectId] / total) * 100;
    });

    return coverage;
  }

  private async identifyPrerequisites(chunks: SearchResult[]): Promise<PrerequisiteLink[]> {
    const prerequisites: PrerequisiteLink[] = [];

    // Look for "before", "prerequisite", "need to know" patterns
    chunks.forEach(chunk => {
      const concepts = this.extractKeyConcepts(chunk.content);

      concepts.forEach(concept => {
        const prereqPattern = new RegExp(
          `prerequisite[rs]? for ${concept}|before ${concept}|need to know.*${concept}`,
          'i'
        );

        if (prereqPattern.test(chunk.content)) {
          // Extract prerequisites from context
          const prerequisites = this.extractPrerequisites(chunk.content, concept);

          if (prerequisites.length > 0) {
            prerequisites.push({
              concept,
              prerequisites,
              strength: 1.0
            });
          }
        }
      });
    });

    return prerequisites;
  }

  private extractPrerequisites(text: string, concept: string): string[] {
    // Simplified prerequisite extraction
    const prereqs: string[] = [];

    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
      if (sentence.toLowerCase().includes('prerequisite') ||
          sentence.toLowerCase().includes('before')) {
        // Extract mentioned concepts as prerequisites
        const concepts = this.extractKeyConcepts(sentence);
        concepts
          .filter(c => c !== concept.toLowerCase())
          .forEach(c => prereqs.push(c));
      }
    });

    return [...new Set(prereqs)];
  }

  private calculateDifficultyDistribution(chunks: SearchResult[]): number[] {
    const distribution = [0, 0, 0, 0, 0]; // Index 0-4 for difficulty levels 1-5

    chunks.forEach(chunk => {
      const difficulty = Math.min(Math.max(chunk.metadata.difficulty, 1), 5);
      distribution[difficulty - 1]++;
    });

    return distribution;
  }
}

function isStopWord(word: string): boolean {
  const stopWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
    'boy', 'did', 'she', 'use', 'your', 'have', 'they', 'this', 'from',
    'been', 'them', 'than', 'many', 'some', 'time', 'very', 'when', 'much'
  ];

  return stopWords.includes(word.toLowerCase());
}
