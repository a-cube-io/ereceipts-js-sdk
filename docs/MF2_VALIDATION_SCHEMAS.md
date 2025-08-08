# MF2 API Validation Schemas Documentation

Comprehensive documentation for all MF2 API validation schemas in the ACube E-Receipt SDK.

---

## Overview

The MF2 API validation schemas provide comprehensive validation for advanced management features introduced in the MF2 API version. These schemas ensure data integrity, compliance with Italian fiscal regulations, and type safety.

### Key Features

- **🛡️ Italian Fiscal Compliance**: Validates Codice Fiscale and Partita IVA formats
- **📅 Date Range Validation**: Comprehensive date formatting and range checks
- **🏢 Address Validation**: Italian address format with required street numbers
- **📊 Status Management**: Enum validation for report and journal statuses
- **⚡ Performance Optimized**: Lightweight validation with clear error messages

---

## Suppliers Validation

### SupplierCreateInputSchema

Validates supplier creation data with Italian fiscal compliance.

```typescript
export const SupplierCreateInputSchema = z.object({
  fiscal_id: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(FISCAL_ID_REGEX, { message: 'invalidFiscalId' })
    .toUpperCase(),
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  address: AddressSchema.optional(),
});
```

#### Key Validations
- **fiscal_id**: Italian Codice Fiscale or Partita IVA format
- **name**: Required, maximum 200 characters
- **address**: Optional Italian address with street_number

#### Example Usage
```typescript
import { SupplierCreateInputSchema } from '@/validations/api';

const supplierData = {
  fiscal_id: '12345678901', // Partita IVA
  name: 'Fornitore Esempio S.r.l.',
  address: {
    street_address: 'Via Roma',
    street_number: '123',
    zip_code: '00100',
    city: 'Roma',
    province: 'RM'
  }
};

const result = SupplierCreateInputSchema.safeParse(supplierData);
if (result.success) {
  await sdk.api.suppliers.create(result.data);
}
```

### SupplierUpdateInputSchema

Validates supplier update operations (excludes fiscal_id as it's immutable).

```typescript
export const SupplierUpdateInputSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .max(200, { message: 'nameMaxLength' }),
  address: AddressSchema.optional(),
});
```

---

## Daily Reports Validation

### DailyReportStatusSchema

Validates daily report status values with Italian fiscal reporting requirements.

```typescript
export const DAILY_REPORT_STATUS_OPTIONS = ['pending', 'sent', 'error'] as const;

export const DailyReportStatusSchema = z.enum(DAILY_REPORT_STATUS_OPTIONS, {
  message: 'invalidDailyReportStatus'
});
```

#### Status Values
- **pending**: Report generated but not yet sent to fiscal authorities
- **sent**: Report successfully transmitted to Agenzia delle Entrate
- **error**: Report transmission failed, requires attention

### DailyReportsParamsSchema

Validates filtering parameters for daily reports list operations.

```typescript
export const DailyReportsParamsSchema = z.object({
  pem_serial_number: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .optional(),
  date_from: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    })
    .optional(),
  date_to: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    })
    .optional(),
  status: DailyReportStatusSchema.optional(),
  page: z
    .number()
    .min(1, { message: 'pageMinValue' })
    .optional(),
});
```

#### Example Usage
```typescript
import { DailyReportsParamsSchema } from '@/validations/api';

const filters = {
  pem_serial_number: 'PEM123456',
  status: 'pending',
  date_from: '2024-01-01',
  date_to: '2024-01-31'
};

const result = DailyReportsParamsSchema.safeParse(filters);
if (result.success) {
  const reports = await sdk.api.dailyReports.list(result.data);
}
```

---

## Journals Validation

### JournalCloseInputSchema

Validates fiscal journal closure operations with timestamp and reason validation.

```typescript
export const JournalCloseInputSchema = z.object({
  closing_timestamp: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'invalidDateFormat'
    }),
  reason: z
    .string()
    .max(255, { message: 'reasonMaxLength' })
    .optional(),
});
```

#### Key Validations
- **closing_timestamp**: Required ISO 8601 date string
- **reason**: Optional, maximum 255 characters

#### Example Usage
```typescript
import { JournalCloseInputSchema } from '@/validations/api';

const closeData = {
  closing_timestamp: new Date().toISOString(),
  reason: 'Fine giornata lavorativa'
};

const result = JournalCloseInputSchema.safeParse(closeData);
if (result.success) {
  await sdk.api.journals.close(journalUuid, result.data);
}
```

---

## Common Validation Patterns

### Italian Fiscal ID Validation

All MF2 schemas use a comprehensive regex for Italian fiscal identification:

```typescript
const FISCAL_ID_REGEX = /^([A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]|[0-9]{11})$/;
```

#### Supported Formats
- **Codice Fiscale**: 16-character alphanumeric code for individuals
- **Partita IVA**: 11-digit numeric code for businesses

### Address Schema Integration

All MF2 APIs use the enhanced AddressSchema with required `street_number`:

```typescript
export const AddressSchema = z.object({
  street_address: z.string().min(1, { message: 'fieldIsRequired' }),
  street_number: z.string().min(1, { message: 'fieldIsRequired' }),
  zip_code: z
    .string()
    .min(1, { message: 'fieldIsRequired' })
    .regex(/^\d{5}$/, { message: 'invalidZipCode' }),
  city: z.string().min(1, { message: 'fieldIsRequired' }),
  province: z
    .string()
    .min(2, { message: 'provinceMinLength' })
    .max(2, { message: 'provinceMaxLength' })
    .toUpperCase(),
});
```

### Date Validation Pattern

Consistent date validation across all MF2 schemas:

```typescript
const dateValidation = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: 'invalidDateFormat'
  });
```

---

## Error Messages

### MF2-Specific Error Messages

```typescript
export const ValidationMessages = {
  // ... existing messages
  reasonMaxLength: 'Reason is too long (max 255 characters)',
  pageMinValue: 'Page number must be at least 1',
  invalidDailyReportStatus: 'Daily report status must be one of: pending, sent, error',
} as const;
```

### Localization Support

All error messages are designed for easy localization and integration with i18n systems.

---

## Integration Examples

### React Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SupplierCreateInputSchema } from '@/validations/api';

function SupplierForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(SupplierCreateInputSchema)
  });

  const onSubmit = async (data) => {
    try {
      await sdk.api.suppliers.create(data);
    } catch (error) {
      // Handle API errors
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('fiscal_id')} placeholder="Partita IVA" />
      {errors.fiscal_id && <span>{errors.fiscal_id.message}</span>}
      
      <input {...register('name')} placeholder="Nome Fornitore" />
      {errors.name && <span>{errors.name.message}</span>}
      
      <button type="submit">Crea Fornitore</button>
    </form>
  );
}
```

### Server-Side Validation

```typescript
import { JournalCloseInputSchema } from '@/validations/api';

app.post('/api/journals/:id/close', async (req, res) => {
  try {
    // Validate request body
    const result = JournalCloseInputSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues
      });
    }
    
    // Proceed with validated data
    const closedJournal = await sdk.api.journals.close(
      req.params.id, 
      result.data
    );
    
    res.json(closedJournal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Best Practices

### 1. Always Validate Before API Calls

```typescript
// ✅ Good
const result = SupplierCreateInputSchema.safeParse(userData);
if (result.success) {
  await sdk.api.suppliers.create(result.data);
} else {
  handleValidationErrors(result.error);
}

// ❌ Bad
await sdk.api.suppliers.create(userData); // No validation
```

### 2. Use Type-Safe Error Handling

```typescript
// ✅ Good
if (!result.success) {
  result.error.issues.forEach(issue => {
    console.error(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

### 3. Leverage TypeScript Integration

```typescript
// ✅ Good - Full type safety
type SupplierInput = z.infer<typeof SupplierCreateInputSchema>;

const createSupplier = (data: SupplierInput) => {
  // data is fully typed
  return sdk.api.suppliers.create(data);
};
```

---

## Migration Notes

### Breaking Changes from Previous Versions

1. **Address Schema**: `street_number` is now required
2. **PEM Status**: `ACTIVE` changed to `ACTIVATED`
3. **Cashier Creation**: `first_name` and `last_name` now required

### Migration Example

```typescript
// Before (v0.x)
const supplier = {
  fiscal_id: '12345678901',
  name: 'Test Supplier',
  address: {
    street_address: 'Via Roma 123', // street_number was embedded
    zip_code: '00100',
    city: 'Roma',
    province: 'RM'
  }
};

// After (v1.x)
const supplier = {
  fiscal_id: '12345678901',
  name: 'Test Supplier',  
  address: {
    street_address: 'Via Roma',
    street_number: '123', // Now required as separate field
    zip_code: '00100',
    city: 'Roma',
    province: 'RM'
  }
};
```