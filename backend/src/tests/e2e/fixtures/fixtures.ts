import { test as base, Page, BrowserContext } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SubjectsPage } from '../pages/SubjectsPage';
import { KnowledgeBasePage } from '../pages/KnowledgeBasePage';
import { LessonWorkspacePage } from '../pages/LessonWorkspacePage';
import { ChatPage } from '../pages/ChatPage';
import { StudyGroupsPage } from '../pages/StudyGroupsPage';
import { FlashcardsPage } from '../pages/FlashcardsPage';
import { MindMapsPage } from '../pages/MindMapsPage';
import { PracticeProblemsPage } from '../pages/PracticeProblemsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { testUsers } from './testData';

type LearnSynthFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  subjectsPage: SubjectsPage;
  knowledgeBasePage: KnowledgeBasePage;
  lessonWorkspacePage: LessonWorkspacePage;
  chatPage: ChatPage;
  studyGroupsPage: StudyGroupsPage;
  flashcardsPage: FlashcardsPage;
  mindMapsPage: MindMapsPage;
  practiceProblemsPage: PracticeProblemsPage;
  analyticsPage: AnalyticsPage;
};

export const test = base.extend<LearnSynthFixtures>({
  page: async ({ page }, use) => {
    // Set up common page configurations
    await page.context().addInitScript(() => {
      // Mock localStorage for tests
      window.localStorage.setItem('test-mode', 'true');
    });

    await use(page);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  subjectsPage: async ({ page }, use) => {
    await use(new SubjectsPage(page));
  },

  knowledgeBasePage: async ({ page }, use) => {
    await use(new KnowledgeBasePage(page));
  },

  lessonWorkspacePage: async ({ page }, use) => {
    await use(new LessonWorkspacePage(page));
  },

  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },

  studyGroupsPage: async ({ page }, use) => {
    await use(new StudyGroupsPage(page));
  },

  flashcardsPage: async ({ page }, use) => {
    await use(new FlashcardsPage(page));
  },

  mindMapsPage: async ({ page }, use) => {
    await use(new MindMapsPage(page));
  },

  practiceProblemsPage: async ({ page }, use) => {
    await use(new PracticeProblemsPage(page));
  },

  analyticsPage: async ({ page }, use) => {
    await use(new AnalyticsPage(page));
  },
});

export { expect } from '@playwright/test';

// Helper function to login a test user
export async function loginTestUser(page: Page, userEmail?: string) {
  const email = userEmail || testUsers[0].email;
  const password = testUsers[0].password;

  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.click('[data-testid="login-button"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');

  return {
    email,
    password,
  };
}

// Helper function to create a test user
export async function createTestUser(page: Page) {
  await page.goto('/register');
  const timestamp = Date.now();
  const email = `test-${timestamp}@example.com`;
  const password = 'TestPassword123!';

  await page.fill('[data-testid="email-input"]', email);
  await page.fill('[data-testid="password-input"]', password);
  await page.fill('[data-testid="fullname-input"]', `Test User ${timestamp}`);
  await page.click('[data-testid="register-button"]');

  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');

  return {
    email,
    password,
  };
}

// Helper function to upload a test document
export async function uploadTestDocument(page: Page, filePath: string, subjectName: string) {
  // Navigate to knowledge base
  await page.goto('/knowledge-base');
  await page.waitForLoadState('networkidle');

  // Click upload button
  await page.click('[data-testid="upload-document-button"]');

  // Select subject
  await page.click('[data-testid="subject-select"]');
  await page.click(`[data-testid="subject-option-${subjectName}"]`);

  // Upload file (this would require actual file handling)
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(filePath);

  // Click upload
  await page.click('[data-testid="confirm-upload-button"]');

  // Wait for processing
  await page.waitForSelector('[data-testid="upload-success-message"]', {
    state: 'visible',
    timeout: 30000,
  });

  return {
    success: true,
  };
}

// Helper function to take a screenshot with timestamp
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

// Helper function to wait for loading spinner
export async function waitForLoading(page: Page, timeout = 30000) {
  await page.waitForSelector('[data-testid="loading-spinner"]', {
    state: 'visible',
    timeout,
  });
  await page.waitForSelector('[data-testid="loading-spinner"]', {
    state: 'hidden',
    timeout,
  });
}

// Helper function to check for console errors
export async function checkForConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  return errors;
}

// Helper function to check accessibility
export async function checkAccessibility(page: Page) {
  const results: any[] = [];
  // This would use @axe-core/playwright
  // const accessibilityScanResults = await new AxePuppeteer(page).analyze();
  // results.push(accessibilityScanResults);

  return results;
}
