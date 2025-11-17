# Testing Guide

This document outlines the comprehensive testing strategy for LearnSynth.

## 🧪 Testing Stack

- **Jest** - Unit and integration tests
- **React Testing Library** - Component testing
- **Playwright** - End-to-end (E2E) testing
- **@testing-library/jest-dom** - Custom Jest matchers
- **@testing-library/user-event** - User interaction simulation

## 📁 Test Structure

```
frontend/
├── src/
│   ├── components/__tests__/     # Component tests
│   ├── pages/__tests__/          # Page tests
│   ├── hooks/__tests__/          # Hook tests
│   ├── contexts/__tests__/       # Context tests
│   └── test/
│       ├── setup.ts              # Test setup and mocks
│       └── utils.tsx             # Test utilities
└── e2e/
    ├── auth.spec.ts              # Authentication flow
    ├── dashboard.spec.ts         # Dashboard functionality
    └── *.spec.ts                 # Other E2E tests
```

## 🚀 Running Tests

### Unit & Integration Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Show E2E test report
npm run test:e2e:report
```

### Browser Testing

Playwright tests run across:
- **Chromium** (Desktop Chrome)
- **Firefox** (Desktop Firefox)
- **WebKit** (Desktop Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

## 📊 Coverage Requirements

The project maintains a **70% coverage threshold** for:
- Branches
- Functions
- Lines
- Statements

Run coverage reports:
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

## ✅ Test Coverage

### Component Tests

✅ **Accessibility Components**
- AccessibleButton (keyboard navigation, ARIA labels)
- SkipToContent (accessibility link)
- AccessibleInput (form validation, error handling)

✅ **Toast System**
- Success/Error/Warning/Info toasts
- Toast dismissal

✅ **Dashboard**
- Renders correctly
- Navigation functionality
- Statistics display

### E2E Tests

✅ **Authentication Flow**
- Sign in page navigation
- Form validation
- Pricing page access (public)
- Redirect handling

✅ **Dashboard Functionality**
- Pricing page with currency selector
- Keyboard shortcuts (Cmd+K, Shift+?)
- Mobile responsiveness
- Navigation

✅ **Mobile Testing**
- Touch-friendly buttons (44px minimum)
- Responsive layout
- Mobile navigation

## 🎯 Writing Tests

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from '@jest/globals';
import Component from '../Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('is accessible', () => {
    render(<Component aria-label="Close dialog" />);
    expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');

  // Test keyboard shortcuts
  await page.keyboard.press('Meta+k');
  await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
});
```

## 🔧 Test Configuration

### Jest Configuration
- `jest.config.ts` - Jest setup and configuration
- `src/test/setup.ts` - Test environment setup and mocks

### Playwright Configuration
- `playwright.config.ts` - Browser configuration and project setup
- Tests run in parallel across all browsers
- Screenshots and videos captured on failures

## 📝 Best Practices

1. **Test Behavior, Not Implementation**
   - Test what users see and do
   - Avoid testing internal functions

2. **Use Accessibility Testing**
   - Test ARIA labels and roles
   - Verify keyboard navigation
   - Check screen reader compatibility

3. **Mock External Dependencies**
   - API calls
   - Browser APIs (localStorage, sessionStorage)
   - External services

4. **Write Descriptive Tests**
   - Use clear test descriptions
   - Group related tests with `describe`
   - Test one thing per test

5. **Maintain Test Data**
   - Use factories for test data
   - Keep tests independent
   - Clean up after each test

## 🐛 Debugging Tests

### Unit Tests
```bash
# Run specific test file
npm test Component.test.tsx

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests
```bash
# Run with UI for debugging
npm run test:e2e:ui

# Run in headed mode
npx playwright test --headed

# Debug specific test
npx playwright test auth.spec.ts --debug
```

## 📈 Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Scheduled runs (daily)

CI pipeline:
1. Install dependencies
2. Run linting
3. Run unit tests with coverage
4. Build application
5. Run E2E tests
6. Upload coverage reports

## 🔍 Coverage Reports

View detailed coverage reports:
- HTML report: `coverage/lcov-report/index.html`
- Terminal output: Available after running `npm run test:coverage`

Coverage badges available for:
- Overall coverage percentage
- Per-component coverage
- Branch coverage

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)

## 🎓 Future Enhancements

- [ ] Visual regression testing (Chromatic)
- [ ] Performance testing (Lighthouse CI)
- [ ] Accessibility testing (axe-core)
- [ ] API integration testing (MSW)
- [ ] Snapshot testing for components
- [ ] Storybook integration
