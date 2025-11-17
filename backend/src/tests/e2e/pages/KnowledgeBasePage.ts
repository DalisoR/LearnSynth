import { Page, expect } from '@playwright/test';

export class KnowledgeBasePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/knowledge-base');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="knowledge-base-title"]')).toBeVisible();
  }

  async shouldShowDocuments(documents: string[]) {
    for (const doc of documents) {
      await expect(
        this.page.locator(`[data-testid="document-${doc}"]`)
      ).toBeVisible();
    }
  }

  async shouldShowUploadButton() {
    await expect(this.page.locator('[data-testid="upload-document-button"]')).toBeVisible();
  }

  async clickUploadDocument() {
    await this.page.click('[data-testid="upload-document-button"]');
  }

  async uploadDocument(filePath: string, subjectName: string) {
    await this.clickUploadDocument();
    await this.page.waitForSelector('[data-testid="upload-modal"]', { state: 'visible' });

    // Select subject
    await this.page.click('[data-testid="subject-select"]');
    await this.page.click(`[data-testid="subject-option-${subjectName}"]`);

    // Upload file
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(filePath);

    // Confirm upload
    await this.page.click('[data-testid="confirm-upload-button"]');

    // Wait for success
    await this.page.waitForSelector('[data-testid="upload-success-message"]', {
      state: 'visible',
      timeout: 30000,
    });
  }

  async viewDocument(documentName: string) {
    await this.page.click(`[data-testid="document-${documentName}"]`);
  }

  async shouldShowChapters(documentName: string) {
    await expect(
      this.page.locator(`[data-testid="chapters-${documentName}"]`)
    ).toBeVisible();
  }

  async searchDocument(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterBySubject(subjectName: string) {
    await this.page.click('[data-testid="subject-filter"]');
    await this.page.click(`[data-testid="filter-${subjectName}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async deleteDocument(documentName: string) {
    await this.page.click(`[data-testid="document-${documentName}"]`);
    await this.page.click('[data-testid="delete-document-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForLoadState('networkidle');
  }
}
