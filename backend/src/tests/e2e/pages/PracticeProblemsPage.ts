import { Page, expect } from '@playwright/test';

export class PracticeProblemsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/practice');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="practice-title"]')).toBeVisible();
  }

  async shouldShowProblems() {
    await expect(this.page.locator('[data-testid="problems-list"]')).toBeVisible();
  }

  async createProblem(
    question: string,
    problemType: 'multiple_choice' | 'true_false' | 'short_answer',
    options?: string[],
    correctAnswer?: string
  ) {
    await this.page.click('[data-testid="create-problem-button"]');
    await this.page.fill('[data-testid="problem-question-input"]', question);
    await this.page.selectOption('[data-testid="problem-type-select"]', problemType);

    if (options) {
      for (const option of options) {
        await this.page.fill('[data-testid="option-input"]', option);
        await this.page.click('[data-testid="add-option-button"]');
      }
    }

    if (correctAnswer) {
      await this.page.fill('[data-testid="correct-answer-input"]', correctAnswer);
    }

    await this.page.click('[data-testid="save-problem-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async generateAIProblems(topic: string, count: number, difficulty: 'easy' | 'medium' | 'hard') {
    await this.page.click('[data-testid="generate-ai-problems-button"]');
    await this.page.fill('[data-testid="topic-input"]', topic);
    await this.page.selectOption('[data-testid="count-select"]', count.toString());
    await this.page.selectOption('[data-testid="difficulty-select"]', difficulty);
    await this.page.click('[data-testid="generate-button"]');

    // Wait for AI generation
    await this.page.waitForSelector('[data-testid="problems-generated"]', {
      state: 'visible',
      timeout: 60000,
    });
  }

  async startPracticeSession(problemIds: string[]) {
    await this.page.click('[data-testid="start-practice-button"]');

    for (const id of problemIds) {
      await this.page.click(`[data-testid="select-problem-${id}"]`);
    }

    await this.page.click('[data-testid="begin-session-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowProblemInterface() {
    await expect(this.page.locator('[data-testid="problem-interface"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="question-text"]')).toBeVisible();
  }

  async answerMultipleChoice(answerIndex: number) {
    await this.page.click(`[data-testid="option-${answerIndex}"]`);
  }

  async answerTrueFalse(isTrue: boolean) {
    await this.page.click(`[data-testid="answer-${isTrue ? 'true' : 'false'}"]`);
  }

  async answerShortAnswer(answer: string) {
    await this.page.fill('[data-testid="short-answer-input"]', answer);
  }

  async submitAnswer() {
    await this.page.click('[data-testid="submit-answer-button"]');
  }

  async shouldShowFeedback() {
    await expect(this.page.locator('[data-testid="feedback"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="correct-answer"]')).toBeVisible();
  }

  async nextProblem() {
    await this.page.click('[data-testid="next-problem-button"]');
  }

  async shouldShowProgress() {
    await expect(this.page.locator('[data-testid="progress-bar"]')).toBeVisible();
  }

  async finishSession() {
    await this.page.click('[data-testid="finish-session-button"]');
  }

  async shouldShowSessionResults() {
    await expect(this.page.locator('[data-testid="session-results"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="score"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="accuracy"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="time-spent"]')).toBeVisible();
  }
}
