import { Page, expect } from '@playwright/test';

export class MindMapsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/mind-maps');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldBeVisible() {
    await expect(this.page.locator('[data-testid="mind-maps-title"]')).toBeVisible();
  }

  async shouldShowMindMaps() {
    await expect(this.page.locator('[data-testid="mind-maps-list"]')).toBeVisible();
  }

  async createMindMap(title: string, sourceType: 'lesson' | 'chapter' | 'document', sourceId: string) {
    await this.page.click('[data-testid="create-mind-map-button"]');
    await this.page.fill('[data-testid="mind-map-title-input"]', title);
    await this.page.click(`[data-testid="source-type-${sourceType}"]`);
    await this.page.selectOption('[data-testid="source-select"]', sourceId);
    await this.page.click('[data-testid="generate-button"]');

    // Wait for AI generation
    await this.page.waitForSelector('[data-testid="mind-map-generated"]', {
      state: 'visible',
      timeout: 60000,
    });
  }

  async viewMindMap(mindMapTitle: string) {
    await this.page.click(`[data-testid="mind-map-${mindMapTitle}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowMindMapVisualization() {
    await expect(this.page.locator('[data-testid="mind-map-canvas"]')).toBeVisible();
  }

  async shouldShowNodes() {
    await expect(this.page.locator('[data-testid="mind-map-node"]')).toBeVisible();
  }

  async shouldShowConnections() {
    await expect(this.page.locator('[data-testid="mind-map-connection"]')).toBeVisible();
  }

  async selectLayout(layoutType: 'radial' | 'hierarchical' | 'mind_map') {
    await this.page.click('[data-testid="layout-select"]');
    await this.page.click(`[data-testid="layout-${layoutType}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async selectTheme(theme: 'default' | 'colorful' | 'dark') {
    await this.page.click('[data-testid="theme-select"]');
    await this.page.click(`[data-testid="theme-${theme}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async exportMindMap(format: 'json' | 'image') {
    await this.page.click('[data-testid="export-button"]');
    await this.page.click(`[data-testid="export-${format}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async shareMindMap(isPublic: boolean) {
    await this.page.click('[data-testid="share-button"]');
    await this.page.click(`[data-testid="share-${isPublic ? 'public' : 'private'}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async regenerateLayout() {
    await this.page.click('[data-testid="regenerate-layout-button"]');
    await this.page.waitForSelector('[data-testid="layout-regenerated"]', {
      state: 'visible',
      timeout: 30000,
    });
  }

  async shouldShowAnalytics() {
    await expect(this.page.locator('[data-testid="mind-map-analytics"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="node-count"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="connection-count"]')).toBeVisible();
  }
}
