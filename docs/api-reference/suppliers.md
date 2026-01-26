# Supplier API

Gestione fornitori associati ai merchant.

## Accesso

```typescript
const suppliers = sdk.suppliers;
```

## Metodi

### create(merchantUuid, input)

Crea un nuovo fornitore.

```typescript
const supplier = await sdk.suppliers.create('merchant-uuid', {
  fiscalId: 'IT12345678901',
  name: 'Fornitore SRL',
  address: {
    streetAddress: 'Via Milano',
    streetNumber: '10',
    zipCode: '20100',
    city: 'Milano',
    province: 'MI',
  },
});
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `input` - `SupplierCreateInput`

**Ritorna:** `Promise<Supplier>`

### findById(merchantUuid, supplierUuid)

Ottiene un fornitore per UUID.

```typescript
const supplier = await sdk.suppliers.findById(
  'merchant-uuid',
  'supplier-uuid'
);
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `supplierUuid` - UUID del fornitore

**Ritorna:** `Promise<Supplier>`

### findAll(merchantUuid, params)

Lista fornitori con paginazione.

```typescript
const page = await sdk.suppliers.findAll('merchant-uuid', {
  page: 1,
});
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `params` - `SuppliersParams`

**Ritorna:** `Promise<Page<Supplier>>`

### update(merchantUuid, supplierUuid, input)

Aggiorna un fornitore.

```typescript
const updated = await sdk.suppliers.update(
  'merchant-uuid',
  'supplier-uuid',
  {
    name: 'Fornitore SRL - Aggiornato',
    address: {
      streetAddress: 'Via Torino',
      streetNumber: '20',
      zipCode: '20100',
      city: 'Milano',
      province: 'MI',
    },
  }
);
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `supplierUuid` - UUID del fornitore
- `input` - `SupplierUpdateInput`

**Ritorna:** `Promise<Supplier>`

### delete(merchantUuid, supplierUuid)

Elimina un fornitore.

```typescript
await sdk.suppliers.delete('merchant-uuid', 'supplier-uuid');
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `supplierUuid` - UUID del fornitore

**Ritorna:** `Promise<void>`

## Tipi

### Supplier

```typescript
interface Supplier {
  uuid: string;
  fiscalId: string;
  name: string;
  address?: Address;
}
```

### SupplierCreateInput

```typescript
interface SupplierCreateInput {
  fiscalId: string;
  name: string;
  address?: Address;
}
```

### SupplierUpdateInput

```typescript
interface SupplierUpdateInput {
  name: string;
  address?: Address;
}
```

### SuppliersParams

```typescript
interface SuppliersParams {
  page?: number;
}
```

### Address

```typescript
interface Address {
  streetAddress: string;
  streetNumber: string;
  zipCode: string;
  city: string;
  province: string;
}
```

## Esempi

### Gestione Completa Fornitori

```typescript
// Crea fornitore
const supplier = await sdk.suppliers.create('merchant-uuid', {
  fiscalId: 'IT98765432101',
  name: 'Distribuzione Italia SPA',
  address: {
    streetAddress: 'Via Industria',
    streetNumber: '100',
    zipCode: '40100',
    city: 'Bologna',
    province: 'BO',
  },
});

console.log('Fornitore creato:', supplier.uuid);

// Lista tutti i fornitori
const allSuppliers = await sdk.suppliers.findAll('merchant-uuid');

for (const s of allSuppliers.members) {
  console.log(`${s.name} (${s.fiscalId})`);
}

// Aggiorna fornitore
const updated = await sdk.suppliers.update(
  'merchant-uuid',
  supplier.uuid,
  {
    name: 'Distribuzione Italia SPA - Sede Centrale',
  }
);
```

## Prossimi Passi

- [Merchant API](./merchants.md)
- [Receipt API](./receipts.md)
