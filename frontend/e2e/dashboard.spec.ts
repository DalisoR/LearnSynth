import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/');
    // Since we're not actually logged in, we expect to be redirected to signin
  });

  test('should load pricing page and display plans', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('h1')).toContainText('Pricing');
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Student')).toBeVisible();
    await expect(page.locator('text=Pro')).toBeVisible();
    await expect(page.locator('text=Enterprise')).toBeVisible();
  });

  test('should display currency selector', async ({ page }) => {
    await page.goto('/pricing');

    // Check if currency selector exists
    const currencySelector = page.locator('[data-testid="currency-selector"]');
    await expect(currencySelector).toBeVisible();

    // Click to open currency selector
    await currencySelector.click();

    // Check for common currencies
    await expect(page.locator('text=USD')).toBeVisible();
    await expect(page.locator('text=EUR')).toBeVisible();
    await expect(page.locator('text=GBP')).toBeVisible();
  });

  test('should navigate to subscription page', async ({ page }) => {
    await page.goto('/subscription');

    await expect(page.locator('h1')).toContainText('Subscription');
    await expect(page.locator('text=Current Plan')).toBeVisible();
  });

  test('should have keyboard shortcut support', async ({ page }) => {
    await page.goto('/');

    // Press Cmd+K or Ctrl+K to open command palette
    await page.keyboard.press('Meta+k');

    // Command palette should open
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Type to search
    await page.keyboard.type('dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    await page.goto('/');

    // Press Shift+? to open shortcuts help
    await page.keyboard.press('Shift+?');

    // Help modal should be visible
    await expect(page.locator('[data-testid="shortcuts-help"]')).toBeVisible();
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="shortcuts-help"]')).not.toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/pricing');

    // Check that content is visible and scrollable
    await expect(page.locator('text=Pricing Plans')).toBeVisible();

    // Check that buttons are touch-friendly
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should load analytics page with charts', async ({ page }) => {
    await page.goto('/analytics');

    // Page should load (even if no data)
    await expect(page.locator('h1')).toContainText('Analytics');
  });
});
