# Testing Guide for A-Cube E-Receipt SDK

## Overview

This guide provides comprehensive instructions for running, maintaining, and extending the test suite for the A-Cube E-Receipt SDK.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- src/__tests__/cli/commands/base/command.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should format"
```

### Current Test Results

✅ **4 test suites passing**  
✅ **25 tests passing**  
⚠️ **Coverage: 0.78%** (Critical - needs improvement)

## Test Configuration

### Jest Configuration (`jest.config.ts`)

The project uses Jest with TypeScript support:

- **Environment**: Node.js
- **Preset**: ts-jest with ESM support
- **Test Pattern**: `**/__tests__/**/*.test.+(ts|tsx|js)`
- **Coverage Threshold**: 80% (currently not met)
- **Setup**: Custom mocks for CLI dependencies

### Key Configuration Features

```typescript
{
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // CLI-specific mocks
    '^chalk$': '<rootDir>/src/__tests__/__mocks__/chalk.ts',
    '^ora$': '<rootDir>/src/__tests__/__mocks__/ora.ts',
    '^inquirer$': '<rootDir>/src/__tests__/__mocks__/inquirer.ts',
  }
}
```

## Test Structure

### Directory Layout

```
src/__tests__/
├── setup.ts                    # Test configuration
├── __mocks__/                  # Mock implementations
│   ├── chalk.ts
│   ├── ora.ts
│   └── inquirer.ts
├── cli/                        # CLI-related tests
│   ├── commands/
│   │   └── base/
│   │       └── command.test.ts
│   ├── utils/
│   │   └── formatters.test.ts
│   ├── config.test.ts
│   └── types.test.ts
├── core/                       # Core SDK tests (new)
│   └── sdk.test.ts
└── hooks/react/                # React component tests (new)
    └── platform-components.test.tsx
```

### Existing Test Files

1. **Base Command Tests** (`command.test.ts`)
   - Tests command execution flow
   - Error handling and process exit behavior
   - 9 tests covering BaseCommand class

2. **Formatter Tests** (`formatters.test.ts`)
   - Tests output formatting utilities
   - Color and styling functions
   - 11 tests with 100% coverage

3. **Config Tests** (`config.test.ts`)
   - Configuration loading and validation
   - 3 tests covering configuration scenarios

4. **Types Tests** (`types.test.ts`)
   - TypeScript type definition tests
   - 2 tests covering type validation

## Test Categories

### Unit Tests

**Purpose**: Test individual functions and classes in isolation  
**Location**: `src/__tests__/**/*.test.ts`  
**Pattern**: One test file per source file

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });
    
    it('should handle error case', () => {
      // Error scenario test
    });
  });
});
```

### Integration Tests

**Purpose**: Test component interactions  
**Status**: Not yet implemented  
**Recommended**: Add for critical workflows

### End-to-End Tests

**Purpose**: Test complete user workflows  
**Status**: Not yet implemented  
**Recommended**: Add with Playwright or similar

## Mocking Strategy

### CLI Dependencies

The project includes custom mocks for CLI dependencies:

**Chalk Mock** (`__mocks__/chalk.ts`):
```typescript
export default {
  blue: (text: string) => `[BLUE]${text}[/BLUE]`,
  green: (text: string) => `[GREEN]${text}[/GREEN]`,
  // ... other color methods
};
```

**Ora Mock** (`__mocks__/ora.ts`):
```typescript
export default () => ({
  start: jest.fn().mockReturnThis(),
  succeed: jest.fn().mockReturnThis(),
  fail: jest.fn().mockReturnThis(),
});
```

### Best Practices for Mocking

1. **Mock external dependencies** at module level
2. **Use `jest.fn()`** for function mocks
3. **Mock HTTP requests** with MSW (recommended)
4. **Mock React Native modules** for cross-platform testing

## Coverage Analysis

### Current Coverage Status

| Component | Coverage | Priority |
|-----------|----------|----------|
| CLI Utils | High ✅ | Maintain |
| Base Commands | Medium ⚠️ | Improve |
| Core SDK | None ❌ | Critical |
| Auth System | None ❌ | Critical |
| React Components | None ❌ | High |
| Storage/Sync | None ❌ | High |

### Coverage Goals

- **Short-term**: 25% coverage (critical components)
- **Medium-term**: 60% coverage (most components)
- **Long-term**: 80% coverage (comprehensive)

## Writing Tests

### Test Template

```typescript
/**
 * [Component] Tests
 * Tests for [description]
 */

import { ComponentName } from '../path/to/component';

// Mock dependencies
jest.mock('../path/to/dependency', () => ({
  DependencyName: jest.fn(),
}));

describe('ComponentName', () => {
  let component: ComponentName;
  
  beforeEach(() => {
    // Setup before each test
    component = new ComponentName();
  });
  
  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
  
  describe('methodName', () => {
    it('should handle success case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.methodName(input);
      
      // Assert  
      expect(result).toBe('expected');
    });
    
    it('should handle error case', () => {
      // Test error scenarios
      expect(() => {
        component.methodName('invalid');
      }).toThrow('Expected error message');
    });
  });
});
```

### Testing Cross-Platform Components

```typescript
import { render } from '@testing-library/react';
import { PlatformView } from '../platform-components';

describe('PlatformView', () => {
  it('should render correctly on web', () => {
    const { container } = render(
      <PlatformView testID="test">Content</PlatformView>
    );
    
    expect(container.firstChild).toHaveAttribute('data-testid', 'test');
  });
});
```

### Testing Async Operations

```typescript
describe('async operations', () => {
  it('should handle successful API call', async () => {
    const mockResponse = { data: 'test' };
    jest.spyOn(api, 'get').mockResolvedValue(mockResponse);
    
    const result = await service.fetchData();
    
    expect(result).toEqual(mockResponse.data);
    expect(api.get).toHaveBeenCalledWith('/test-endpoint');
  });
  
  it('should handle API errors', async () => {
    const error = new Error('API Error');
    jest.spyOn(api, 'get').mockRejectedValue(error);
    
    await expect(service.fetchData()).rejects.toThrow('API Error');
  });
});
```

## Common Issues & Solutions

### Issue: "Cannot find module" errors

**Solution**: Check module name mapping in `jest.config.ts`

```typescript
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

### Issue: ESM import/export issues

**Solution**: Ensure jest configuration includes:

```typescript
{
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
}
```

### Issue: React Native module not found

**Solution**: Mock React Native modules:

```typescript
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  // ... other components
}));
```

### Issue: Coverage thresholds not met

**Temporary Solution**: Lower thresholds or disable:

```typescript
// jest.config.ts
coverageThreshold: {
  global: {
    branches: 10,  // Lowered from 80
    functions: 10,
    lines: 10,
    statements: 10,
  },
}
```

## Continuous Integration

### GitHub Actions Setup

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run typecheck
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test && npm run typecheck"
    }
  }
}
```

## Development Workflow

### Test-Driven Development (TDD)

1. **Write test first** (red)
2. **Write minimal code** to pass (green)
3. **Refactor** while keeping tests green

### Adding New Features

1. Write tests for new functionality
2. Implement the feature
3. Ensure all tests pass
4. Update documentation

### Bug Fixes

1. Write test that reproduces the bug
2. Fix the bug
3. Ensure the test passes
4. Verify no regressions

## Performance Testing

### Test Execution Time

Current execution time: ~7.5 seconds with coverage

**Optimization strategies**:
- Use `maxWorkers: 1` for debugging
- Increase `maxWorkers` for faster execution
- Use `--onlyChanged` for incremental testing

### Memory Usage

Monitor test memory usage:

```bash
npm test -- --logHeapUsage
```

## Debugging Tests

### Running Single Tests

```bash
# Run specific test file
npm test -- command.test.ts

# Run specific test case
npm test -- --testNamePattern="should execute command"

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### VS Code Debugging

Configure `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Next Steps

### Immediate Actions (Week 1)

1. **Fix test configuration** for new test files
2. **Add core SDK tests** for initialization
3. **Lower coverage thresholds** temporarily

### Short-term Goals (Month 1)

1. **Add authentication tests**
2. **Test critical resource operations**
3. **Implement cross-platform component tests**
4. **Achieve 25% coverage**

### Long-term Goals (Month 3)

1. **Add integration tests**
2. **Implement E2E testing**
3. **Achieve 80% coverage**
4. **Setup automated testing in CI**

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
- [MSW for API Mocking](https://mswjs.io/)

---

For questions or issues with testing, please refer to the [TEST_REPORT.md](./TEST_REPORT.md) for detailed analysis and recommendations.