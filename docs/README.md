# A-Cube SDK Documentation

Professional TypeScript SDK for integrating the A-Cube e-receipt system into web applications, React Native apps, and PWAs.

## 📚 Quick Navigation

| Need | Go to |
|------|-------|
| **Quick Start** | [`README.md`](README.md#-quick-start) |
| **API Reference** | [`docs/api/`](docs/api/) |
| **Code Examples** | [`USAGE_EXAMPLE.md`](docs/examples/complete-pos-app.md) |
| **Security Info** | [`docs/security/`](docs/security/) |
| **Contributing** | [`CONTRIBUTING.md`](CONTRIBUTING.md) |


## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Configuration](#configuration)
  - [Authentication](#authentication)
  - [Merchant Management](#merchant-management)
  - [Point of Sale Operations](#point-of-sale-operations)
  - [Receipt Management](#receipt-management)
  - [Cash Register Operations](#cash-register-operations)
  - [Cashier Management](#cashier-management)
- [React Hooks](#react-hooks)
- [UI Components](#ui-components)
- [Storage & Security](#storage--security)
- [Utilities](#utilities)
- [Error Handling](#error-handling)
- [Offline Support](#offline-support)
- [TypeScript Types](#typescript-types)
- [Examples](#examples)

## Installation

```bash
npm install @a-cube-io/ereceipts-js-sdk
# or
yarn add @a-cube-io/ereceipts-js-sdk
```

### Peer Dependencies

```bash
npm install react react-native @react-native-async-storage/async-storage react-native-keychain
```

## Quick Start

### 1. Initialize the SDK

```typescript
import { initSDK, configureSDK } from '@a-cube-io/ereceipts-js-sdk';

// Initialize with default settings
await initSDK();

// Or with custom configuration
await initSDK({
  environment: 'production',
  enableLogging: true,
  enableRetry: true,
  maxRetries: 3
});
```

### 2. Authentication

```typescript
import { useAuth } from '@a-cube-io/ereceipts-js-sdk';

function LoginScreen() {
  const { loginAsProvider, isAuthenticated, user, error } = useAuth();
  
  const handleLogin = async () => {
    try {
      await loginAsProvider('provider@example.com', 'SecurePass123!');
      console.log('Login successful!');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  if (isAuthenticated) {
    return <div>Welcome, {user?.email}!</div>;
  }
  
  return <button onClick={handleLogin}>Login as Provider</button>;
}
```

### 3. Create a Merchant

```typescript
import { createMerchant } from '@a-cube-io/ereceipts-js-sdk';

const merchantData = {
  fiscal_id: '12345678901',
  name: 'My Business',
  email: 'merchant@example.com',
  password: 'SecurePass123!',
  address: {
    street_address: 'Via Roma 1',
    zip_code: '00100',
    city: 'Roma',
    province: 'RM'
  }
};

try {
  const merchant = await createMerchant(merchantData);
  console.log('Merchant created:', merchant);
} catch (error) {
  console.error('Failed to create merchant:', error);
}
```

## API Reference

### Configuration

#### `initSDK(config?: Partial<SDKConfig>): Promise<APIClient>`

Initializes the A-Cube SDK with optional configuration.

**Parameters:**
- `config` (optional): SDK configuration object

**Returns:** Promise resolving to the API client instance

**Example:**
```typescript
await initSDK({
  environment: 'sandbox', // 'sandbox' | 'production'
  baseURL: 'https://custom-api.example.com',
  timeout: 30000,
  enableRetry: true,
  enableOfflineQueue: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableLogging: true
});
```

#### `configureSDK(config: Partial<SDKConfig>): void`

Updates SDK configuration after initialization.

**Parameters:**
- `config`: Partial configuration object to update

**Example:**
```typescript
configureSDK({
  environment: 'production',
  enableLogging: false
});
```

---

### Authentication

#### `loginProvider(email: string, password: string): Promise<AuthToken>`

Authenticates a user as a Provider (highest privilege level).

**Parameters:**
- `email`: Provider's email address
- `password`: Provider's password (must meet security requirements)

**Returns:** Promise resolving to authentication token

**Throws:** `AuthenticationError` if login fails

**Example:**
```typescript
try {
  const token = await loginProvider('provider@example.com', 'SecurePass123!');
  console.log('Provider logged in:', token);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Login failed:', error.message);
  }
}
```

#### `loginMerchant(email: string, password: string): Promise<AuthToken>`

Authenticates a user as a Merchant.

**Parameters:**
- `email`: Merchant's email address
- `password`: Merchant's password

**Returns:** Promise resolving to authentication token

**Example:**
```typescript
const token = await loginMerchant('merchant@business.com', 'password123');
```

#### `loginCashier(email: string, password: string): Promise<AuthToken>`

Authenticates a user as a Cashier (limited privileges).

**Parameters:**
- `email`: Cashier's email address
- `password`: Cashier's password

**Returns:** Promise resolving to authentication token

#### `logout(): Promise<void>`

Logs out the current user and clears all authentication data.

**Example:**
```typescript
await logout();
console.log('User logged out successfully');
```

#### `isAuthenticated(): Promise<boolean>`

Checks if a user is currently authenticated with a valid token.

**Returns:** Promise resolving to boolean indicating authentication status

#### `getCurrentUser(): Promise<{email: string, role: string} | null>`

Gets information about the currently authenticated user.

**Returns:** Promise resolving to user info or null if not authenticated

#### `hasRole(role: string): Promise<boolean>`

Checks if the current user has a specific role.

**Parameters:**
- `role`: Role to check ('provider', 'merchant', 'cashier')

**Returns:** Promise resolving to boolean

---

### Merchant Management

#### `createMerchant(data: MerchantCreateInput): Promise<MerchantOutput>`

Creates a new merchant account. **Requires Provider role.**

**Parameters:**
- `data`: Merchant creation data object

**MerchantCreateInput Interface:**
```typescript
interface MerchantCreateInput {
  fiscal_id: string;      // 11-digit Italian VAT ID
  name: string;           // Business name
  email: string;          // Valid email address
  password: string;       // Strong password (8-40 chars, uppercase, lowercase, digit, special char)
  address?: Address;      // Optional billing address
}

interface Address {
  street_address: string; // Street address
  zip_code: string;       // 5-digit Italian postal code
  city: string;           // City name
  province: string;       // 2-letter province code
}
```

**Returns:** Promise resolving to created merchant data

**Example:**
```typescript
const merchant = await createMerchant({
  fiscal_id: '12345678901',
  name: 'Acme Corporation',
  email: 'contact@acme.com',
  password: 'SecurePass123!',
  address: {
    street_address: 'Via Milano 15',
    zip_code: '20121',
    city: 'Milano',
    province: 'MI'
  }
});
```

#### `getMerchants(page?: number): Promise<MerchantOutput[]>`

Retrieves a list of merchants. **Requires Provider role.**

**Parameters:**
- `page` (optional): Page number for pagination (default: 1)

**Returns:** Promise resolving to array of merchant objects

#### `getMerchantById(uuid: string): Promise<MerchantOutput>`

Retrieves a specific merchant by UUID.

**Parameters:**
- `uuid`: Merchant's unique identifier

**Returns:** Promise resolving to merchant data

#### `updateMerchant(uuid: string, data: MerchantUpdateInput): Promise<MerchantOutput>`

Updates merchant information.

**Parameters:**
- `uuid`: Merchant's unique identifier
- `data`: Updated merchant data

**MerchantUpdateInput Interface:**
```typescript
interface MerchantUpdateInput {
  name: string;           // Business name
  address?: Address | null; // Updated address or null to remove
}
```

---

### Point of Sale Operations

#### `getPointOfSales(status?: string, page?: number, size?: number): Promise<PaginatedResponse<PEMPublic>>`

Retrieves Point of Electronic Money (PEM) devices.

**Parameters:**
- `status` (optional): Filter by PEM status
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)

**PEM Status Values:**
- `'NEW'`: Newly registered device
- `'REGISTERED'`: Device registered with tax authority
- `'ACTIVE'`: Device activated and certified
- `'ONLINE'`: Device online and operational
- `'OFFLINE'`: Device temporarily offline
- `'DISCARDED'`: Device decommissioned

**Example:**
```typescript
const activePEMs = await getPointOfSales('ACTIVE', 1, 10);
console.log(`Found ${activePEMs.total} active PEMs`);
```

#### `getPointOfSaleBySerial(serialNumber: string): Promise<PEMPublic>`

Retrieves a specific PEM device by serial number.

**Parameters:**
- `serialNumber`: PEM device serial number

**Returns:** Promise resolving to PEM device information

#### `activatePointOfSale(serialNumber: string, registrationKey: string): Promise<void>`

Activates a PEM device with the Italian Tax Agency.

**Parameters:**
- `serialNumber`: PEM device serial number
- `registrationKey`: Registration key provided by tax authority

**Example:**
```typescript
await activatePointOfSale('E001-000001', 'REG123456789');
console.log('PEM device activated successfully');
```

#### `createInactivityPeriod(serialNumber: string): Promise<void>`

Creates an inactivity period for a PEM device (for maintenance, etc.).

**Parameters:**
- `serialNumber`: PEM device serial number

#### `setPointOfSaleOffline(serialNumber: string, timestamp: string, reason: string): Promise<void>`

Sets a PEM device to offline status.

**Parameters:**
- `serialNumber`: PEM device serial number
- `timestamp`: ISO timestamp when device went offline
- `reason`: Reason for going offline

**Example:**
```typescript
await setPointOfSaleOffline(
  'E001-000001',
  new Date().toISOString(),
  'Scheduled maintenance'
);
```

#### `closeJournal(): Promise<void>`

Closes the current journal for all PEM devices (end-of-day operation).

---

### Receipt Management

#### `createReceipt(data: ReceiptInput): Promise<ReceiptOutput>`

Creates a new electronic receipt. **Core business operation.**

**Parameters:**
- `data`: Receipt data object

**ReceiptInput Interface:**
```typescript
interface ReceiptInput {
  items: ReceiptItem[];                    // Array of receipt items (required)
  customer_tax_code?: string;              // Customer's tax code
  customer_lottery_code?: string;          // Lottery participation code
  discount?: string;                       // Receipt-level discount (EUR, 2-8 decimals)
  invoice_issuing?: boolean;               // Flag for invoice generation
  uncollected_dcr_to_ssn?: boolean;       // Healthcare system flag
  services_uncollected_amount?: string;    // Unpaid services amount
  goods_uncollected_amount?: string;       // Unpaid goods amount
  cash_payment_amount?: string;            // Cash payment amount
  electronic_payment_amount?: string;      // Card/digital payment amount
  ticket_restaurant_payment_amount?: string; // Meal voucher amount
  ticket_restaurant_quantity?: number;     // Number of meal vouchers
}

interface ReceiptItem {
  good_or_service?: 'B' | 'S';            // 'B' for goods, 'S' for services
  quantity: string;                        // Quantity (format: "X.XX")
  description: string;                     // Item description (max 1000 chars)
  unit_price: string;                      // Unit price (EUR, 2-8 decimals)
  vat_rate_code?: string;                  // VAT rate code ('4', '5', '10', '22', etc.)
  simplified_vat_allocation?: boolean;     // Use simplified VAT calculation
  discount?: string;                       // Item-level discount
  is_down_payment_or_voucher_redemption?: boolean; // Down payment flag
  complimentary?: boolean;                 // Free/gift item flag
}
```

**Example:**
```typescript
const receipt = await createReceipt({
  items: [
    {
      good_or_service: 'B',
      quantity: '2.00',
      description: 'Espresso Coffee',
      unit_price: '1.50',
      vat_rate_code: '22'
    },
    {
      good_or_service: 'S',
      quantity: '1.00',
      description: 'Table Service',
      unit_price: '0.50',
      vat_rate_code: '22'
    }
  ],
  customer_lottery_code: 'ABCD1234',
  cash_payment_amount: '3.50'
});
```

#### `getReceipts(page?: number, size?: number): Promise<PaginatedResponse<ReceiptOutput>>`

Retrieves electronic receipts with pagination.

**Parameters:**
- `page` (optional): Page number (default: 1)
- `size` (optional): Items per page (default: 30)

#### `getReceiptById(uuid: string): Promise<ReceiptOutput>`

Retrieves a specific receipt by UUID.

**Parameters:**
- `uuid`: Receipt's unique identifier

#### `getReceiptDetails(uuid: string, format?: 'json' | 'pdf'): Promise<ReceiptDetailsOutput | Blob>`

Retrieves detailed receipt information or PDF.

**Parameters:**
- `uuid`: Receipt's unique identifier
- `format` (optional): Response format ('json' or 'pdf', default: 'json')

**Returns:** 
- If format is 'json': Promise resolving to detailed receipt data
- If format is 'pdf': Promise resolving to PDF Blob

**Example:**
```typescript
// Get JSON details
const details = await getReceiptDetails('receipt-uuid-123');

// Get PDF
const pdfBlob = await getReceiptDetails('receipt-uuid-123', 'pdf');
const url = URL.createObjectURL(pdfBlob);
window.open(url); // Open PDF in new window
```

#### `voidReceipt(data: VoidReceiptData): Promise<void>`

Voids (cancels) an electronic receipt.

**Parameters:**
- `data`: Void receipt data object

**Example:**
```typescript
await voidReceipt({
  pem_id: 'E001-000001',
  items: [/* items to void */],
  document_number: '0001-0001',
  document_date: '2024-03-20T10:00:00',
  lottery_code: 'ABCD1234'
});
```

#### `returnReceiptItems(data: ReturnReceiptData): Promise<ReceiptOutput>`

Processes a return/refund for receipt items.

**Parameters:**
- `data`: Return receipt data object

**Returns:** Promise resolving to new return receipt

---

### Cash Register Operations

#### `createCashRegister(data: CashRegisterCreate): Promise<CashRegisterOutput>`

Creates a new cash register with mTLS certificate.

**Parameters:**
- `data`: Cash register creation data

**CashRegisterCreate Interface:**
```typescript
interface CashRegisterCreate {
  pem_serial_number: string; // Associated PEM device serial
  name: string;              // Cash register name
}
```

**Returns:** Promise resolving to cash register data with mTLS certificate

**Example:**
```typescript
const cashRegister = await createCashRegister({
  pem_serial_number: 'E001-000001',
  name: 'Main Counter Register'
});

// Certificate is automatically stored securely
console.log('Cash register created:', cashRegister.id);
```

#### `getCashRegisters(page?: number, size?: number): Promise<PaginatedResponse<CashRegisterOutput>>`

Retrieves cash registers with pagination.

#### `getCashRegisterById(id: string): Promise<CashRegisterOutput>`

Retrieves a specific cash register by ID.

**Parameters:**
- `id`: Cash register UUID

#### `getMTLSCertificate(id: string): Promise<string>`

Retrieves the mTLS certificate for a cash register.

**Parameters:**
- `id`: Cash register UUID

**Returns:** Promise resolving to certificate PEM string

---

### Cashier Management

#### `createCashier(data: CashierCreateInput): Promise<CashierOutput>`

Creates a new cashier account. **Requires Merchant role.**

**Parameters:**
- `data`: Cashier creation data

**CashierCreateInput Interface:**
```typescript
interface CashierCreateInput {
  email: string;    // Valid email address
  password: string; // Strong password
}
```

#### `getCashiers(page?: number, size?: number): Promise<PaginatedResponse<CashierOutput>>`

Retrieves cashiers with pagination.

#### `getCashierById(id: number): Promise<CashierOutput>`

Retrieves a specific cashier by ID.

#### `getCurrentCashier(): Promise<CashierOutput>`

Gets information about the currently authenticated cashier.

#### `deleteCashier(id: number): Promise<void>`

Deletes a cashier account.

**Parameters:**
- `id`: Cashier ID number

---

## React Hooks

### `useAuth(): UseAuthReturn`

Comprehensive authentication hook for React components.

**Returns:**
```typescript
interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { email: string; role: string } | null;
  token: string | null;
  error: string | null;
  
  // Actions
  loginAsProvider: (email: string, password: string) => Promise<void>;
  loginAsMerchant: (email: string, password: string) => Promise<void>;
  loginAsCashier: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}
```

**Example:**
```typescript
function AuthenticatedApp() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    loginAsProvider, 
    logout, 
    error 
  } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return (
      <div>
        <button onClick={() => loginAsProvider('email', 'password')}>
          Login as Provider
        </button>
        {error && <div>Error: {error}</div>}
      </div>
    );
  }
  
  return (
    <div>
      <p>Welcome, {user?.email} ({user?.role})</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### `useRetryQueue(): UseRetryQueueReturn`

Hook for managing offline request queue.

**Returns:**
```typescript
interface UseRetryQueueReturn {
  stats: QueueStats;
  isProcessing: boolean;
  isConnected: boolean;
  processQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

interface QueueStats {
  total: number;
  byPriority: { high: number; medium: number; low: number };
  oldestTimestamp?: number;
  newestTimestamp?: number;
}
```

**Example:**
```typescript
function OfflineIndicator() {
  const { stats, isProcessing, isConnected, processQueue } = useRetryQueue();
  
  if (!isConnected) {
    return (
      <div style={{ backgroundColor: 'red', color: 'white', padding: '10px' }}>
        Offline - {stats.total} requests queued
        {!isProcessing && (
          <button onClick={processQueue}>Retry Now</button>
        )}
      </div>
    );
  }
  
  if (stats.total > 0) {
    return (
      <div style={{ backgroundColor: 'orange', padding: '10px' }}>
        Processing {stats.total} queued requests...
      </div>
    );
  }
  
  return null;
}
```

### `useProviderFlow(): UseProviderFlowReturn`

Hook for managing multi-step provider workflows (merchant creation, etc.).

**Returns:**
```typescript
interface UseProviderFlowReturn {
  isLoading: boolean;
  currentStep: number;
  merchantData: Partial<MerchantCreateInput>;
  createdMerchant: MerchantOutput | null;
  error: string | null;
  
  setMerchantData: (data: Partial<MerchantCreateInput>) => void;
  validateCurrentStep: () => ValidationResult;
  createMerchantFlow: (data: MerchantCreateInput) => Promise<MerchantOutput>;
  nextStep: () => void;
  previousStep: () => void;
  resetFlow: () => void;
  clearError: () => void;
}
```

**Example:**
```typescript
function MerchantCreationWizard() {
  const {
    currentStep,
    merchantData,
    setMerchantData,
    createMerchantFlow,
    nextStep,
    validateCurrentStep,
    error
  } = useProviderFlow();
  
  const handleNext = () => {
    const validation = validateCurrentStep();
    if (validation.isValid) {
      if (currentStep === 3) {
        // Final step - create merchant
        createMerchantFlow(merchantData as MerchantCreateInput);
      } else {
        nextStep();
      }
    }
  };
  
  return (
    <div>
      <h2>Step {currentStep} of 3</h2>
      {/* Render step-specific forms */}
      <button onClick={handleNext}>
        {currentStep === 3 ? 'Create Merchant' : 'Next'}
      </button>
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

---

## UI Components

### `Button`

Cross-platform button component with multiple variants and states.

**Props:**
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}
```

**Example:**
```typescript
import { Button } from '@a-cube-io/ereceipts-js-sdk';

function ActionButtons() {
  return (
    <div>
      <Button
        title="Create Receipt"
        variant="primary"
        size="large"
        onPress={() => console.log('Creating receipt...')}
      />
      
      <Button
        title="Cancel"
        variant="outline"
        onPress={() => console.log('Cancelled')}
      />
      
      <Button
        title="Loading..."
        loading={true}
        disabled={true}
        onPress={() => {}}
      />
    </div>
  );
}
```

### `FormInput`

Cross-platform form input with validation, labels, and icons.

**Props:**
```typescript
interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}
```

**Example:**
```typescript
import { FormInput } from '@a-cube-io/ereceipts-js-sdk';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  
  return (
    <div>
      <FormInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        required={true}
        error={errors.email}
        helperText="Enter your registered email address"
      />
      
      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
        showPasswordToggle={true}
        required={true}
        error={errors.password}
      />
    </div>
  );
}
```

---

## Storage & Security

### `SecureTokenStorage`

Cross-platform secure storage system with automatic encryption for sensitive data. 

**⚠️ IMPORTANT: Must be configured before first use:**

```typescript
import { SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// Configure secure storage (required before any operations)
SecureTokenStorage.configure({
  encryptionKeyId: 'your-app-encryption-key-v1',
  storeNamespace: 'your-app-secure-store'
});
```

**📚 [Complete Secure Storage Documentation](./secure-storage.md)**

#### Core Methods:

##### `configure(config: SecureStorageConfig): void`
**REQUIRED** - Initializes secure storage with encryption settings.

##### `storeToken(token: AuthToken): Promise<void>`
Stores authentication token securely (automatically encrypted).

##### `getToken(): Promise<string | null>`
Retrieves stored authentication token (automatically decrypted).

##### `isTokenValid(): Promise<boolean>`
Checks if stored token is still valid (not expired).

##### `removeToken(): Promise<void>`
Removes authentication token and related data.

##### `storeUserInfo(token: string): Promise<void>`
Extracts and stores user information from JWT token.

##### `getUserRole(): Promise<string | null>`
Gets the role of the currently stored user.

##### `getUserEmail(): Promise<string | null>`
Gets the email of the currently stored user.

**Example:**
```typescript
import { SecureTokenStorage } from '@a-cube-io/ereceipts-js-sdk';

// 1. Configure first (required)
SecureTokenStorage.configure({
  encryptionKeyId: 'myapp-v1',
  storeNamespace: 'myapp-store'
});

// 2. Use storage (tokens are automatically encrypted)
const token = { access_token: 'jwt-token-here', token_type: 'Bearer' };
await SecureTokenStorage.storeToken(token);

const isValid = await SecureTokenStorage.isTokenValid();
if (!isValid) {
  await SecureTokenStorage.removeToken();
  // Redirect to login
}
```

#### Security Features:
- **🔐 AES-GCM Encryption**: 256-bit encryption for sensitive keys
- **🔑 PBKDF2 Key Derivation**: 100,000 iterations with SHA-256  
- **📱 Platform-Specific Storage**: Keychain (iOS), Keystore (Android), IndexedDB (Web)
- **🔄 Automatic Detection**: Sensitive keys are encrypted automatically
- **⬆️ Backward Compatible**: Handles existing plain-text data gracefully

### `CertificateStorage`

Secure storage for mTLS certificates used by cash registers.

#### Methods:

##### `storeMTLSCertificate(uuid: string, certificate: string, privateKey?: string): Promise<void>`
Stores mTLS certificate securely.

##### `getMTLSCertificate(uuid: string): Promise<MTLSCertificate | null>`
Retrieves stored mTLS certificate.

##### `removeMTLSCertificate(uuid: string): Promise<void>`
Removes mTLS certificate.

##### `validateCertificate(uuid: string): Promise<boolean>`
Validates stored certificate (expiry, format, etc.).

**Example:**
```typescript
import { CertificateStorage } from '@a-cube-io/ereceipts-js-sdk';

// Certificates are usually managed automatically by createCashRegister()
const cert = await CertificateStorage.getMTLSCertificate('cash-register-uuid');
if (cert && await CertificateStorage.validateCertificate('cash-register-uuid')) {
  console.log('Certificate is valid');
} else {
  console.log('Certificate expired or invalid');
}
```

### `RequestQueue`

Manages offline request queue for network resilience.

#### Methods:

##### `enqueueRequest(config: AxiosRequestConfig, priority?: 'high' | 'medium' | 'low'): Promise<void>`
Adds failed request to queue.

##### `getQueue(): Promise<QueuedRequest[]>`
Gets all queued requests.

##### `getNextRequest(): Promise<QueuedRequest | null>`
Gets next request for processing.

##### `removeRequest(requestId: string): Promise<void>`
Removes request from queue.

##### `clearQueue(): Promise<void>`
Clears entire queue.

**Example:**
```typescript
import { RequestQueue, getAPIClient } from '@a-cube-io/ereceipts-js-sdk';

// Usually handled automatically, but can be used manually
const client = getAPIClient();

try {
  await client.post('/api/receipts', receiptData);
} catch (error) {
  if (!navigator.onLine) {
    // Queue request for retry when online
    await RequestQueue.enqueueRequest({
      method: 'POST',
      url: '/api/receipts',
      data: receiptData
    }, 'high');
  }
}
```

---

## Utilities

### Network Utilities

#### `isConnected(): boolean`
Checks current network connection status.

#### `getNetworkState(): NetworkState`
Gets detailed network state information.

#### `addNetworkListener(listener: NetworkStateChangeHandler): () => void`
Adds network state change listener.

#### `waitForConnection(timeoutMs?: number): Promise<boolean>`
Waits for network connection with timeout.

**Example:**
```typescript
import { isConnected, addNetworkListener, waitForConnection } from '@a-cube-io/ereceipts-js-sdk';

// Check connection
if (isConnected()) {
  console.log('Connected to internet');
}

// Listen for changes
const unsubscribe = addNetworkListener((state) => {
  console.log('Network changed:', state.isConnected ? 'online' : 'offline');
});

// Wait for connection
const connected = await waitForConnection(30000); // 30 seconds timeout
if (connected) {
  // Proceed with network operations
}

// Cleanup
unsubscribe();
```

### Validation Utilities

#### `validateEmail(email: string): ValidationResult`
Validates email address format.

#### `validatePassword(password: string): ValidationResult`
Validates password strength (A-Cube requirements).

#### `validateFiscalId(fiscalId: string): ValidationResult`
Validates Italian fiscal ID (Partita IVA).

#### `validateAddress(address: Address): ValidationResult`
Validates Italian address format.

#### `validateReceiptItem(item: ReceiptItem): ValidationResult`
Validates receipt item data.

**ValidationResult Interface:**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

**Example:**
```typescript
import { validateEmail, validatePassword, combineValidationResults } from '@a-cube-io/ereceipts-js-sdk';

function validateLoginForm(email: string, password: string) {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  
  const combined = combineValidationResults(emailValidation, passwordValidation);
  
  if (!combined.isValid) {
    combined.errors.forEach(error => {
      console.error(`${error.field}: ${error.message}`);
    });
    return false;
  }
  
  return true;
}
```

### Retry Utilities

#### `retryAsync<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>`
Retries async function with configurable options.

#### `withRetry<T>(fn: T, config?: Partial<RetryConfig>): T`
Creates retry wrapper for function.

#### `isRetryableError(error: AxiosError): boolean`
Checks if error should trigger retry.

**Example:**
```typescript
import { retryAsync, withRetry } from '@a-cube-io/ereceipts-js-sdk';

// Retry with custom config
const result = await retryAsync(
  () => unstableAPICall(),
  {
    retries: 5,
    retryDelay: 2000,
    exponentialBackoff: true
  }
);

// Create retry wrapper
const stableAPICall = withRetry(unstableAPICall, { retries: 3 });
const result2 = await stableAPICall();
```

### Logging Utilities

#### `logError(message: string, data?: any, source?: string): void`
Logs error message.

#### `logWarn(message: string, data?: any, source?: string): void`
Logs warning message.

#### `logInfo(message: string, data?: any, source?: string): void`
Logs info message.

#### `logDebug(message: string, data?: any, source?: string): void`
Logs debug message.

#### Scoped Loggers:
- `apiLogger`: API-specific logging
- `authLogger`: Authentication logging
- `storageLogger`: Storage operation logging
- `networkLogger`: Network status logging
- `uiLogger`: UI component logging

**Example:**
```typescript
import { logInfo, apiLogger, authLogger } from '@a-cube-io/ereceipts-js-sdk';

// General logging
logInfo('Application started', { version: '1.0.0' });

// Scoped logging
apiLogger.info('Making API request', { url: '/api/merchants' });
authLogger.warn('Token expiring soon', { expiresIn: 300 });
```

---

## Error Handling

### `AuthenticationError`

Thrown when authentication operations fail.

**Properties:**
- `message`: Error description
- `code`: Error code for programmatic handling
- `status`: HTTP status code (if applicable)

**Example:**
```typescript
import { loginProvider, AuthenticationError } from '@a-cube-io/ereceipts-js-sdk';

try {
  await loginProvider('invalid@email.com', 'wrongpassword');
} catch (error) {
  if (error instanceof AuthenticationError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS_FORMAT':
        console.error('Please check email and password format');
        break;
      case 'LOGIN_FAILED':
        console.error('Invalid credentials');
        break;
      default:
        console.error('Authentication error:', error.message);
    }
  }
}
```

### API Error Handling

All API functions can throw various errors:

```typescript
import { createReceipt } from '@a-cube-io/ereceipts-js-sdk';

try {
  const receipt = await createReceipt(receiptData);
} catch (error) {
  if (error.response) {
    // HTTP error response
    console.error('API Error:', error.response.status, error.response.data);
  } else if (error.request) {
    // Network error
    console.error('Network Error:', error.message);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

---

## Offline Support

The SDK automatically handles offline scenarios:

### Automatic Features:
1. **Request Queuing**: Failed POST/PUT/PATCH requests are automatically queued
2. **Network Detection**: Monitors connection status across platforms
3. **Auto-Retry**: Processes queue when connection is restored
4. **Priority Handling**: Critical operations (receipts) get higher priority

### Manual Control:

```typescript
import { useRetryQueue, getAPIClient } from '@a-cube-io/ereceipts-js-sdk';

function OfflineManager() {
  const { stats, processQueue, clearQueue, isConnected } = useRetryQueue();
  
  return (
    <div>
      <h3>Offline Status</h3>
      <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
      <p>Queued Requests: {stats.total}</p>
      <p>High Priority: {stats.byPriority.high}</p>
      
      {stats.total > 0 && (
        <div>
          <button onClick={processQueue}>Process Queue Now</button>
          <button onClick={clearQueue}>Clear Queue</button>
        </div>
      )}
    </div>
  );
}
```

---

## TypeScript Types

The SDK exports comprehensive TypeScript types:

### Core Entity Types:
```typescript
import type {
  MerchantOutput,
  ReceiptOutput,
  CashRegisterOutput,
  PEMPublic,
  ReceiptItem,
  Address
} from '@a-cube-io/ereceipts-js-sdk';
```

### API Response Types:
```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  AuthToken,
  ValidationResult
} from '@a-cube-io/ereceipts-js-sdk';
```

### Configuration Types:
```typescript
import type {
  SDKConfig,
  Environment,
  NetworkState,
  RetryConfig
} from '@a-cube-io/ereceipts-js-sdk';
```

---

## Examples

### Complete E-Receipt Flow

```typescript
import React, { useState } from 'react';
import {
  useAuth,
  createReceipt,
  Button,
  FormInput,
  validateReceiptItem
} from '@a-cube-io/ereceipts-js-sdk';

function ReceiptCreationApp() {
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState([{
    quantity: '1.00',
    description: '',
    unit_price: '0.00',
    good_or_service: 'B' as const
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const addItem = () => {
    setItems([...items, {
      quantity: '1.00',
      description: '',
      unit_price: '0.00',
      good_or_service: 'B' as const
    }]);
  };
  
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  const validateItems = () => {
    for (const item of items) {
      const validation = validateReceiptItem(item);
      if (!validation.isValid) {
        setError(`Item validation failed: ${validation.errors[0].message}`);
        return false;
      }
    }
    return true;
  };
  
  const handleCreateReceipt = async () => {
    if (!validateItems()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const receipt = await createReceipt({
        items,
        cash_payment_amount: items.reduce((sum, item) => 
          sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0
        ).toFixed(2)
      });
      
      console.log('Receipt created:', receipt);
      alert(`Receipt created successfully! ID: ${receipt.uuid}`);
      
      // Reset form
      setItems([{
        quantity: '1.00',
        description: '',
        unit_price: '0.00',
        good_or_service: 'B' as const
      }]);
    } catch (err: any) {
      setError(err.message || 'Failed to create receipt');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAuthenticated) {
    return <div>Please log in to create receipts</div>;
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Create E-Receipt</h1>
      <p>Logged in as: {user?.email} ({user?.role})</p>
      
      <h2>Receipt Items</h2>
      {items.map((item, index) => (
        <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h3>Item {index + 1}</h3>
          
          <FormInput
            label="Description"
            value={item.description}
            onChangeText={(value) => updateItem(index, 'description', value)}
            placeholder="Enter item description"
            required
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <FormInput
              label="Quantity"
              value={item.quantity}
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              placeholder="1.00"
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
            
            <FormInput
              label="Unit Price (€)"
              value={item.unit_price}
              onChangeText={(value) => updateItem(index, 'unit_price', value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              style={{ flex: 1 }}
            />
          </div>
          
          <div>
            <label>Type: </label>
            <select
              value={item.good_or_service}
              onChange={(e) => updateItem(index, 'good_or_service', e.target.value)}
            >
              <option value="B">Goods</option>
              <option value="S">Services</option>
            </select>
          </div>
        </div>
      ))}
      
      <Button
        title="Add Item"
        variant="outline"
        onPress={addItem}
        style={{ marginBottom: '20px' }}
      />
      
      {error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <Button
          title={loading ? 'Creating Receipt...' : 'Create Receipt'}
          variant="primary"
          size="large"
          onPress={handleCreateReceipt}
          loading={loading}
          disabled={loading || items.length === 0}
        />
        
        <Button
          title="Clear All"
          variant="outline"
          onPress={() => setItems([{
            quantity: '1.00',
            description: '',
            unit_price: '0.00',
            good_or_service: 'B' as const
          }])}
        />
      </div>
    </div>
  );
}

export default ReceiptCreationApp;
```

### Provider Dashboard

```typescript
import React, { useState, useEffect } from 'react';
import {
  useAuth,
  useProviderFlow,
  getMerchants,
  Button,
  FormInput
} from '@a-cube-io/ereceipts-js-sdk';

function ProviderDashboard() {
  const { user, logout } = useAuth();
  const [merchants, setMerchants] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const {
    currentStep,
    merchantData,
    setMerchantData,
    createMerchantFlow,
    nextStep,
    previousStep,
    validateCurrentStep,
    resetFlow,
    error: flowError
  } = useProviderFlow();
  
  useEffect(() => {
    loadMerchants();
  }, []);
  
  const loadMerchants = async () => {
    try {
      const merchantList = await getMerchants();
      setMerchants(merchantList);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    }
  };
  
  const handleCreateMerchant = async () => {
    try {
      await createMerchantFlow(merchantData);
      await loadMerchants();
      setShowCreateForm(false);
      resetFlow();
    } catch (error) {
      console.error('Failed to create merchant:', error);
    }
  };
  
  const renderCreateMerchantForm = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h3>Step 1: Account Information</h3>
            <FormInput
              label="Fiscal ID (Partita IVA)"
              value={merchantData.fiscal_id || ''}
              onChangeText={(value) => setMerchantData({ fiscal_id: value })}
              placeholder="12345678901"
              maxLength={11}
              required
            />
            <FormInput
              label="Email"
              value={merchantData.email || ''}
              onChangeText={(value) => setMerchantData({ email: value })}
              keyboardType="email-address"
              autoCapitalize="none"
              required
            />
            <FormInput
              label="Password"
              value={merchantData.password || ''}
              onChangeText={(value) => setMerchantData({ password: value })}
              secureTextEntry
              showPasswordToggle
              required
            />
          </div>
        );
      
      case 2:
        return (
          <div>
            <h3>Step 2: Business Information</h3>
            <FormInput
              label="Business Name"
              value={merchantData.name || ''}
              onChangeText={(value) => setMerchantData({ name: value })}
              placeholder="Acme Corporation"
              required
            />
          </div>
        );
      
      case 3:
        return (
          <div>
            <h3>Step 3: Address (Optional)</h3>
            <FormInput
              label="Street Address"
              value={merchantData.address?.street_address || ''}
              onChangeText={(value) => setMerchantData({
                address: { ...merchantData.address, street_address: value }
              })}
              placeholder="Via Roma 1"
            />
            <FormInput
              label="ZIP Code"
              value={merchantData.address?.zip_code || ''}
              onChangeText={(value) => setMerchantData({
                address: { ...merchantData.address, zip_code: value }
              })}
              placeholder="00100"
              maxLength={5}
            />
            <FormInput
              label="City"
              value={merchantData.address?.city || ''}
              onChangeText={(value) => setMerchantData({
                address: { ...merchantData.address, city: value }
              })}
              placeholder="Roma"
            />
            <FormInput
              label="Province"
              value={merchantData.address?.province || ''}
              onChangeText={(value) => setMerchantData({
                address: { ...merchantData.address, province: value }
              })}
              placeholder="RM"
              maxLength={2}
            />
          </div>
        );
    }
  };
  
  if (!showCreateForm) {
    return (
      <div style={{ padding: '20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Provider Dashboard</h1>
          <div>
            <span>Welcome, {user?.email}</span>
            <Button title="Logout" variant="outline" onPress={logout} />
          </div>
        </header>
        
        <section>
          <h2>Merchants ({merchants.length})</h2>
          <Button
            title="Create New Merchant"
            variant="primary"
            onPress={() => setShowCreateForm(true)}
          />
          
          <div style={{ marginTop: '20px' }}>
            {merchants.map((merchant) => (
              <div key={merchant.uuid} style={{ 
                border: '1px solid #ccc', 
                padding: '15px', 
                margin: '10px 0',
                borderRadius: '5px'
              }}>
                <h3>{merchant.name}</h3>
                <p>Email: {merchant.email}</p>
                <p>Fiscal ID: {merchant.fiscal_id}</p>
                <p>Created: {new Date(merchant.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <header>
        <Button
          title="← Back to Dashboard"
          variant="outline"
          onPress={() => {
            setShowCreateForm(false);
            resetFlow();
          }}
        />
      </header>
      
      <div style={{ maxWidth: '600px', margin: '20px auto' }}>
        <h2>Create New Merchant</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                style={{
                  width: '30%',
                  height: '4px',
                  backgroundColor: step <= currentStep ? '#007AFF' : '#ccc',
                  borderRadius: '2px'
                }}
              />
            ))}
          </div>
          <p>Step {currentStep} of 3</p>
        </div>
        
        {renderCreateMerchantForm()}
        
        {flowError && (
          <div style={{ color: 'red', margin: '10px 0' }}>
            Error: {flowError}
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <Button
            title="Previous"
            variant="outline"
            onPress={previousStep}
            disabled={currentStep === 1}
          />
          
          <Button
            title={currentStep === 3 ? 'Create Merchant' : 'Next'}
            variant="primary"
            onPress={currentStep === 3 ? handleCreateMerchant : () => {
              const validation = validateCurrentStep();
              if (validation.isValid) {
                nextStep();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default ProviderDashboard;
```

This documentation covers every aspect of the A-Cube SDK, from basic setup to advanced usage patterns. Each function is explained with its purpose, parameters, return values, and practical examples.