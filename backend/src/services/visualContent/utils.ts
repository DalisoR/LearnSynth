export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function estimateImageCost(prompt: any): number {
  // Estimate cost based on image size and provider
  const baseCost = 0.02; // Base cost per image
  const sizeMultiplier = prompt.resolution === '1024x1024' ? 1 : 0.5;
  return baseCost * sizeMultiplier;
}

export function optimizeImage(imageData: any): Promise<any> {
  // Placeholder for image optimization
  return Promise.resolve(imageData);
}

export function generateAltText(description: string, keywords: string[]): string {
  const keywordText = keywords.slice(0, 3).join(', ');
  return `${description}. Keywords: ${keywordText}`;
}

export function validateVisualPrompt(prompt: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!prompt.description || prompt.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  if (!prompt.type) {
    errors.push('Visual type is required');
  }

  if (!prompt.purpose) {
    errors.push('Purpose statement is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
