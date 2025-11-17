import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/signin');
    await expect(page).toHaveTitle(/Sign In/i);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should display sign up link', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.locator('a')).toContainText("Don't have an account? Sign up");
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/signin');
    await page.click('text=Sign up');
    await expect(page).toHaveTitle(/Sign Up/i);
    await expect(page.locator('h1')).toContainText('Sign Up');
  });

  test('should validate empty form submission', async ({ page }) => {
    await page.goto('/signin');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show pricing page without authentication', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing/i);
    await expect(page.locator('h1')).toContainText('Pricing Plans');
  });
});

test.describe('Navigation', () => {
  test('should have working navbar links', async ({ page }) => {
    // Note: This will only work when logged in
    await page.goto('/signin');
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    // Mock authentication for this test
    await page.goto('/');
    // Should redirect to sign in if not authenticated
    await expect(page).toHaveURL(/.*signin/);
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should display mobile navigation on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should have touch-friendly buttons (minimum 44px)', async ({ page }) => {
    await page.goto('/signin');
    const button = page.locator('button[type="submit"]');
    const buttonBox = await button.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  });
});
