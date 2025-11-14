import { SearchResult } from './types';

interface Conflict {
  concept: string;
  sources: {
    documentId: string;
    documentName: string;
    chapter?: string;
    claim: string;
    confidence: number;
  }[];
}

interface ConsensusArea {
  concept: string;
  sources: {
    documentId: string;
    documentName: string;
    claim: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

export function detectConflicts(chunks: SearchResult[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const conceptClaims = new Map<string, Map<string, string>>();

  // Group claims by concept
  chunks.forEach(chunk => {
    const concepts = extractConcepts(chunk.content);

    concepts.forEach(concept => {
      if (!conceptClaims.has(concept)) {
        conceptClaims.set(concept, new Map());
      }

      const claim = extractKeyClaim(chunk.content, concept);
      const sourceId = chunk.metadata.documentId;

      if (claim) {
        const existingClaim = conceptClaims.get(concept)!.get(sourceId);
        if (!existingClaim || areClaimsDifferent(existingClaim, claim)) {
          conceptClaims.get(concept)!.set(sourceId, claim);
        }
      }
    });
  });

  // Identify conflicts (same concept, different claims from different sources)
  conceptClaims.forEach((claims, concept) => {
    if (claims.size > 1) {
      const claimArray = Array.from(claims.entries());
      const differentClaims = claimArray.filter(([id1, claim1]) => {
        return !claimArray.some(([id2, claim2]) =>
          id1 !== id2 && areClaimsDifferent(claim1, claim2)
        );
      });

      if (differentClaims.length > 1) {
        const conflict: Conflict = {
          concept,
          sources: differentClaims.map(([docId, claim]) => {
            const chunk = chunks.find(c => c.metadata.documentId === docId);
            return {
              documentId: docId,
              documentName: chunk?.metadata.documentName || 'Unknown',
              chapter: chunk?.metadata.chapter,
              claim,
              confidence: calculateConfidence(claim)
            };
          })
        };
        conflicts.push(conflict);
      }
    }
  });

  return conflicts;
}

export function findConsensus(chunks: SearchResult[]): ConsensusArea[] {
  const consensus: ConsensusArea[] = [];
  const conceptClaims = new Map<string, Map<string, string>>();

  // Same as detectConflicts but look for agreement
  chunks.forEach(chunk => {
    const concepts = extractConcepts(chunk.content);

    concepts.forEach(concept => {
      if (!conceptClaims.has(concept)) {
        conceptClaims.set(concept, new Map());
      }

      const claim = extractKeyClaim(chunk.content, concept);
      const sourceId = chunk.metadata.documentId;

      if (claim) {
        conceptClaims.get(concept)!.set(sourceId, claim);
      }
    });
  });

  // Identify consensus areas
  conceptClaims.forEach((claims, concept) => {
    if (claims.size > 1) {
      const claimArray = Array.from(claims.values());

      // Check if multiple sources have similar claims
      const groups = groupSimilarClaims(claimArray);

      if (groups.length > 0) {
        groups.forEach(group => {
          if (group.length > 1) {
            const sources = Array.from(claims.entries())
              .filter(([_, claim]) => group.includes(claim))
              .map(([docId, claim]) => {
                const chunk = chunks.find(c => c.metadata.documentId === docId);
                return {
                  documentId: docId,
                  documentName: chunk?.metadata.documentName || 'Unknown',
                  claim
                };
              });

            consensus.push({
              concept,
              sources,
              confidence: determineConfidenceLevel(group.length, claims.size)
            });
          }
        });
      }
    }
  });

  return consensus;
}

function extractConcepts(text: string): string[] {
  // Simplified concept extraction
  // In production, could use NLP libraries like spaCy or GPT to extract key concepts
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 5);

  // Return unique words that appear frequently
  const frequency = new Map<string, number>();
  words.forEach(word => {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  });

  return Array.from(frequency.entries())
    .filter(([_, count]) => count > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function extractKeyClaim(text: string, concept: string): string | null {
  const sentences = text.split(/[.!?]+/);

  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(concept.toLowerCase())) {
      // Extract the part of the sentence that defines or describes the concept
      const parts = sentence.split(/[,:]/);
      if (parts.length > 0) {
        return parts[0].trim();
      }
    }
  }

  return null;
}

function areClaimsDifferent(claim1: string, claim2: string): boolean {
  // Simple string comparison - in production, could use semantic similarity
  const norm1 = claim1.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm2 = claim2.toLowerCase().replace(/\s+/g, ' ').trim();

  if (norm1 === norm2) return false;

  // Check for significant overlap
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));

  const overlap = intersection.size / Math.min(words1.size, words2.size);

  return overlap < 0.5; // Less than 50% overlap = different claims
}

function groupSimilarClaims(claims: string[]): string[][] {
  const groups: string[][] = [];
  const used = new Set<string>();

  claims.forEach(claim => {
    if (used.has(claim)) return;

    const group = [claim];
    used.add(claim);

    claims.forEach(other => {
      if (used.has(other)) return;

      if (!areClaimsDifferent(claim, other)) {
        group.push(other);
        used.add(other);
      }
    });

    if (group.length > 0) {
      groups.push(group);
    }
  });

  return groups;
}

function calculateConfidence(claim: string): number {
  // Higher confidence for longer, more specific claims
  let confidence = 0.5; // Base confidence

  if (claim.length > 50) confidence += 0.2;
  if (claim.includes('because') || claim.includes('therefore')) confidence += 0.1;
  if (claim.includes('study') || claim.includes('research')) confidence += 0.1;
  if (claim.includes('evidence') || claim.includes('data')) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

function determineConfidenceLevel(
  agreeingSources: number,
  totalSources: number
): 'high' | 'medium' | 'low' {
  const ratio = agreeingSources / totalSources;

  if (ratio >= 0.7) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}
