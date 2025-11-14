import { LessonStructure } from './types';
import { llmService } from '../llm/factory';

export interface QualityReport {
  score: number; // 0-100
  issues: QualityIssue[];
  suggestions: string[];
  readabilityScore: number;
  accuracyCheck: boolean;
  completenessScore: number;
  engagementLevel: number;
}

export interface QualityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'content' | 'structure' | 'readability' | 'engagement' | 'accuracy';
  description: string;
  suggestion: string;
  location?: string;
}

export class QualityAssuranceEngine {
  async reviewLesson(lesson: LessonStructure): Promise<QualityReport> {
    const issues: QualityIssue[] = [];
    const suggestions: string[] = [];

    // Check structure
    this.checkStructure(lesson, issues, suggestions);

    // Check content quality
    await this.checkContentQuality(lesson, issues, suggestions);

    // Check readability
    const readabilityScore = this.checkReadability(lesson, issues);

    // Check accuracy
    const accuracyCheck = await this.checkAccuracy(lesson, issues);

    // Check completeness
    const completenessScore = this.checkCompleteness(lesson, issues);

    // Check engagement
    const engagementLevel = this.checkEngagement(lesson, issues);

    // Calculate overall score
    const score = this.calculateOverallScore({
      readability: readabilityScore,
      accuracy: accuracyCheck ? 100 : 0,
      completeness: completenessScore,
      engagement: engagementLevel,
      issues
    });

    return {
      score,
      issues,
      suggestions,
      readabilityScore,
      accuracyCheck,
      completenessScore,
      engagementLevel
    };
  }

  private checkStructure(lesson: LessonStructure, issues: QualityIssue[], suggestions: string[]): void {
    // Check if lesson has all required components
    if (!lesson.objectives.primary || lesson.objectives.primary.length === 0) {
      issues.push({
        severity: 'high',
        category: 'structure',
        description: 'Missing primary learning objectives',
        suggestion: 'Add clear primary learning objectives',
        location: 'objectives'
      });
    }

    if (!lesson.topics || lesson.topics.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        description: 'No topics defined in lesson',
        suggestion: 'Add at least 3-5 topics to the lesson',
        location: 'topics'
      });
    }

    if (lesson.topics && lesson.topics.length > 0) {
      // Check time allocation
      const totalTime = lesson.topics.reduce((sum, t) => sum + t.timeAllocation, 0);
      const expectedTime = lesson.estimatedTime;

      if (Math.abs(totalTime - expectedTime) > 10) {
        issues.push({
          severity: 'medium',
          category: 'structure',
          description: `Time allocation mismatch (${totalTime} min vs ${expectedTime} min expected)`,
          suggestion: 'Adjust topic time allocations to match estimated time'
        });
      }
    }

    // Check for prerequisites
    if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
      suggestions.push('Consider adding prerequisite knowledge requirements');
    }
  }

  private async checkContentQuality(lesson: LessonStructure, issues: QualityIssue[], suggestions: string[]): void {
    // Check each topic's content
    for (const topic of lesson.topics) {
      if (!topic.content.core || topic.content.core.length < 200) {
        issues.push({
          severity: 'high',
          category: 'content',
          description: `Topic "${topic.title}" has insufficient core content`,
          suggestion: 'Expand the core content to at least 200 words',
          location: topic.title
        });
      }

      // Check for balanced content across levels
      if (topic.content.intermediate.length < topic.content.core.length * 0.8) {
        suggestions.push(`Consider expanding intermediate content for "${topic.title}"`);
      }

      // Check for examples
      if (!topic.examples || topic.examples.length === 0) {
        suggestions.push(`Add examples to "${topic.title}" to improve understanding`);
      }
    }
  }

  private checkReadability(lesson: LessonStructure, issues: QualityIssue[]): number {
    let totalScore = 0;
    let contentCount = 0;

    for (const topic of lesson.topics) {
      [topic.content.core, topic.content.intermediate, topic.content.advanced].forEach(content => {
        if (content) {
          const score = this.calculateFleschReadingEase(content);
          totalScore += score;
          contentCount++;

          if (score < 50) {
            issues.push({
              severity: 'medium',
              category: 'readability',
              description: `Content may be difficult to read (score: ${score.toFixed(0)})`,
              suggestion: 'Use shorter sentences and simpler words',
              location: topic.title
            });
          }
        }
      });
    }

    return contentCount > 0 ? totalScore / contentCount : 0;
  }

  private calculateFleschReadingEase(text: string): number {
    // Simplified Flesch Reading Ease calculation
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.estimateSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, score));
  }

  private estimateSyllables(text: string): number {
    // Simplified syllable counter
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]+/g, 'a')
      .length;
  }

  private async checkAccuracy(lesson: LessonStructure, issues: QualityIssue[]): Promise<boolean> {
    // Check for potential accuracy issues
    let hasIssues = false;

    for (const topic of lesson.topics) {
      // Look for conflicting statements within the same lesson
      const coreContent = topic.content.core;
      const intermediateContent = topic.content.intermediate;

      if (coreContent && intermediateContent) {
        const hasContradiction = await this.checkForContradictions(coreContent, intermediateContent);

        if (hasContradiction) {
          issues.push({
            severity: 'high',
            category: 'accuracy',
            description: `Potential contradiction in "${topic.title}"`,
            suggestion: 'Review content for consistency across levels',
            location: topic.title
          });
          hasIssues = true;
        }
      }

      // Check for unsupported claims
      const unsupportedClaims = await this.checkUnsupportedClaims(topic.content.core);

      if (unsupportedClaims.length > 0) {
        issues.push({
          severity: 'medium',
          category: 'accuracy',
          description: `${unsupportedClaims.length} unsupported claims in "${topic.title}"`,
          suggestion: 'Add evidence or qualify statements',
          location: topic.title
        });
        hasIssues = true;
      }
    }

    return !hasIssues;
  }

  private async checkForContradictions(content1: string, content2: string): Promise<boolean> {
    // Simplified contradiction detection
    // In production, could use more sophisticated NLP
    const prompts1 = this.extractKeyClaims(content1);
    const prompts2 = this.extractKeyClaims(content2);

    for (const claim1 of prompts1) {
      for (const claim2 of prompts2) {
        if (claim1 !== claim2 && areOpposing(claim1, claim2)) {
          return true;
        }
      }
    }

    return false;
  }

  private extractKeyClaims(content: string): string[] {
    // Extract declarative sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.length > 20);
    return sentences.map(s => s.trim().toLowerCase());
  }

  private async checkUnsupportedClaims(content: string): Promise<string[]> {
    const unsupported: string[] = [];

    // Look for absolute statements without qualifiers
    const absolutePatterns = [
      /always/gi,
      /never/gi,
      /all/gi,
      /none/gi,
      /everyone/gi,
      /no one/gi
    ];

    absolutePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        unsupported.push(`Absolute statement found: ${pattern.source}`);
      }
    });

    return unsupported;
  }

  private checkCompleteness(lesson: LessonStructure, issues: QualityIssue[]): number {
    let score = 100;

    // Check for all required components
    if (!lesson.objectives.primary || lesson.objectives.primary.length === 0) score -= 20;
    if (!lesson.objectives.secondary || lesson.objectives.secondary.length === 0) score -= 10;
    if (!lesson.narrativeArc) score -= 10;

    // Check topics for completeness
    let incompleteTopics = 0;
    lesson.topics.forEach(topic => {
      let topicScore = 100;
      if (!topic.content.core) topicScore -= 30;
      if (!topic.content.intermediate) topicScore -= 20;
      if (!topic.content.advanced) topicScore -= 15;
      if (!topic.examples || topic.examples.length === 0) topicScore -= 15;
      if (!topic.keyTerms || topic.keyTerms.length === 0) topicScore -= 10;

      if (topicScore < 100) incompleteTopics++;
    });

    if (incompleteTopics > 0) {
      score -= (incompleteTopics / lesson.topics.length) * 20;
      issues.push({
        severity: 'medium',
        category: 'completeness',
        description: `${incompleteTopics} topics incomplete`,
        suggestion: 'Complete all topic components'
      });
    }

    return Math.max(0, score);
  }

  private checkEngagement(lesson: LessonStructure, issues: QualityIssue[]): number {
    let score = 100;

    // Check for interactive elements
    const totalCheckpoints = lesson.topics.reduce((sum, t) => sum + t.checkpoints.length, 0);
    const expectedCheckpoints = lesson.topics.length * 2; // 2 per topic

    if (totalCheckpoints < expectedCheckpoints) {
      score -= (expectedCheckpoints - totalCheckpoints) * 5;
      issues.push({
        severity: 'low',
        category: 'engagement',
        description: 'Few interactive checkpoints',
        suggestion: 'Add more checkpoints and reflection prompts'
      });
    }

    // Check for variety in content
    const hasExamples = lesson.topics.some(t => t.examples.length > 0);
    const hasVisuals = lesson.topics.some(t => t.visualPrompts.length > 0);

    if (!hasExamples) score -= 15;
    if (!hasVisuals) score -= 10;

    return Math.max(0, score);
  }

  private calculateOverallScore(metrics: {
    readability: number;
    accuracy: number;
    completeness: number;
    engagement: number;
    issues: QualityIssue[];
  }): number {
    let score = 100;

    // Deduct for issues
    metrics.issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Factor in quality metrics
    score = (metrics.readability * 0.25) + (metrics.completeness * 0.35) + (metrics.engagement * 0.15);

    if (metrics.accuracy) {
      score += 25; // Bonus for passing accuracy check
    } else {
      score -= 25; // Penalty for accuracy issues
    }

    return Math.max(0, Math.min(100, score));
  }
}

function areOpposing(claim1: string, claim2: string): boolean {
  // Simplified opposition detection
  const opposingPairs = [
    ['is', 'is not'],
    ['can', 'cannot'],
    ['will', 'will not'],
    ['always', 'never']
  ];

  return opposingPairs.some(([pos, neg]) => {
    return (claim1.includes(pos) && claim2.includes(neg)) ||
           (claim1.includes(neg) && claim2.includes(pos));
  });
}
