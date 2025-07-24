# useOnboardingFlow Hook

The `useOnboardingFlow` hook provides a complete onboarding solution for both `provider` and `merchant` roles in the A-Cube E-Receipts SDK. It orchestrates the entire onboarding process with intelligent state management, comprehensive error handling, and smart flow progression.

## Overview

This hook handles the complex multi-step onboarding flows required for Italian e-receipt system compliance with intelligent logic that adapts to existing resources and states:

- **Provider Flow**: Authentication → Merchant Check → Merchant Creation → POS Setup → Completion
- **Merchant Flow**: Authentication → POS Activation → Cash Register Creation → Completion

### 🧠 Smart Flow Logic

The hook implements intelligent flow management that:

- **Skips completed steps** automatically (e.g., if already authenticated)
- **Handles existing resources** gracefully (e.g., existing merchants, active POS devices)
- **Validates prerequisites** before executing each step
- **Provides detailed error messages** for troubleshooting
- **Recovers from interruptions** with state persistence

## Features

- ✅ **Role-based Flow Management** - Handles both provider and merchant onboarding
- ✅ **Smart Step Skipping** - Automatically skips completed steps and existing resources
- ✅ **Intelligent Resource Handling** - Gracefully manages existing merchants, POS devices, and cash registers
- ✅ **Comprehensive Error Handling** - Step-specific error messages with actionable guidance
- ✅ **Prerequisite Validation** - Validates requirements before executing each step
- ✅ **Automatic State Persistence** - Survives app restarts and network interruptions  
- ✅ **Progress Tracking** - Real-time progress percentage updates
- ✅ **Network Awareness** - Handles offline/online scenarios with connectivity validation
- ✅ **React/React Native Compatible** - Works seamlessly in both environments
- ✅ **EReceiptsProvider Integration** - Fully compatible with the provider context

## API Reference

### Hook Signature

```typescript
const { state, compute, reset, clearError } = useOnboardingFlow(input: UseOnboardingFlowInput);
```

> **Note**: The hook uses `compute()` instead of `onboard()` to execute individual steps with full control over the flow progression.

### Input Parameters

```typescript
interface UseOnboardingFlowInput {
  role: 'provider' | 'merchant';
  credentials: {
    email: string;
    password: string;
  };
  merchantInfo?: {
    fiscalId: string;
    name: string;
    email: string;
    address: {
      streetAddress: string;
      zipCode: string;
      city: string;
      province: string;
    };
  };
  posInfo?: {
    address: {
      streetAddress: string;
      zipCode: string;
      city: string;
      province: string;
    };
  };
  registrationKey?: string; // Required for merchant role
}
```

### Return Values

```typescript
interface UseOnboardingFlowReturn {
  state: {
    loading: boolean;
    step: 'authentication' | 'merchant_check' | 'merchant_creation' | 
          'pos_creation' | 'pos_activation' | 'cash_register_creation' | 
          'completed' | 'error';
    error: string | null;
    progress: number; // 0-100
    result: {
      merchantUuid?: string;
      posSerialNumber?: string;
      registrationKey?: string;
      cashRegisterId?: string;
      mtlsCertificate?: string;
    };
  };
  compute: () => Promise<void>; // Execute current step
  reset: () => void; // Reset to initial state
  clearError: () => void; // Clear current error
}
```

## Usage Examples

### Provider Onboarding

```tsx
import React from 'react';
import { useOnboardingFlow, EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';

function ProviderOnboarding() {
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: 'authentication', // Start with authentication step
    credentials: {
      email: 'provider@example.com',
      password: 'securePassword123'
    },
    merchantInfo: {
      fiscalId: '12345678901',
      name: 'My Store',
      email: 'store@example.com',
      address: {
        streetAddress: 'Via Roma 1',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM'
      }
    }
  });

  const handleStepExecution = async () => {
    try {
      await compute(); // Execute current step
      
      // Smart progression logic
      if (state.step === 'authentication' && !state.error) {
        // Move to merchant check after successful authentication
        // The hook will automatically handle existing merchants
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  return (
    <div>
      <h2>Provider Onboarding</h2>
      
      {/* Progress indicator */}
      <div>
        <div>Step: {state.step}</div>
        <div>Progress: {state.progress}%</div>
        <progress value={state.progress} max={100} />
      </div>

      {/* Error handling with specific guidance */}
      {state.error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          <strong>Error:</strong> {state.error}
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}

      {/* Actions */}
      <div>
        <button 
          onClick={handleStepExecution} 
          disabled={state.loading || state.step === 'completed'}
        >
          {state.loading ? 'Processing...' : `Execute ${state.step} Step`}
        </button>
        <button onClick={reset}>Reset</button>
      </div>

      {/* Success result */}
      {state.step === 'completed' && (
        <div style={{ color: 'green' }}>
          <h3>Onboarding Complete!</h3>
          <p>Merchant UUID: {state.result.merchantUuid}</p>
          <p>POS Serial: {state.result.posSerialNumber}</p>
        </div>
      )}
    </div>
  );
}

// Wrap with EReceiptsProvider
function App() {
  return (
    <EReceiptsProvider config={{ environment: 'sandbox' }}>
      <ProviderOnboarding />
    </EReceiptsProvider>
  );
}
```

### Merchant Onboarding

```tsx
import React from 'react';
import { useOnboardingFlow } from '@a-cube-io/ereceipts-js-sdk';

function MerchantOnboarding() {
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'merchant',
    step: 'pos_activation', // Start with POS activation
    credentials: {
      email: 'merchant@example.com',
      password: 'securePassword123'
    },
    registrationKey: 'POS-REGISTRATION-KEY-123'
  });

  const handleStepExecution = async () => {
    try {
      await compute(); // Execute current step
      
      // Smart progression logic
      if (state.step === 'pos_activation' && !state.error) {
        // Move to cash register creation after successful POS activation
        // The hook will verify POS is active before proceeding
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  return (
    <div>
      <h2>Merchant Onboarding</h2>
      
      <div>Current Step: {state.step}</div>
      <div>Progress: {state.progress}%</div>
      
      {state.error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          <strong>Error:</strong> {state.error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}

      <button onClick={handleStepExecution} disabled={state.loading}>
        {state.loading ? 'Processing...' : `Execute ${state.step} Step`}
      </button>

      {state.step === 'completed' && (
        <div>
          <h3>Setup Complete!</h3>
          <p>Cash Register ID: {state.result.cashRegisterId}</p>
          <p>mTLS Certificate: {state.result.mtlsCertificate ? 'Installed' : 'Not available'}</p>
        </div>
      )}
    </div>
  );
}
```

### React Native Usage

```tsx
import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useOnboardingFlow, EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';

function ReactNativeOnboarding() {
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: 'authentication', // Start with authentication
    credentials: {
      email: 'mobile@example.com',
      password: 'mobilePass123'
    },
    merchantInfo: {
      fiscalId: '98765432109',
      name: 'Mobile Store',
      email: 'mobile@store.com',
      address: {
        streetAddress: 'Via Mobile 1',
        zipCode: '20100',
        city: 'Milano',
        province: 'MI'
      }
    }
  });

  const handleStepExecution = async () => {
    try {
      await compute(); // Execute current step
      
      if (state.step === 'completed') {
        Alert.alert('Success', 'Onboarding completed successfully!');
      } else if (state.error) {
        Alert.alert('Error', state.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Step execution failed. Please try again.');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Mobile Onboarding
      </Text>
      
      <Text>Step: {state.step}</Text>
      <Text>Progress: {state.progress}%</Text>
      
      {state.error && (
        <View style={{ marginVertical: 10, padding: 10, backgroundColor: '#ffebee' }}>
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Error:</Text>
          <Text style={{ color: 'red' }}>{state.error}</Text>
          <Button title="Clear Error" onPress={clearError} />
        </View>
      )}

      <View style={{ marginTop: 20 }}>
        <Button
          title={state.loading ? 'Processing...' : `Execute ${state.step} Step`}
          onPress={handleStepExecution}
          disabled={state.loading}
        />
        <Button title="Reset" onPress={reset} />
      </View>
    </View>
  );
}

// App.tsx with provider setup
export default function App() {
  return (
    <EReceiptsProvider 
      config={{ 
        environment: 'sandbox',
        enableLogging: __DEV__ 
      }}
    >
      <ReactNativeOnboarding />
    </EReceiptsProvider>
  );
}
```

## Smart Flow Logic

### 🧠 Intelligent Step Management

The hook implements smart logic that adapts to existing resources and states:

#### **Provider Flow Intelligence:**

- **Authentication**: Skips login if user already authenticated
- **Merchant Check**: Detects existing merchants and skips creation
- **Merchant Creation**: Handles duplicate fiscal IDs gracefully
- **POS Creation**: Uses available NEW or REGISTERED devices

#### **Merchant Flow Intelligence:**

- **Authentication**: Skips login if merchant already authenticated
- **POS Activation**: Detects already active POS devices
- **Cash Register**: Verifies POS is active before creation

### 🔍 Prerequisite Validation

Each step validates prerequisites before execution:

```typescript
// Example: Cash Register Creation validation
if (!posSerialNumber) {
  throw new Error(
    'POS serial number is required for cash register creation. ' +
    'Please ensure POS activation step has been completed successfully.'
  );
}

// Verify POS is active before creating cash register
const posDevices = await getPointOfSales('ACTIVE', 1, 10);
const isPOSActive = posDevices.members?.some(pos => pos.serial_number === posSerialNumber);

if (!isPOSActive) {
  throw new Error(
    `POS device ${posSerialNumber} is not active. ` +
    'Please ensure POS activation step has been completed successfully before creating cash register.'
  );
}
```

## Flow Details

### Provider Flow Steps

1. **Authentication** (20% progress)
   - ✅ Check if user is already authenticated
   - ✅ Login with provided credentials if needed
   - ✅ Store authentication token securely
   - 🧠 **Smart**: Skips if already authenticated

2. **Merchant Check** (40% progress)
   - ✅ Query existing merchants for the provider
   - ✅ Skip creation if merchants already exist
   - ✅ Proceed to POS setup if merchants found
   - 🧠 **Smart**: Detects existing merchants automatically

3. **Merchant Creation** (60% progress)
   - ✅ Create new merchant with provided information
   - ✅ Store merchant UUID for future operations
   - ✅ Validate all required merchant data
   - 🧠 **Smart**: Handles duplicate fiscal IDs with specific errors

4. **POS Creation** (80% progress)
   - ✅ Find available POS devices in system
   - ✅ Use NEW or REGISTERED devices
   - ✅ Store POS serial number and registration key
   - 🧠 **Smart**: Uses available devices, provides specific error messages

5. **Completed** (100% progress)
   - ✅ All provider setup completed
   - ✅ Ready for merchant operations

### Merchant Flow Steps

1. **Authentication** (25% progress)
   - ✅ Verify merchant authentication
   - ✅ Login if not already authenticated
   - ✅ Validate merchant permissions
   - 🧠 **Smart**: Skips if already authenticated

2. **POS Activation** (50% progress)
   - ✅ Activate POS device with registration key
   - ✅ Verify POS device availability
   - ✅ Establish POS-merchant relationship
   - 🧠 **Smart**: Detects already active POS devices

3. **Cash Register Creation** (75% progress)
   - ✅ Create cash register for the POS
   - ✅ Install mTLS certificate for secure communication
   - ✅ Configure cash register settings
   - 🧠 **Smart**: Verifies POS is active before creation

4. **Completed** (100% progress)
   - ✅ Merchant setup completed
   - ✅ Ready for receipt operations

## State Persistence

The hook automatically persists onboarding state using `SecureTokenStorage`:

- **Cross-platform storage** (React Native Keychain, Web IndexedDB/localStorage)
- **App restart recovery** - Resumes from last completed step
- **Network interruption handling** - Continues when connection restored
- **Background/foreground transitions** - Maintains state across app lifecycle

### Storage Keys Used

- `ONBOARDING_STEP` - Current onboarding step
- `MERCHANT_UUID` - Created/selected merchant UUID
- `CURRENT_POS_SERIAL` - Active POS serial number

## Error Handling

The hook provides comprehensive error handling with step-specific error messages and actionable guidance.

### 🎯 Step-Specific Error Messages

Each step provides detailed, actionable error messages:

#### **Authentication Errors:**

```typescript
// Invalid credentials
"Authentication failed: Invalid credentials. Please check your email and password."

// Network issues
"Authentication failed: Network error. Please check your internet connection."
```

#### **Merchant Creation Errors:**

```typescript
// Duplicate fiscal ID
"A merchant with fiscal ID 12345678901 already exists. Please use a different fiscal ID or contact support if you believe this is an error."

// Invalid fiscal ID format
"Merchant creation failed: Invalid fiscal ID format. Please check the fiscal ID and try again."
```

#### **POS Creation Errors:**

```typescript
// No devices available
"No POS devices available for registration. Please contact your system administrator to provision a new POS device or check if there are any pending device registrations."
```

#### **POS Activation Errors:**

```typescript
// No devices available
"No POS device available for activation. Please ensure a POS device has been provisioned and is in NEW or REGISTERED status. Contact your system administrator if no devices are available."

// Invalid registration key
"POS activation failed: Invalid registration key. Please check the key and try again."
```

#### **Cash Register Creation Errors:**

```typescript
// POS not active
"POS device ABC123 is not active. Please ensure POS activation step has been completed successfully before creating cash register."

// Already exists
"A cash register for POS ABC123 already exists. Please use a different POS device or contact support if you believe this is an error."
```

### Error Types

- **Authentication Errors** - Invalid credentials, expired tokens, network issues
- **Network Errors** - Connection failures, API unavailable, connectivity validation
- **Validation Errors** - Invalid input data, missing required fields, format issues
- **Business Logic Errors** - No available POS devices, merchant creation failures, duplicate resources
- **Permission Errors** - Insufficient user permissions, role-based access control
- **Prerequisite Errors** - Missing dependencies, invalid state transitions

### Error Recovery

```tsx
function OnboardingWithErrorRecovery() {
  const { state, compute, clearError } = useOnboardingFlow(config);

  const retryStep = async () => {
    clearError(); // Clear previous error
    await compute(); // Retry the current step
  };

  const getErrorGuidance = (error: string) => {
    if (error.includes('credentials')) {
      return 'Please verify your email and password are correct.';
    }
    if (error.includes('network')) {
      return 'Please check your internet connection and try again.';
    }
    if (error.includes('fiscal ID')) {
      return 'Please verify the fiscal ID format and ensure it\'s not already registered.';
    }
    if (error.includes('POS device')) {
      return 'Please contact your system administrator to provision POS devices.';
    }
    return 'Please try again or contact support if the issue persists.';
  };

  if (state.error) {
    return (
      <div style={{ padding: '20px', border: '1px solid #f44336', borderRadius: '4px' }}>
        <h3>Onboarding Error</h3>
        <p><strong>Error:</strong> {state.error}</p>
        <p><strong>Guidance:</strong> {getErrorGuidance(state.error)}</p>
        <div style={{ marginTop: '15px' }}>
          <button onClick={retryStep}>Retry Step</button>
          <button onClick={() => window.location.reload()}>
            Restart Application
          </button>
        </div>
      </div>
    );
  }

  // ... rest of component
}
```

## Advanced Usage Patterns

### 🔄 Multi-Step Flow Management

For complex onboarding flows, you can implement custom step progression:

```tsx
function AdvancedOnboarding() {
  const [currentStep, setCurrentStep] = useState<'authentication' | 'merchant_check' | 'merchant_creation' | 'pos_creation'>('authentication');
  
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: currentStep,
    credentials: { email: 'provider@example.com', password: 'password123' },
    merchantInfo: { /* ... */ }
  });

  const handleStepProgression = async () => {
    try {
      await compute();
      
      // Custom step progression logic
      if (state.step === 'authentication' && !state.error) {
        setCurrentStep('merchant_check');
      } else if (state.step === 'merchant_check' && !state.error) {
        if (state.result.merchantUuid) {
          // Merchant exists, skip to POS creation
          setCurrentStep('pos_creation');
        } else {
          // No merchant, create one
          setCurrentStep('merchant_creation');
        }
      } else if (state.step === 'merchant_creation' && !state.error) {
        setCurrentStep('pos_creation');
      }
    } catch (error) {
      console.error('Step progression failed:', error);
    }
  };

  return (
    <div>
      <h2>Advanced Onboarding Flow</h2>
      <p>Current Step: {currentStep}</p>
      <p>Progress: {state.progress}%</p>
      
      {state.error && (
        <div style={{ color: 'red' }}>
          {state.error}
          <button onClick={clearError}>Clear</button>
        </div>
      )}
      
      <button onClick={handleStepProgression} disabled={state.loading}>
        {state.loading ? 'Processing...' : `Execute ${currentStep}`}
      </button>
    </div>
  );
}
```

### 🎯 Conditional Step Execution

Implement conditional logic based on business requirements:

```tsx
function ConditionalOnboarding() {
  const { state, compute } = useOnboardingFlow({
    role: 'merchant',
    step: 'pos_activation',
    credentials: { email: 'merchant@example.com', password: 'password123' },
    registrationKey: 'KEY-123'
  });

  const shouldSkipPOSActivation = async () => {
    // Check if POS is already active
    try {
      const activePOS = await getPointOfSales('ACTIVE', 1, 1);
      return activePOS.members && activePOS.members.length > 0;
    } catch (error) {
      return false;
    }
  };

  const handleSmartExecution = async () => {
    const skipActivation = await shouldSkipPOSActivation();
    
    if (skipActivation) {
      console.log('POS already active, skipping activation step');
      // Move to next step or mark as completed
    } else {
      await compute(); // Execute POS activation
    }
  };

  return (
    <button onClick={handleSmartExecution}>
      Smart Execute
    </button>
  );
}
```

## Integration with EReceiptsProvider

The hook seamlessly integrates with the `EReceiptsProvider`:

```tsx
import { useOnboardingFlow, useEReceipts } from '@a-cube-io/ereceipts-js-sdk';

function IntegratedOnboarding() {
  const { isInitialized, isAuthenticated, currentUser } = useEReceipts();
  const { state, compute } = useOnboardingFlow({
    // ... configuration
  });

  // Hook automatically calls refreshAuthStatus() from provider
  // Authentication state is synchronized across the application
  
  if (!isInitialized) {
    return <div>Initializing SDK...</div>;
  }
  
  return (
    <div>
      <p>SDK Status: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</p>
      <p>Current User: {currentUser?.email}</p>
      <p>Onboarding Step: {state.step}</p>
      {/* ... onboarding UI */}
    </div>
  );
}
```

## Best Practices

### 🎯 Recommended Usage Patterns

#### **1. Step-by-Step Execution**

```tsx
// ✅ Good: Execute steps individually with proper error handling
const handleStepExecution = async () => {
  try {
    await compute();
    // Handle success and move to next step
  } catch (error) {
    // Handle specific error types
    if (error.message.includes('network')) {
      // Show network error UI
    } else if (error.message.includes('credentials')) {
      // Show credential error UI
    }
  }
};

// ❌ Avoid: Executing multiple steps without proper error handling
const handleAllSteps = async () => {
  await compute(); // This only executes the current step
  // Don't assume all steps are completed
};
```

#### **2. Error Handling Strategy**

```tsx
// ✅ Good: Provide specific error guidance
const getErrorAction = (error: string) => {
  if (error.includes('fiscal ID')) {
    return { action: 'retry', message: 'Please verify the fiscal ID format' };
  }
  if (error.includes('POS device')) {
    return { action: 'contact_support', message: 'Contact system administrator' };
  }
  return { action: 'retry', message: 'Please try again' };
};

// ❌ Avoid: Generic error handling
const handleError = (error: string) => {
  console.error('Error occurred:', error); // Too generic
};
```

#### **3. State Management**

```tsx
// ✅ Good: Use state for UI decisions
const renderStepContent = () => {
  switch (state.step) {
    case 'authentication':
      return <AuthenticationForm />;
    case 'merchant_creation':
      return <MerchantForm />;
    case 'pos_creation':
      return <POSSetup />;
    default:
      return <ProgressIndicator />;
  }
};

// ❌ Avoid: Hard-coding step logic
const renderContent = () => {
  return <GenericForm />; // Doesn't adapt to current step
};
```

### 🔧 Troubleshooting Common Issues

#### **Issue: Step Not Progressing**

```tsx
// Problem: Step stays on 'authentication' even after successful login
// Solution: Check if step parameter is being updated

const { state, compute } = useOnboardingFlow({
  role: 'provider',
  step: currentStep, // Make sure this updates
  // ...
});

// Update step after successful execution
const handleStep = async () => {
  await compute();
  if (!state.error && state.step === 'authentication') {
    setCurrentStep('merchant_check'); // Manually progress
  }
};
```

#### **Issue: Error Messages Not Clear**

```tsx
// Problem: Generic error messages
// Solution: Use step-specific error handling

const getStepSpecificError = (error: string, step: string) => {
  switch (step) {
    case 'authentication':
      return error.includes('credentials') 
        ? 'Please check your email and password'
        : 'Authentication service unavailable';
    case 'merchant_creation':
      return error.includes('fiscal ID')
        ? 'Please verify the fiscal ID format and ensure it\'s not already registered'
        : 'Merchant creation failed';
    default:
      return error;
  }
};
```

#### **Issue: State Not Persisting**

```tsx
// Problem: Onboarding state lost on app restart
// Solution: Ensure proper storage initialization

// ✅ Good: Check storage on mount
useEffect(() => {
  const checkPersistedState = async () => {
    const savedStep = await SecureTokenStorage.getItem('ONBOARDING_STEP');
    if (savedStep) {
      setCurrentStep(savedStep as OnboardingStep);
    }
  };
  checkPersistedState();
}, []);

// ❌ Avoid: Not checking persisted state
// State will be lost on app restart
```

## Performance Considerations

### React Native Optimization

- **Memory Management** - Automatic cleanup of large data structures
- **Bridge Communication** - Optimized for React Native bridge delays
- **Background Processing** - Handles app backgrounding/foregrounding
- **Storage Efficiency** - Minimal storage footprint with data compression

### Web Optimization

- **Bundle Size** - Tree-shakeable imports, minimal bundle impact
- **Browser Storage** - Efficient IndexedDB usage with fallback to localStorage
- **Network Requests** - Request deduplication and caching
- **UI Responsiveness** - Non-blocking operations with proper loading states

## Testing

The hook comes with comprehensive test coverage for all smart flow features:

### React Tests

```bash
npm test -- useOnboardingFlow.test.tsx
```

### React Native Tests

```bash
npm test -- useOnboardingFlow.native.test.tsx
```

### Test Coverage Areas

- ✅ **Smart Flow Logic** - Step skipping, existing resource handling
- ✅ **Provider Flow** - Authentication, merchant check/creation, POS setup
- ✅ **Merchant Flow** - Authentication, POS activation, cash register creation
- ✅ **Error Handling** - Step-specific error messages and recovery
- ✅ **Prerequisite Validation** - Resource validation before operations
- ✅ **State Persistence** - Cross-platform storage and recovery
- ✅ **Network Connectivity** - Offline/online scenario handling
- ✅ **Progress Calculation** - Accurate progress tracking per role
- ✅ **Authentication Integration** - EReceiptsProvider state synchronization
- ✅ **React Native Specific** - Bridge communication and backgrounding
- ✅ **Edge Cases** - Duplicate resources, invalid states, network failures

## Troubleshooting

See [Troubleshooting Guide](../troubleshooting/onboarding.md) for common issues and solutions.

## Related Documentation

- [EReceiptsProvider Guide](../guides/react-provider.md)
- [Authentication API](../api/authentication.md)
- [Merchant Management](../api/merchants.md)
- [Getting Started Guide](../guides/getting-started.md)
- [Complete Examples](../examples/useOnboardingFlow-examples.md) - Esempi pratici con e senza EReceiptsProvider
