# API Validation Schemas

This directory contains Zod validation schemas for all API input DTOs in the ACube E-Receipt SDK. These schemas provide runtime validation and TypeScript type safety for user inputs.

## Features

- 🔒 **Runtime Validation**: Validate data at runtime with detailed error messages
- 🎯 **Type Safety**: Full TypeScript integration with inferred types
- 🌐 **Internationalization Ready**: Structured error messages for easy i18n
- 📚 **Comprehensive Coverage**: All API input DTOs covered
- 🎨 **Customizable**: Easy to extend and modify validation rules

## Quick Start

```typescript
import { ReceiptInputSchema, validateInput } from '@/validations/api';

// Validate user input
const userInput = {
  items: [
    {
      quantity: "2",
      description: "Coffee",
      unit_price: "2.50",
      vat_rate_code: "22"
    }
  ],
  cash_payment_amount: "5.00"
};

const result = validateInput(ReceiptInputSchema, userInput);

if (!result.success) {
  console.error('Validation failed:', result.errors);
} else {
  console.log('Valid data:', result.data);
  // result.data is now type-safe ReceiptInputType
}
```

## Available Schemas

### Receipts (`receipts.ts`)
- `ReceiptInputSchema` - Main receipt creation schema
- `ReceiptItemSchema` - Individual receipt item validation
- `ReceiptReturnOrVoidViaPEMInputSchema` - Return/void via PEM
- `ReceiptReturnOrVoidWithProofInputSchema` - Return/void with proof

**Enum Options Arrays:**
- `VAT_RATE_CODE_OPTIONS` - All Italian VAT rate codes (22 values)
- `GOOD_OR_SERVICE_OPTIONS` - Goods or Services ('B', 'S')
- `RECEIPT_PROOF_TYPE_OPTIONS` - Receipt proof types ('POS', 'VR', 'ND')

### Cashiers (`cashiers.ts`)
- `CashierCreateInputSchema` - Cashier creation with email/password validation

### Point of Sales (`point-of-sales.ts`)
- `ActivationRequestSchema` - POS activation
- `PEMStatusOfflineRequestSchema` - PEM status updates
- `AddressSchema` - Reusable address validation

**Enum Options Arrays:**
- `PEM_STATUS_OPTIONS` - PEM status values ('NEW', 'REGISTERED', 'ACTIVE', 'ONLINE', 'OFFLINE', 'DISCARDED')

### Cash Registers (`cash-registers.ts`)
- `CashRegisterCreateSchema` - Cash register creation

### Merchants (`merchants.ts`)
- `MerchantCreateInputSchema` - Merchant creation with fiscal ID validation
- `MerchantUpdateInputSchema` - Merchant updates

### PEMs (`pems.ts`)
- `PemCreateInputSchema` - PEM creation for MF2 API
- `PemDataSchema` - PEM configuration data

**Enum Options Arrays:**
- `PEM_TYPE_OPTIONS` - PEM types ('AP', 'SP', 'TM', 'PV')

## Usage Patterns

### 1. Using Enum Options Arrays

```typescript
import { 
  VAT_RATE_CODE_OPTIONS, 
  GOOD_OR_SERVICE_OPTIONS,
  PEM_STATUS_OPTIONS,
  PEM_TYPE_OPTIONS 
} from '@/validations/api';

// Create select options for forms
const vatRateOptions = VAT_RATE_CODE_OPTIONS.map(code => ({
  value: code,
  label: `${code}%`,
  disabled: code.startsWith('N') // Disable exempt rates
}));

const goodOrServiceOptions = GOOD_OR_SERVICE_OPTIONS.map(type => ({
  value: type,
  label: type === 'B' ? 'Goods (Beni)' : 'Services (Servizi)'
}));

// Use in React components
function VATRateSelect() {
  return (
    <select>
      {vatRateOptions.map(option => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Type-safe usage
const selectedRate: typeof VAT_RATE_CODE_OPTIONS[number] = '22';
console.log(VAT_RATE_CODE_OPTIONS.includes(selectedRate)); // true
```

### 2. Basic Validation

```typescript
import { ReceiptInputSchema } from '@/validations/api';

const result = ReceiptInputSchema.safeParse(userInput);
if (!result.success) {
  // Handle validation errors
  result.error.errors.forEach(error => {
    console.log(`${error.path.join('.')}: ${error.message}`);
  });
}
```

### 2. Form Integration (React)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReceiptInputSchema, ReceiptInputType } from '@/validations/api';

function ReceiptForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReceiptInputType>({
    resolver: zodResolver(ReceiptInputSchema),
  });

  const onSubmit = (data: ReceiptInputType) => {
    // data is validated and type-safe
    createReceipt(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 3. API Client Integration

```typescript
import { ReceiptInputSchema, ReceiptInputType } from '@/validations/api';

class ReceiptsAPI {
  async create(receiptData: unknown): Promise<ReceiptOutput> {
    // Validate input before API call
    const result = ReceiptInputSchema.safeParse(receiptData);
    
    if (!result.success) {
      throw new ValidationError('Invalid receipt data', result.error.errors);
    }
    
    // Now result.data is type-safe ReceiptInputType
    return this.httpClient.post('/receipts', result.data);
  }
}
```

### 4. Custom Validation Messages

```typescript
import { ValidationMessages } from '@/validations/api';

// Use predefined messages for consistency
const customMessages = {
  ...ValidationMessages,
  fieldIsRequired: 'Campo obbligatorio', // Italian translation
};
```

## Validation Rules

### Receipt Items
- `quantity`: Required string, minimum 1 character
- `description`: Required string, minimum 1 character  
- `unit_price`: Required string, minimum 1 character
- `vat_rate_code`: Optional enum with Italian VAT rates
- `discount`: Optional nullable string

### Payment Methods
- At least one payment method must have a value > 0
- `cash_payment_amount`: Optional string
- `electronic_payment_amount`: Optional string  
- `ticket_restaurant_payment_amount`: Optional string

### Italian Fiscal ID
- Supports both Codice Fiscale (16 chars) and Partita IVA (11 digits)
- Automatic uppercase conversion
- Format validation with regex

### Email Validation
- Standard email format validation
- Required for cashiers and merchants

### Password Security
- Minimum 8 characters
- Must contain: uppercase, lowercase, number, special character
- Used for cashiers and merchants

## Error Handling

All validation errors follow a consistent structure:

```typescript
interface ValidationError {
  field: string;    // Path to the field (e.g., "items.0.quantity")
  message: string;  // Human-readable error message
  code: string;     // Error code for programmatic handling
}
```

## Extending Schemas

To add custom validation:

```typescript
import { ReceiptInputSchema } from '@/validations/api';

// Extend existing schema
const CustomReceiptSchema = ReceiptInputSchema.extend({
  custom_field: z.string().optional(),
});

// Add custom validation
const StrictReceiptSchema = ReceiptInputSchema.refine(
  (data) => data.items.length <= 50,
  { message: 'Maximum 50 items allowed', path: ['items'] }
);
```

## Best Practices

1. **Always validate user input** before sending to API
2. **Use type-safe validation** with `safeParse()` instead of `parse()`
3. **Provide meaningful error messages** to users
4. **Validate early** in your application flow
5. **Cache validation results** for better performance
6. **Use consistent error handling** across your application

## Integration with ACube SDK

These schemas are designed to work seamlessly with the ACube E-Receipt SDK:

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';
import { ReceiptInputSchema, validateInput } from '@/validations/api';

const sdk = await createACubeSDK({ environment: 'production' });

async function createReceipt(userInput: unknown) {
  // Validate input
  const validation = validateInput(ReceiptInputSchema, userInput);
  
  if (!validation.success) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  // Use validated data with SDK
  return await sdk.api.receipts.create(validation.data);
}
```