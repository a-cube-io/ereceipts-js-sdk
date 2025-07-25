# Onboarding API Reference

This document provides detailed API reference for all onboarding-related types, interfaces, and functions in the A-Cube E-Receipts SDK.

## Table of Contents

- [Types Overview](#types-overview)
- [Core Interfaces](#core-interfaces)
- [Hook Interface](#hook-interface)
- [State Management](#state-management)
- [Error Types](#error-types)
- [Integration Types](#integration-types)

## Types Overview

The onboarding system uses a comprehensive type system to ensure type safety and developer experience:

```typescript
// Core role type
type OnboardingRole = 'provider' | 'merchant';

// Step progression type  
type OnboardingStep = 
  | 'authentication'
  | 'merchant_check'
  | 'merchant_creation'
  | 'pos_creation'
  | 'pos_activation'
  | 'cash_register_creation'
  | 'completed'
  | 'error';
```

## Core Interfaces

### OnboardingCredentials

Basic authentication credentials for onboarding.

```typescript
interface OnboardingCredentials {
  /** User email address (must be valid email format) */
  email: string;
  
  /** User password (minimum 8 characters recommended) */
  password: string;
}
```

**Usage:**
```typescript
const credentials: OnboardingCredentials = {
  email: 'user@example.com',
  password: 'securePassword123'
};
```

### OnboardingMerchantInfo

Complete merchant information required for provider onboarding.

```typescript
interface OnboardingMerchantInfo {
  /** Italian fiscal ID (11 digits for companies, 16 for individuals) */
  fiscalId: string;
  
  /** Merchant business name */
  name: string;
  
  /** Merchant contact email */
  email: string;
  
  /** Complete merchant address */
  address: AddressInfo;
}
```

**Related Type:**
```typescript
interface AddressInfo {
  /** Street address with number */
  streetAddress: string;
  
  /** Italian postal code (5 digits) */
  zipCode: string;
  
  /** City name */
  city: string;
  
  /** Italian province code (2 letters, e.g., 'RM', 'MI') */
  province: string;
}
```

**Example:**
```typescript
const merchantInfo: OnboardingMerchantInfo = {
  fiscalId: '12345678901',
  name: 'Pizzeria Roma',
  email: 'info@pizzeriaroma.it',
  address: {
    streetAddress: 'Via del Corso 123',
    zipCode: '00186',
    city: 'Roma',
    province: 'RM'
  }
};
```

### OnboardingPOSInfo

Point of Sale information for POS setup (currently optional, prepared for future API enhancement).

```typescript
interface OnboardingPOSInfo {
  /** POS physical location address */
  address: AddressInfo;
}
```

### OnboardingResult

Complete result object containing all generated IDs and certificates from the onboarding process.

```typescript
interface OnboardingResult {
  /** Generated merchant UUID (available after merchant creation) */
  merchantUuid?: string;
  
  /** POS device serial number (available after POS setup) */
  posSerialNumber?: string;
  
  /** POS registration key (generated during POS creation) */
  registrationKey?: string;
  
  /** Cash register UUID (available after cash register creation) */
  cashRegisterId?: string;
  
  /** mTLS certificate for secure communication (base64 encoded) */
  mtlsCertificate?: string;
}
```

**Result Usage by Role:**

**Provider Result:**
```typescript
// After successful provider onboarding
const result: OnboardingResult = {
  merchantUuid: 'uuid-merchant-123',
  posSerialNumber: 'POS-SERIAL-456',
  registrationKey: 'REG-KEY-789'
  // cashRegisterId and mtlsCertificate not available in provider flow
};
```

**Merchant Result:**
```typescript
// After successful merchant onboarding
const result: OnboardingResult = {
  posSerialNumber: 'POS-SERIAL-456',
  registrationKey: 'REG-KEY-789',
  cashRegisterId: 'cash-reg-uuid-123',
  mtlsCertificate: 'LS0tLS1CRUdJTi...' // base64 certificate
  // merchantUuid may or may not be available depending on existing setup
};
```

## Hook Interface

### UseOnboardingFlowInput

Complete input configuration for the `useOnboardingFlow` hook.

```typescript
interface UseOnboardingFlowInput {
  /** User role determining the onboarding flow */
  role: OnboardingRole;
  
  /** Authentication credentials */
  credentials: OnboardingCredentials;
  
  /** 
   * Merchant information (required for provider role)
   * @requires role === 'provider'
   */
  merchantInfo?: OnboardingMerchantInfo;
  
  /** 
   * POS information (optional, for future API enhancement)
   * @optional
   */
  posInfo?: OnboardingPOSInfo;
  
  /** 
   * POS registration key (required for merchant role)
   * @requires role === 'merchant'
   */
  registrationKey?: string;
}
```

**Input Validation:**

```typescript
// Provider input validation
const providerInput: UseOnboardingFlowInput = {
  role: 'provider',
  credentials: { email: '...', password: '...' },
  merchantInfo: { /* required for provider */ }
  // registrationKey not needed for provider
};

// Merchant input validation  
const merchantInput: UseOnboardingFlowInput = {
  role: 'merchant',
  credentials: { email: '...', password: '...' },
  registrationKey: 'REQUIRED-FOR-MERCHANT'
  // merchantInfo not needed for merchant
};
```

### UseOnboardingFlowReturn

Complete return interface from the `useOnboardingFlow` hook.

```typescript
interface UseOnboardingFlowReturn {
  /** Current onboarding state */
  state: OnboardingState;
  
  /** Start or resume onboarding process */
  onboard: () => Promise<void>;
  
  /** Reset onboarding to initial state */
  reset: () => void;
  
  /** Clear current error state */
  clearError: () => void;
}
```

## State Management

### OnboardingState

Central state object containing all onboarding information.

```typescript
interface OnboardingState {
  /** Whether onboarding process is currently running */
  loading: boolean;
  
  /** Current step in the onboarding process */
  step: OnboardingStep;
  
  /** Current error message (null if no error) */
  error: string | null;
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Accumulated results from completed steps */
  result: OnboardingResult;
}
```

**State Transitions:**

```typescript
// Initial state
const initialState: OnboardingState = {
  loading: false,
  step: 'authentication',
  error: null,
  progress: 0,
  result: {}
};

// Loading state
const loadingState: OnboardingState = {
  loading: true,
  step: 'merchant_creation',
  error: null,
  progress: 60,
  result: { merchantUuid: 'existing-uuid' }
};

// Error state
const errorState: OnboardingState = {
  loading: false,
  step: 'error',
  error: 'Network connection failed',
  progress: 40,
  result: { merchantUuid: 'partial-data' }
};

// Completed state
const completedState: OnboardingState = {
  loading: false,
  step: 'completed',
  error: null,
  progress: 100,
  result: {
    merchantUuid: 'uuid-123',
    posSerialNumber: 'POS-456',
    cashRegisterId: 'cash-789',
    mtlsCertificate: 'cert-data'
  }
};
```

### Step Flow Mapping

**Provider Flow Steps:**
```typescript
type ProviderSteps = 
  | 'authentication'      // 20% - Login/auth check
  | 'merchant_check'      // 40% - Check existing merchants  
  | 'merchant_creation'   // 60% - Create new merchant
  | 'pos_creation'        // 80% - Setup POS device
  | 'completed'           // 100% - All done
  | 'error';              // 0% - Error occurred
```

**Merchant Flow Steps:**
```typescript
type MerchantSteps = 
  | 'authentication'           // 25% - Login/auth check
  | 'pos_activation'          // 50% - Activate POS with key
  | 'cash_register_creation'  // 75% - Create cash register
  | 'completed'              // 100% - All done
  | 'error';                 // 0% - Error occurred
```

## Error Types

### Error Categories

The onboarding system categorizes errors for better handling:

```typescript
// Error classification
type OnboardingErrorCategory = 
  | 'authentication'     // Login/credential errors
  | 'network'           // Connection/API errors  
  | 'validation'        // Input validation errors
  | 'business_logic'    // Business rule violations
  | 'permissions'       // Authorization errors
  | 'system';           // Internal system errors

// Example error messages by category
const errorExamples = {
  authentication: 'Invalid email or password',
  network: 'No internet connection available',
  validation: 'Merchant information is required for provider onboarding',
  business_logic: 'No POS devices available for activation',
  permissions: 'Insufficient permissions for merchant creation',
  system: 'Internal server error occurred'
};
```

### Error Handling Patterns

```typescript
// Error state checking
function handleOnboardingError(state: OnboardingState) {
  if (state.error) {
    const errorType = categorizeError(state.error);
    
    switch (errorType) {
      case 'authentication':
        // Prompt for re-login
        return { action: 'retry_auth', recoverable: true };
        
      case 'network':
        // Wait for connection and retry
        return { action: 'retry_when_online', recoverable: true };
        
      case 'validation':
        // Show validation errors to user
        return { action: 'fix_input', recoverable: true };
        
      case 'business_logic':
        // May require manual intervention
        return { action: 'contact_support', recoverable: false };
        
      default:
        return { action: 'generic_retry', recoverable: true };
    }
  }
  
  return { action: 'none', recoverable: true };
}
```

## Integration Types

### EReceiptsProvider Integration

Types for seamless integration with the provider context:

```typescript
// Provider context interface (partial)
interface EReceiptsContextState {
  isAuthenticated: boolean;
  currentUser: { email: string; role: string } | null;
  refreshAuthStatus: () => Promise<void>;
  // ... other properties
}

// Hook integration pattern
function useOnboardingWithProvider() {
  const providerContext = useEReceipts();
  const onboardingHook = useOnboardingFlow({ /* config */ });
  
  // Integration logic
  useEffect(() => {
    if (onboardingHook.state.step === 'completed') {
      // Refresh provider auth status after completion
      providerContext.refreshAuthStatus();
    }
  }, [onboardingHook.state.step]);
  
  return {
    ...onboardingHook,
    providerState: providerContext
  };
}
```

### Storage Integration Types

Types for persistent storage integration:

```typescript
// Storage key constants
const STORAGE_KEYS = {
  ONBOARDING_STEP: 'onboarding_step',
  MERCHANT_UUID: 'merchant_uuid', 
  CURRENT_POS_SERIAL: 'current_pos_serial'
} as const;

// Storage value types
type StorageValues = {
  [STORAGE_KEYS.ONBOARDING_STEP]: OnboardingStep;
  [STORAGE_KEYS.MERCHANT_UUID]: string;
  [STORAGE_KEYS.CURRENT_POS_SERIAL]: string;
};

// Storage interface
interface OnboardingStorage {
  setItem<K extends keyof StorageValues>(
    key: K, 
    value: StorageValues[K]
  ): Promise<void>;
  
  getItem<K extends keyof StorageValues>(
    key: K
  ): Promise<StorageValues[K] | null>;
  
  removeItem<K extends keyof StorageValues>(
    key: K
  ): Promise<void>;
}
```

## Usage Examples

### Complete Type Usage

```typescript
import { 
  useOnboardingFlow,
  OnboardingRole,
  OnboardingState,
  UseOnboardingFlowInput,
  UseOnboardingFlowReturn
} from '@a-cube-io/ereceipts-js-sdk';

// Strongly typed configuration
const createOnboardingConfig = (
  role: OnboardingRole,
  email: string,
  password: string
): UseOnboardingFlowInput => {
  const base = {
    role,
    credentials: { email, password }
  };
  
  if (role === 'provider') {
    return {
      ...base,
      merchantInfo: {
        fiscalId: '12345678901',
        name: 'Store Name',
        email: 'store@example.com',
        address: {
          streetAddress: 'Via Roma 1',
          zipCode: '00100',
          city: 'Roma',
          province: 'RM'
        }
      }
    };
  }
  
  if (role === 'merchant') {
    return {
      ...base,
      registrationKey: 'MERCHANT-REG-KEY'
    };
  }
  
  throw new Error(`Unsupported role: ${role}`);
};

// Usage with full type safety
function TypedOnboardingComponent() {
  const config = createOnboardingConfig('provider', 'user@example.com', 'password');
  const { state, onboard, reset, clearError }: UseOnboardingFlowReturn = useOnboardingFlow(config);
  
  // Type-safe state access
  const isCompleted: boolean = state.step === 'completed';
  const hasError: boolean = state.error !== null;
  const progressPercent: number = state.progress;
  
  // Type-safe result access
  const merchantId: string | undefined = state.result.merchantUuid;
  const posSerial: string | undefined = state.result.posSerialNumber;
  
  return (
    <div>
      <p>Step: {state.step}</p>
      <p>Progress: {progressPercent}%</p>
      {hasError && <p>Error: {state.error}</p>}
      {isCompleted && (
        <div>
          <p>Merchant: {merchantId}</p>
          <p>POS: {posSerial}</p>
        </div>
      )}
    </div>
  );
}
```

## Type Guards and Utilities

### Type Checking Utilities

```typescript
// Role type guards
function isProviderRole(role: OnboardingRole): role is 'provider' {
  return role === 'provider';
}

function isMerchantRole(role: OnboardingRole): role is 'merchant' {
  return role === 'merchant';
}

// State type guards
function isLoadingState(state: OnboardingState): boolean {
  return state.loading === true;
}

function isErrorState(state: OnboardingState): boolean {
  return state.step === 'error' || state.error !== null;
}

function isCompletedState(state: OnboardingState): boolean {
  return state.step === 'completed';
}

// Result validation
function hasCompleteProviderResult(result: OnboardingResult): boolean {
  return !!(result.merchantUuid && result.posSerialNumber);
}

function hasCompleteMerchantResult(result: OnboardingResult): boolean {
  return !!(result.posSerialNumber && result.cashRegisterId);
}
```

### Input Validation

```typescript
// Input validation functions
function validateOnboardingInput(input: UseOnboardingFlowInput): string[] {
  const errors: string[] = [];
  
  // Basic validation
  if (!input.credentials.email) {
    errors.push('Email is required');
  }
  
  if (!input.credentials.password) {
    errors.push('Password is required');
  }
  
  // Role-specific validation
  if (input.role === 'provider' && !input.merchantInfo) {
    errors.push('Merchant information is required for provider role');
  }
  
  if (input.role === 'merchant' && !input.registrationKey) {
    errors.push('Registration key is required for merchant role');
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (input.credentials.email && !emailRegex.test(input.credentials.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
}

// Usage example
const input: UseOnboardingFlowInput = { /* ... */ };
const validationErrors = validateOnboardingInput(input);

if (validationErrors.length > 0) {
  console.error('Validation errors:', validationErrors);
  // Handle validation errors
}
```

This API reference provides complete type information for implementing robust onboarding flows with full TypeScript support and type safety.