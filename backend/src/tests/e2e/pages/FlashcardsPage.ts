import { Page, expect } from '@playwright/test';

export class FlashcardsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/flashcards');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="flashcards-title"]')).toBeVisible();
  }

  async shouldShowDecks() {
    await expect(this.page.locator('[data-testid="decks-list"]')).toBeVisible();
  }

  async createDeck(name: string, description: string) {
    await this.page.click('[data-testid="create-deck-button"]');
    await this.page.fill('[data-testid="deck-name-input"]', name);
    await this.page.fill('[data-testid="deck-description-input"]', description);
    await this.page.click('[data-testid="save-deck-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async openDeck(deckName: string) {
    await this.page.click(`[data-testid="deck-${deckName}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowFlashcards(deckName: string) {
    await expect(
      this.page.locator(`[data-testid="flashcards-${deckName}"]`)
    ).toBeVisible();
  }

  async addFlashcard(deckName: string, front: string, back: string) {
    await this.page.click(`[data-testid="deck-${deckName}"]`);
    await this.page.click('[data-testid="add-flashcard-button"]');
    await this.page.fill('[data-testid="flashcard-front-input"]', front);
    await this.page.fill('[data-testid="flashcard-back-input"]', back);
    await this.page.click('[data-testid="save-flashcard-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async studyDeck(deckName: string) {
    await this.page.click(`[data-testid="deck-${deckName}"]`);
    await this.page.click('[data-testid="study-deck-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowStudyInterface() {
    await expect(this.page.locator('[data-testid="study-interface"]')).toBeVisible();
  }

  async flipCard() {
    await this.page.click('[data-testid="flip-card-button"]');
  }

  async markAsKnown() {
    await this.page.click('[data-testid="known-button"]');
  }

  async markAsUnknown() {
    await this.page.click('[data-testid="unknown-button"]');
  }

  async shouldShowStudyProgress() {
    await expect(this.page.locator('[data-testid="study-progress"]')).toBeVisible();
  }

  async finishStudySession() {
    await this.page.click('[data-testid="finish-session-button"]');
  }

  async shouldShowStudyResults() {
    await expect(this.page.locator('[data-testid="study-results"]')).toBeVisible();
  }
}
