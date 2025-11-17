import { Page, expect } from '@playwright/test';

export class SubjectsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/subjects');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="subjects-title"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="subjects-list"]')).toBeVisible();
  }

  async shouldShowSubject(subjectName: string) {
    await expect(
      this.page.locator(`[data-testid="subject-${subjectName}"]`)
    ).toBeVisible();
  }

  async shouldShowSubjectCount(count: number) {
    const subjects = this.page.locator('[data-testid="subject-item"]');
    await expect(subjects).toHaveCount(count);
  }

  async clickCreateSubject() {
    await this.page.click('[data-testid="create-subject-button"]');
  }

  async clickSubject(subjectName: string) {
    await this.page.click(`[data-testid="subject-${subjectName}"]`);
  }

  async createSubject(name: string, description: string, color: string) {
    await this.page.click('[data-testid="create-subject-button"]');
    await this.page.fill('[data-testid="subject-name-input"]', name);
    await this.page.fill('[data-testid="subject-description-input"]', description);
    await this.page.click(`[data-testid="color-${color}"]`);
    await this.page.click('[data-testid="save-subject-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async editSubject(subjectName: string, newName: string, newDescription: string) {
    await this.page.click(`[data-testid="subject-${subjectName}"]`);
    await this.page.click('[data-testid="edit-subject-button"]');
    await this.page.fill('[data-testid="subject-name-input"]', newName);
    await this.page.fill('[data-testid="subject-description-input"]', newDescription);
    await this.page.click('[data-testid="save-subject-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async deleteSubject(subjectName: string) {
    await this.page.click(`[data-testid="subject-${subjectName}"]`);
    await this.page.click('[data-testid="delete-subject-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowSubjectDocuments(subjectName: string) {
    await expect(
      this.page.locator(`[data-testid="documents-${subjectName}"]`)
    ).toBeVisible();
  }

  async shouldShowSubjectChapters(subjectName: string) {
    await expect(
      this.page.locator(`[data-testid="chapters-${subjectName}"]`)
    ).toBeVisible();
  }

  async searchSubject(query: string) {
    await this.page.fill('[data-testid="search-input"]', query);
    await this.page.press('[data-testid="search-input"]', 'Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async filterSubjects(filter: 'all' | 'favorites' | 'recent') {
    await this.page.click(`[data-testid="filter-${filter}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async sortSubjects(sortBy: 'name' | 'created' | 'updated') {
    await this.page.click('[data-testid="sort-dropdown"]');
    await this.page.click(`[data-testid="sort-${sortBy}"]`);
    await this.page.waitForLoadState('networkidle');
  }
}
