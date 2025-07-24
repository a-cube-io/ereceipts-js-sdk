# Onboarding State Persistence in Tests

## Overview

The `useOnboardingFlow` hook includes a state persistence feature that automatically loads saved onboarding state when the component mounts. While this is essential for real-world usage, it can interfere with tests if not properly managed.

## The Problem

### Core Issue

The `useOnboardingFlow` hook loads persisted onboarding state from `SecureTokenStorage.getItem()` inside a `useEffect` on mount. This overrides the initial `input.step` value passed to the hook in tests, unless explicitly mocked to return `null` or `undefined`.

### Example of the Problem

```typescript
// ❌ This test will fail
it('should start with authentication step', () => {
  const { result } = renderHook(() => useOnboardingFlow({
    role: 'provider',
    step: 'authentication',
    credentials: { email: 'test@example.com', password: 'password' }
  }));

  // ❌ This will fail if there's persisted state
  expect(result.current.state.step).toBe('authentication');
});
```

If there's persisted state in storage, the hook will:
1. Load the persisted step (e.g., `'merchant_creation'`)
2. Override the `input.step` parameter
3. The test fails because it gets `'merchant_creation'` instead of `'authentication'`

## The Solution

### 1. Test Utilities

We've created comprehensive test utilities to manage onboarding state persistence:

#### `mockNoPersistedState()`
Ensures clean state with no persisted onboarding data:

```typescript
import { mockNoPersistedState } from './test-utils';

beforeEach(() => {
  jest.clearAllMocks();
  mockNoPersistedState(); // Ensures clean state
});
```

#### `mockPersistedState(step, merchantUuid?, posSerial?)`
Mocks specific persisted state for testing state restoration:

```typescript
import { mockPersistedState } from './test-utils';

it('should restore persisted state', () => {
  mockPersistedState('merchant_creation', 'stored-uuid', 'stored-pos');
  
  const { result } = renderHook(() => useOnboardingFlow(input));
  
  expect(result.current.state.step).toBe('merchant_creation');
  expect(result.current.state.result.merchantUuid).toBe('stored-uuid');
});
```

#### `clearOnboardingStorage()`
Clears all onboarding-related storage operations:

```typescript
import { clearOnboardingStorage } from './test-utils';

beforeEach(() => {
  clearOnboardingStorage(); // Ensures no storage side effects
});
```

### 2. Best Practices

#### Always Reset State in beforeEach

```typescript
describe('useOnboardingFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // ✅ Always ensure clean onboarding state
    mockNoPersistedState();
    clearOnboardingStorage();
    
    // Other mocks...
  });
});
```

#### Use Specific State for State Restoration Tests

```typescript
it('should handle React Native app lifecycle state persistence', () => {
  // ✅ Mock specific persisted state for this test
  mockPersistedState('merchant_creation', 'stored-merchant-uuid', 'stored-pos-serial');

  const { result } = renderHook(() => useOnboardingFlow(providerInput));

  await waitFor(() => {
    expect(result.current.state.step).toBe('merchant_creation');
  });
});
```

#### Explicitly Control State When Needed

```typescript
it('should complete merchant onboarding with clean state', () => {
  // ✅ Explicitly ensure clean state for this test
  mockNoPersistedState();
  
  const { result } = renderHook(() => useOnboardingFlow(merchantInput));
  
  expect(result.current.state.step).toBe('authentication');
});
```

### 3. Implementation Details

#### Test Utilities Implementation

```typescript
// src/__tests__/react-native/test-utils.tsx
export const mockNoPersistedState = () => {
  const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
  mockSecureTokenStorage.getItem.mockImplementation(async (key) => {
    // Explicitly return null for all onboarding-related keys
    if (key === STORAGE_KEYS.ONBOARDING_STEP) return null;
    if (key === STORAGE_KEYS.MERCHANT_UUID) return null;
    if (key === STORAGE_KEYS.CURRENT_POS_SERIAL) return null;
    return null;
  });
};

export const mockPersistedState = (step: string, merchantUuid?: string, posSerial?: string) => {
  const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
  mockSecureTokenStorage.getItem.mockImplementation(async (key) => {
    if (key === STORAGE_KEYS.ONBOARDING_STEP) return step;
    if (key === STORAGE_KEYS.MERCHANT_UUID) return merchantUuid || null;
    if (key === STORAGE_KEYS.CURRENT_POS_SERIAL) return posSerial || null;
    return null;
  });
};
```

#### Hook State Persistence Logic

```typescript
// src/hooks/useOnboardingFlow.ts
useEffect(() => {
  const loadPersistedState = async () => {
    try {
      const savedStep = await SecureTokenStorage.getItem(STORAGE_KEYS.ONBOARDING_STEP);
      const merchantUuid = await SecureTokenStorage.getItem(STORAGE_KEYS.MERCHANT_UUID);
      const posSerial = await SecureTokenStorage.getItem(STORAGE_KEYS.CURRENT_POS_SERIAL);

      if (savedStep && savedStep !== 'completed') {
        updateState({
          step: savedStep as OnboardingStep,
          result: {
            merchantUuid: merchantUuid ? merchantUuid : undefined,
            posSerialNumber: posSerial ? posSerial : undefined
          }
        });
      }
    } catch (error) {
      apiLogger.error('Failed to load persisted onboarding state', error);
    }
  };

  void loadPersistedState();
}, [updateState]);
```

## Why This Approach Works

### 1. **Test Isolation**
Each test starts with a clean slate, preventing interference between tests.

### 2. **Explicit Control**
Tests can explicitly control what persisted state (if any) should be loaded.

### 3. **Realistic Testing**
Tests can verify both clean state behavior and state restoration behavior.

### 4. **Maintainable**
Centralized utilities make it easy to update state management across all tests.

## Common Patterns

### Testing Clean State
```typescript
it('should start with authentication step', () => {
  mockNoPersistedState(); // ✅ Clean state
  
  const { result } = renderHook(() => useOnboardingFlow(input));
  
  expect(result.current.state.step).toBe('authentication');
});
```

### Testing State Restoration
```typescript
it('should restore persisted state', () => {
  mockPersistedState('merchant_creation', 'uuid-123'); // ✅ Specific state
  
  const { result } = renderHook(() => useOnboardingFlow(input));
  
  expect(result.current.state.step).toBe('merchant_creation');
  expect(result.current.state.result.merchantUuid).toBe('uuid-123');
});
```

### Testing Step Execution
```typescript
it('should execute authentication step', async () => {
  mockNoPersistedState(); // ✅ Clean state for step execution
  
  const { result } = renderHook(() => useOnboardingFlow(input));
  
  await act(async () => {
    await result.current.compute();
  });
  
  expect(result.current.state.step).toBe('authentication');
});
```

## Conclusion

This approach ensures that:
- ✅ Tests are reliable and deterministic
- ✅ State persistence is properly tested
- ✅ Tests don't interfere with each other
- ✅ The codebase maintains real-world functionality
- ✅ Test maintenance is straightforward

The key insight is that **state persistence is a feature, not a bug**, and tests should explicitly control this behavior rather than fighting against it. 