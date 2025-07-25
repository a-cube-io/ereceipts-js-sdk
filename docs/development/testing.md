# Testing Guide

This document explains how to run tests for the A-Cube e-receipts SDK using our unified Jest configuration.

## 🧪 Test Structure

The SDK uses a unified Jest configuration (`jest.config.ts`) that supports multiple test environments:

- **API & Utils Tests**: Node.js environment for testing API clients, utilities, and validation
- **React Tests**: jsdom environment for testing React components and hooks
- **React Native Tests**: jsdom environment for testing React Native components

## 📁 Test Organization

```
src/__tests__/
├── api/                    # API client tests
│   ├── auth.test.ts       # Authentication tests
│   ├── client.test.ts     # APIClient tests
│   ├── mf1.test.ts        # MF1 API tests
│   └── mf2.test.ts        # MF2 API tests
├── react/                  # React-specific tests
│   ├── EReceiptsProvider.test.tsx
│   └── useOnboardingFlow.test.tsx
├── react-native/           # React Native-specific tests
│   ├── Button.test.tsx
│   ├── FormInput.test.tsx
│   └── EReceiptsProvider.test.tsx
├── utils/                  # Utility function tests
│   └── validation.test.ts  # Zod-based validation tests
├── setup-react.ts          # React test setup
├── setup-react-native.ts   # React Native test setup
└── setup-api.ts           # API test setup
```

## 🚀 Running Tests

### All Tests

Run all tests across all environments:

```bash
npm test
# or
npm run test
```

### Specific Test Categories

#### API & Utils Tests Only

```bash
npm run test:api
```

#### React Tests Only

```bash
npm run test -- --testPathPattern=react
```

#### React Native Tests Only

```bash
npm run test -- --testPathPattern=react-native
```

#### Validation Tests Only

```bash
npm run test -- --testPathPattern=validation
```

### Watch Mode

Run tests in watch mode for development:

```bash
npm run test:watch
```

### Coverage Reports

Generate coverage reports:

```bash
# Full coverage report
npm run test:coverage

# Coverage in watch mode
npm run test:coverage:watch

# CI-friendly coverage
npm run test:coverage:ci

# HTML coverage report
npm run test:coverage:html
```

## 📊 Coverage Thresholds

The project maintains coverage thresholds to ensure code quality:

- **Global**: 5% branches, 5% functions, 10% lines, 10% statements
- **Components**: 60% branches, 35% functions, 60% lines, 60% statements
- **Providers**: 15% branches, 30% functions, 40% lines, 40% statements

## 🔧 Jest Configuration

The unified configuration (`jest.config.ts`) uses Jest's `projects` feature to handle different test environments:

### Project Structure

```typescript
projects: [
  {
    displayName: 'API & Utils Tests',
    testEnvironment: 'node',
    testMatch: [
      '<rootDir>/src/__tests__/api/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '<rootDir>/src/__tests__/utils/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    // ... configuration
  },
  {
    displayName: 'React Tests',
    testEnvironment: 'jsdom',
    testMatch: [
      '<rootDir>/src/__tests__/react/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    // ... configuration
  },
  {
    displayName: 'React Native Tests',
    testEnvironment: 'jsdom',
    testMatch: [
      '<rootDir>/src/__tests__/react-native/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    // ... configuration
  }
]
```

### Key Features

- **Environment Isolation**: Each project uses the appropriate test environment
- **Setup Files**: Custom setup files for each environment
- **Module Mapping**: Consistent import aliases across all environments
- **Transform Patterns**: Optimized transformations for each environment
- **Coverage Collection**: Separate coverage directories for each project

## 🧪 Writing Tests

### API Tests

API tests run in a Node.js environment and test API clients, utilities, and validation functions:

```typescript
import { APIClient } from '../../api/client';

describe('APIClient', () => {
  it('should create client with default configuration', () => {
    const client = new APIClient();
    expect(client).toBeDefined();
  });
});
```

### React Tests

React tests use jsdom and test React components and hooks:

```typescript
import { render, screen } from '@testing-library/react';
import { EReceiptsProvider } from '../../providers/EReceiptsProvider';

describe('EReceiptsProvider', () => {
  it('should render with default state', () => {
    render(
      <EReceiptsProvider>
        <div>Test</div>
      </EReceiptsProvider>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### React Native Tests

React Native tests also use jsdom but include React Native-specific setup:

```typescript
import { render } from '@testing-library/react-native';
import { Button } from '../../components/react-native/Button';

describe('Button', () => {
  it('should render with title', () => {
    const { getByText } = render(<Button title="Test Button" />);
    expect(getByText('Test Button')).toBeTruthy();
  });
});
```

## 🔍 Test Utilities

### Custom Render Functions

The project provides custom render functions for each environment:

- `src/__tests__/react/test-utils.tsx` - React test utilities
- `src/__tests__/react-native/test-utils.tsx` - React Native test utilities

### Mocking

Common mocking patterns:

```typescript
// Mock API calls
jest.mock('../../api/client');

// Mock storage
jest.mock('../../storage/token');

// Mock network
jest.mock('../../utils/network');
```

## 🐛 Debugging Tests

### Verbose Output

Run tests with verbose output:

```bash
npm run test:silent
```

### Debug Specific Tests

Use Jest's `--testNamePattern` to run specific tests:

```bash
npm test -- --testNamePattern="should create merchant"
```

### Debug Configuration

Check Jest configuration:

```bash
npx jest --config jest.config.ts --showConfig
```

## 📈 Continuous Integration

The project includes GitHub Actions workflows that run tests automatically:

- **Pull Requests**: Run all tests and generate coverage reports
- **Main Branch**: Run tests and update coverage badges
- **Releases**: Run tests before publishing

## 🎯 Best Practices

1. **Test Organization**: Group related tests using `describe` blocks
2. **Test Names**: Use descriptive test names that explain the expected behavior
3. **Mocking**: Mock external dependencies to isolate units under test
4. **Coverage**: Aim for high coverage, especially for critical paths
5. **Performance**: Keep tests fast and avoid unnecessary setup/teardown
6. **Maintenance**: Update tests when changing implementation

## 🚨 Common Issues

### React Native Test Warnings

Some React Native tests may show warnings about `react-test-renderer` being deprecated. These are expected and don't affect test functionality.

### Network Errors in Tests

Tests that make network calls may fail if the network is unavailable. Use proper mocking to avoid this:

```typescript
jest.mock('../../utils/network', () => ({
  NetworkManager: {
    isConnected: jest.fn().mockReturnValue(true)
  }
}));
```

### Coverage Threshold Failures

If coverage thresholds are not met, the build will fail. Focus on improving test coverage for the failing areas.

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [TypeScript Testing](https://jestjs.io/docs/getting-started#using-typescript) 