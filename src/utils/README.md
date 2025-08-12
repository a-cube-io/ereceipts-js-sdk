# Utility Functions

A collection of utility functions for the ACube E-Receipt SDK.

## Object Utilities

### `clearObject<T>(obj: T): Partial<T>`

Removes all keys with null, undefined, or empty string values from an object, including nested objects.

```typescript
import { clearObject } from '@a-cube-io/ereceipts-js-sdk';

const dirtyData = {
  name: 'John',
  age: null,
  email: '',
  address: {
    street: 'Via Roma',
    number: '',
    city: null
  }
};

const cleanData = clearObject(dirtyData);
// Result: { name: 'John', address: { street: 'Via Roma' } }
```

### `clearObjectShallow<T>(obj: T): Partial<T>`

Removes null, undefined, or empty string values from an object (shallow - only top-level properties).

```typescript
import { clearObjectShallow } from '@a-cube-io/ereceipts-js-sdk';

const data = {
  name: 'John',
  age: null,
  address: {
    street: null,  // Will be preserved
    city: 'Rome'
  }
};

const result = clearObjectShallow(data);
// Result: { name: 'John', address: { street: null, city: 'Rome' } }
```

### `isEmpty(value: any): boolean`

Checks if a value is considered "empty" (null, undefined, or empty string).

```typescript
import { isEmpty } from '@a-cube-io/ereceipts-js-sdk';

isEmpty(null);        // true
isEmpty(undefined);   // true
isEmpty('');          // true
isEmpty('hello');     // false
isEmpty(0);           // false
isEmpty(false);       // false
```

### `hasNonEmptyValues<T>(obj: T): boolean`

Checks if an object has any non-empty values.

```typescript
import { hasNonEmptyValues } from '@a-cube-io/ereceipts-js-sdk';

hasNonEmptyValues({ name: 'John', age: null });    // true
hasNonEmptyValues({ name: null, age: undefined }); // false
hasNonEmptyValues({ count: 0, active: false });    // true (0 and false are not empty)
```

## Real-world Examples

### Cleaning API Request Parameters

```typescript
import { clearObject } from '@a-cube-io/ereceipts-js-sdk';

// Clean up API parameters before sending request
const apiParams = {
  page: 1,
  search: '',
  category: null,
  status: 'active',
  limit: undefined
};

const cleanParams = clearObject(apiParams);
// Result: { page: 1, status: 'active' }

// Use with API client
const results = await sdk.api.merchants.list(cleanParams);
```

### Cleaning Form Data

```typescript
import { clearObject } from '@a-cube-io/ereceipts-js-sdk';

// Clean form data before validation/submission
const formData = {
  vat_number: '12345678901',
  business_name: 'Test Company',
  first_name: '',      // User left blank
  last_name: null,     // Not provided
  email: 'test@company.com',
  address: {
    street_address: 'Via Roma',
    street_number: '123',
    zip_code: '',      // User left blank
    city: 'Roma',
    province: 'RM'
  }
};

const cleanFormData = clearObject(formData);
// Result: Clean object with only filled fields
// {
//   vat_number: '12345678901',
//   business_name: 'Test Company',
//   email: 'test@company.com',
//   address: {
//     street_address: 'Via Roma',
//     street_number: '123',
//     city: 'Roma',
//     province: 'RM'
//   }
// }

// Now validate and submit
const validation = MerchantCreateInputSchema.safeParse(cleanFormData);
if (validation.success) {
  await sdk.api.merchants.create(validation.data);
}
```

### Conditional Data Processing

```typescript
import { hasNonEmptyValues, clearObject } from '@a-cube-io/ereceipts-js-sdk';

const optionalData = {
  notes: '',
  tags: null,
  metadata: undefined
};

// Only include optional data if it has values
if (hasNonEmptyValues(optionalData)) {
  const cleanOptionalData = clearObject(optionalData);
  // Process the data...
}
```

## Type Safety

All utility functions are fully typed and work seamlessly with TypeScript:

```typescript
interface User {
  name: string;
  email?: string | null;
  age?: number | null;
}

const user: User = {
  name: 'John',
  email: '',
  age: null
};

// TypeScript knows the result type is Partial<User>
const cleanUser = clearObject(user);
// cleanUser type: Partial<User>
// cleanUser value: { name: 'John' }
```