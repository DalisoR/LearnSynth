import { QueryExpansion } from './types';

/**
 * Expand user query into multiple variations for better retrieval
 */
export async function expandQuery(originalQuery: string): Promise<QueryExpansion> {
  const words = originalQuery.toLowerCase().split(/\s+/);
  const primaryTerms = words.filter(w => w.length > 3);

  // Generate related terms and synonyms
  const relatedTerms = await generateRelatedTerms(primaryTerms);
  const synonyms = await generateSynonyms(primaryTerms);

  // Generate question variations
  const questionVariations = generateQuestionForms(originalQuery);

  return {
    primary: primaryTerms,
    related: relatedTerms,
    synonyms: synonyms,
    questions: questionVariations
  };
}

async function generateRelatedTerms(terms: string[]): Promise<string[]> {
  // Common educational concept relationships
  const relationships: { [key: string]: string[] } = {
    'algorithm': ['procedure', 'method', 'process', 'computation'],
    'data': ['information', 'dataset', 'records', 'values'],
    'learning': ['education', 'study', 'training', 'instruction'],
    'system': ['framework', 'architecture', 'structure', 'model'],
    'analysis': ['examination', 'evaluation', 'investigation', 'study'],
    'theory': ['principle', 'concept', 'framework', 'hypothesis'],
    'practice': ['application', 'implementation', 'exercise', 'use'],
    'model': ['representation', 'abstraction', 'framework', 'pattern'],
    'process': ['procedure', 'workflow', 'method', 'sequence'],
    'structure': ['organization', 'arrangement', 'composition', 'architecture']
  };

  const related: string[] = [];
  terms.forEach(term => {
    if (relationships[term]) {
      related.push(...relationships[term]);
    }
  });

  // Also use word associations
  const associations = await generateWordAssociations(terms);
  related.push(...associations);

  return [...new Set(related)];
}

async function generateSynonyms(terms: string[]): Promise<string[]> {
  // Educational context synonyms
  const synonyms: { [key: string]: string[] } = {
    'understand': ['comprehend', 'grasp', 'follow', 'appreciate'],
    'explain': ['describe', 'clarify', 'illustrate', 'elaborate'],
    'demonstrate': ['show', 'prove', 'display', 'exhibit'],
    'analyze': ['examine', 'investigate', 'study', 'evaluate'],
    'compare': ['contrast', 'differentiate', 'distinguish', 'examine'],
    'solve': ['resolve', 'address', 'tackle', 'work out'],
    'apply': ['use', 'implement', 'employ', 'utilize'],
    'create': ['develop', 'design', 'construct', 'build'],
    'evaluate': ['assess', 'judge', 'critique', 'appraise'],
    'synthesize': ['combine', 'integrate', 'merge', 'unite']
  };

  const result: string[] = [];
  terms.forEach(term => {
    if (synonyms[term]) {
      result.push(...synonyms[term]);
    }
  });

  return [...new Set(result)];
}

async function generateWordAssociations(terms: string[]): Promise<string[]> {
  // Simple association based on co-occurrence patterns
  // In production, could use word2vec or similar embeddings

  const associations: { [key: string]: string[] } = {
    'machine': ['learning', 'algorithm', 'model', 'data', 'training'],
    'neural': ['network', 'brain', 'connection', 'node', 'layer'],
    'computer': ['science', 'programming', 'algorithm', 'data', 'software'],
    'statistics': ['probability', 'data', 'distribution', 'hypothesis', 'inference'],
    'database': ['data', 'storage', 'query', 'sql', 'table'],
    'network': ['connection', 'protocol', 'communication', 'internet', 'graph'],
    'programming': ['code', 'algorithm', 'function', 'variable', 'loop'],
    'mathematics': ['equation', 'proof', 'theorem', 'calculation', 'formula']
  };

  const result: string[] = [];
  terms.forEach(term => {
    Object.keys(associations).forEach(key => {
      if (term.includes(key) || key.includes(term)) {
        result.push(...associations[key]);
      }
    });
  });

  return [...new Set(result)];
}

function generateQuestionForms(query: string): string[] {
  const questions: string[] = [];

  // What/How/Why variations
  if (!query.startsWith('what') && !query.startsWith('how') && !query.startsWith('why')) {
    questions.push(`What is ${query}?`);
    questions.push(`How does ${query} work?`);
    questions.push(`Why is ${query} important?`);
  }

  // Definition-seeking
  questions.push(`Define ${query}`);
  questions.push(`Explain ${query} in detail`);

  // Application-focused
  questions.push(`How is ${query} used in practice?`);
  questions.push(`What are examples of ${query}?`);

  // Comparison
  questions.push(`How does ${query} relate to other concepts?`);

  return [...new Set(questions)];
}
