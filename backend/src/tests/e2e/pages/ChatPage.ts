import { Page, expect } from '@playwright/test';

export class ChatPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/chat');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="chat-title"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="chat-messages"]')).toBeVisible();
  }

  async sendMessage(message: string) {
    await this.page.fill('[data-testid="message-input"]', message);
    await this.page.click('[data-testid="send-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowMessage(message: string, sender: 'user' | 'assistant') {
    await expect(
      this.page.locator(`[data-testid="message-${sender}"]:has-text("${message}")`)
    ).toBeVisible();
  }

  async askAITutor(question: string) {
    await this.sendMessage(question);
    await this.page.waitForSelector('[data-testid="ai-thinking"]', { state: 'visible' });
    await this.page.waitForSelector('[data-testid="ai-thinking"]', { state: 'hidden' });
  }

  async shouldShowAIResponse() {
    await expect(this.page.locator('[data-testid="message-assistant"]')).toBeVisible();
  }

  async clearChat() {
    await this.page.click('[data-testid="clear-chat-button"]');
    await this.page.click('[data-testid="confirm-clear-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowEmptyChat() {
    await expect(this.page.locator('[data-testid="empty-chat-message"]')).toBeVisible();
  }

  async startNewConversation() {
    await this.page.click('[data-testid="new-conversation-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowConversationHistory() {
    await expect(this.page.locator('[data-testid="conversation-history"]')).toBeVisible();
  }

  async selectConversation(conversationTitle: string) {
    await this.page.click(`[data-testid="conversation-${conversationTitle}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowSuggestedQuestions() {
    await expect(this.page.locator('[data-testid="suggested-questions"]')).toBeVisible();
  }

  async clickSuggestedQuestion(question: string) {
    await this.page.click(`[data-testid="suggested-${question}"]`);
  }

  async toggleTeachingStyle(style: 'socratic' | 'direct' | 'encouraging') {
    await this.page.click('[data-testid="teaching-style-select"]');
    await this.page.click(`[data-testid="style-${style}"]`);
    await this.page.waitForLoadState('networkidle');
  }
}
