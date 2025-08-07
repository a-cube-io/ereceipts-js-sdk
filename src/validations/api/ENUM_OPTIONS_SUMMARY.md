# Enum Options Arrays Summary

This document provides a comprehensive overview of all enum options arrays available in the ACube E-Receipt validation system.

## 📋 Available Enum Options Arrays

### 🧾 Receipt Related

#### `VAT_RATE_CODE_OPTIONS` (22 values)
Italian VAT rate codes for receipt items:
```typescript
[
  '4', '5', '10', '22', '2', '6.4', '7', '7.3', '7.5', '7.65', '7.95', 
  '8.3', '8.5', '8.8', '9.5', '12.3', 'N1', 'N2', 'N3', 'N4', 'N5', 'N6'
]
```
- **Standard rates**: 22% (most common), 10% (reduced), 4% (super reduced)
- **Special rates**: Various regional and sector-specific rates
- **Exempt codes**: N1-N6 for VAT-exempt transactions

#### `GOOD_OR_SERVICE_OPTIONS` (2 values)
Classification for receipt items:
```typescript
['B', 'S']
```
- **B**: Beni (Goods) - Physical products
- **S**: Servizi (Services) - Intangible services

#### `RECEIPT_PROOF_TYPE_OPTIONS` (3 values)
Proof types for receipt return/void operations:
```typescript
['POS', 'VR', 'ND']
```
- **POS**: Point of Sale receipt
- **VR**: Virtual Receipt
- **ND**: No Document

### 🖥️ PEM (Point of Electronic Manifestation) Related

#### `PEM_STATUS_OPTIONS` (6 values)
PEM device status values:
```typescript
['NEW', 'REGISTERED', 'ACTIVE', 'ONLINE', 'OFFLINE', 'DISCARDED']
```
- **NEW**: Newly created PEM
- **REGISTERED**: Registered with fiscal authorities
- **ACTIVE**: Active and ready for use
- **ONLINE**: Currently connected and operational
- **OFFLINE**: Temporarily disconnected
- **DISCARDED**: Permanently deactivated

#### `PEM_TYPE_OPTIONS` (4 values)
PEM device types:
```typescript
['AP', 'SP', 'TM', 'PV']
```
- **AP**: Apparecchio POS (POS Device)
- **SP**: Sistema POS (POS System)
- **TM**: Terminale Mobile (Mobile Terminal)
- **PV**: Punto Vendita (Point of Sale)

## 🚀 Usage Examples

### Form Generation
```typescript
import { VAT_RATE_CODE_OPTIONS, PEM_STATUS_OPTIONS } from '@/validations/api';

// Generate form select options
const vatOptions = VAT_RATE_CODE_OPTIONS.map(rate => ({
  value: rate,
  label: rate.startsWith('N') ? `Exempt (${rate})` : `${rate}%`,
  group: rate.startsWith('N') ? 'Exempt' : 'Taxable'
}));

const statusOptions = PEM_STATUS_OPTIONS.map(status => ({
  value: status,
  label: status.charAt(0) + status.slice(1).toLowerCase(),
  disabled: status === 'DISCARDED'
}));
```

### Type-Safe Validation
```typescript
import { GOOD_OR_SERVICE_OPTIONS } from '@/validations/api';

function isValidGoodOrService(value: string): value is typeof GOOD_OR_SERVICE_OPTIONS[number] {
  return GOOD_OR_SERVICE_OPTIONS.includes(value as any);
}

// Usage
const userInput = 'B';
if (isValidGoodOrService(userInput)) {
  // userInput is now typed as 'B' | 'S'
  console.log('Valid good/service type:', userInput);
}
```

### React Component Integration
```typescript
import { VAT_RATE_CODE_OPTIONS } from '@/validations/api';

interface VATSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

function VATSelector({ value, onChange }: VATSelectorProps) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select VAT Rate</option>
      {VAT_RATE_CODE_OPTIONS.map(rate => (
        <option key={rate} value={rate}>
          {rate.startsWith('N') ? `Exempt - ${rate}` : `${rate}%`}
        </option>
      ))}
    </select>
  );
}
```

### Validation Rules
```typescript
import { PEM_TYPE_OPTIONS, PEM_STATUS_OPTIONS } from '@/validations/api';
import { z } from 'zod';

// Custom validation using enum options
const CustomPEMSchema = z.object({
  type: z.enum(PEM_TYPE_OPTIONS),
  status: z.enum(PEM_STATUS_OPTIONS),
  // Add business rules
}).refine((data) => {
  // Business rule: TM (Mobile Terminal) cannot be DISCARDED directly
  if (data.type === 'TM' && data.status === 'DISCARDED') {
    return false;
  }
  return true;
}, {
  message: 'Mobile terminals must be set to OFFLINE before DISCARDED',
  path: ['status']
});
```

## 🎯 Benefits

### Type Safety
- **Compile-time validation**: TypeScript catches invalid enum values
- **IntelliSense support**: IDE autocompletion for all valid options
- **Refactoring safety**: Find all usages when enum values change

### Consistency
- **Single source of truth**: All enum values defined in one place
- **Synchronized validation**: Schema and UI use same values
- **Easy maintenance**: Update once, change everywhere

### Developer Experience
- **Clear documentation**: Self-documenting code with meaningful names
- **Easy form generation**: Direct mapping to UI components
- **Validation integration**: Seamless integration with Zod schemas

## 📝 Maintenance Notes

### Adding New Values
1. Update the options array in the respective file
2. Update tests to reflect new count
3. Update documentation examples
4. Verify TypeScript compilation

### Removing Values
1. Check for breaking changes in dependent code
2. Update validation schemas
3. Update tests and documentation
4. Consider deprecation strategy for existing data

### Italian Compliance
- VAT rates follow Italian fiscal regulations
- PEM types align with Italian electronic receipts system
- All codes maintain compatibility with Agenzia delle Entrate requirements