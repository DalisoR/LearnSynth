import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async loginAsStudent() {
    await this.page.fill('[data-testid="email-input"]', 'student@test.com');
    await this.page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async loginAsInstructor() {
    await this.page.fill('[data-testid="email-input"]', 'instructor@test.com');
    await this.page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async loginAsAdmin() {
    await this.page.fill('[data-testid="email-input"]', 'admin@test.com');
    await this.page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async shouldShowError(message: string) {
    const errorElement = this.page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(message);
  }

  async shouldShowValidationError(field: 'email' | 'password', message: string) {
    const fieldElement = this.page.locator(`[data-testid="${field}-input"]`);
    const errorElement = this.page.locator(`[data-testid="${field}-error"]`);
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText(message);
  }

  async shouldRedirectToDashboard() {
    await this.page.waitForURL('/dashboard');
    await expect(this.page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  }

  async shouldShowForgotPasswordLink() {
    await expect(this.page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
  }

  async shouldShowRegisterLink() {
    await expect(this.page.locator('[data-testid="register-link"]')).toBeVisible();
  }

  async clickForgotPassword() {
    await this.page.click('[data-testid="forgot-password-link"]');
    await this.page.waitForURL('/forgot-password');
  }

  async clickRegisterLink() {
    await this.page.click('[data-testid="register-link"]');
    await this.page.waitForURL('/register');
  }
}
