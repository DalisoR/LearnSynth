import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="dashboard-title"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="welcome-message"]')).toBeVisible();
  }

  async shouldShowRecentSubjects(subjects: string[]) {
    for (const subject of subjects) {
      await expect(
        this.page.locator(`[data-testid="subject-card-${subject}"]`)
      ).toBeVisible();
    }
  }

  async shouldShowStudyProgress() {
    await expect(this.page.locator('[data-testid="study-progress-chart"]')).toBeVisible();
  }

  async shouldShowRecentActivity() {
    await expect(this.page.locator('[data-testid="recent-activity-list"]')).toBeVisible();
  }

  async shouldShowUpcomingDeadlines() {
    await expect(this.page.locator('[data-testid="upcoming-deadlines"]')).toBeVisible();
  }

  async clickSubject(subjectName: string) {
    await this.page.click(`[data-testid="subject-${subjectName}"]`);
  }

  async clickCreateSubject() {
    await this.page.click('[data-testid="create-subject-button"]');
  }

  async clickViewAllSubjects() {
    await this.page.click('[data-testid="view-all-subjects-button"]');
  }

  async clickKnowledgeBase() {
    await this.page.click('[data-testid="knowledge-base-link"]');
  }

  async clickStudyGroups() {
    await this.page.click('[data-testid="study-groups-link"]');
  }

  async clickFlashcards() {
    await this.page.click('[data-testid="flashcards-link"]');
  }

  async clickMindMaps() {
    await this.page.click('[data-testid="mind-maps-link"]');
  }

  async clickPracticeProblems() {
    await this.page.click('[data-testid="practice-problems-link"]');
  }

  async clickAnalytics() {
    await this.page.click('[data-testid="analytics-link"]');
  }

  async shouldShowUserProfile() {
    await expect(this.page.locator('[data-testid="user-profile-menu"]')).toBeVisible();
  }

  async clickUserProfile() {
    await this.page.click('[data-testid="user-profile-menu"]');
  }

  async shouldShowUserMenuItems() {
    await expect(this.page.locator('[data-testid="profile-menu"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="settings-menu-item"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="logout-menu-item"]')).toBeVisible();
  }

  async clickLogout() {
    await this.page.click('[data-testid="logout-menu-item"]');
    await this.page.waitForURL('/login');
  }
}
