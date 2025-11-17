import { Page, expect } from '@playwright/test';

export class AnalyticsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/analytics');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="analytics-title"]')).toBeVisible();
  }

  async shouldShowLearningProgress() {
    await expect(this.page.locator('[data-testid="learning-progress-chart"]')).toBeVisible();
  }

  async shouldShowTimeSpent() {
    await expect(this.page.locator('[data-testid="time-spent-chart"]')).toBeVisible();
  }

  async shouldShowAccuracyTrends() {
    await expect(this.page.locator('[data-testid="accuracy-trends-chart"]')).toBeVisible();
  }

  async shouldShowKnowledgeGaps() {
    await expect(this.page.locator('[data-testid="knowledge-gaps-list"]')).toBeVisible();
  }

  async shouldShowSubjectBreakdown() {
    await expect(this.page.locator('[data-testid="subject-breakdown-chart"]')).toBeVisible();
  }

  async selectTimeRange(range: 'week' | 'month' | 'year') {
    await this.page.click('[data-testid="time-range-select"]');
    await this.page.click(`[data-testid="range-${range}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shouldUpdateCharts(timeRange: 'week' | 'month' | 'year') {
    // Verify charts update based on time range
    const chartTitle = this.page.locator('[data-testid="current-range-title"]');
    await expect(chartTitle).toContainText(timeRange);
  }

  async filterBySubject(subjectName: string) {
    await this.page.click('[data-testid="subject-filter"]');
    await this.page.click(`[data-testid="filter-${subjectName}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowHeatmap() {
    await expect(this.page.locator('[data-testid="learning-heatmap"]')).toBeVisible();
  }

  async shouldShowProductivityInsights() {
    await expect(this.page.locator('[data-testid="productivity-insights"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="study-streak"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="total-study-time"]')).toBeVisible();
  }

  async shouldShowRecommendations() {
    await expect(this.page.locator('[data-testid="recommendations-list"]')).toBeVisible();
  }

  async exportReport(format: 'pdf' | 'csv') {
    await this.page.click('[data-testid="export-report-button"]');
    await this.page.click(`[data-testid="export-${format}"]`);
    await this.page.waitForLoadState('networkidle');
  }
}
