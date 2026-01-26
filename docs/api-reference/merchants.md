# Merchant API

Gestione esercenti (merchant).

## Accesso

```typescript
const merchants = sdk.merchants;
```

## Metodi

### create(input)

Crea un nuovo esercente.

```typescript
const merchant = await sdk.merchants.create({
  vatNumber: 'IT12345678901',
  businessName: 'Azienda SRL',
  fiscalCode: 'RSSMRA80A01H501U',
  address: {
    street: 'Via Roma 1',
    city: 'Milano',
    province: 'MI',
    postalCode: '20100',
    country: 'IT',
  },
});
```

**Parametri:** `MerchantCreateInput`

**Ritorna:** `Promise<Merchant>`

### findById(uuid)

Ottiene un esercente per UUID.

```typescript
const merchant = await sdk.merchants.findById('merchant-uuid');
```

**Parametri:**
- `uuid` - UUID esercente

**Ritorna:** `Promise<Merchant>`

### findAll(params?)

Lista esercenti con paginazione.

```typescript
const page = await sdk.merchants.findAll({
  page: 1,
  size: 20,
});
```

**Parametri:** `MerchantsParams` (opzionale)

**Ritorna:** `Promise<Page<Merchant>>`

### update(uuid, input)

Aggiorna un esercente.

```typescript
const updated = await sdk.merchants.update('merchant-uuid', {
  businessName: 'Nuova Ragione Sociale',
});
```

**Parametri:**
- `uuid` - UUID esercente
- `input` - `MerchantUpdateInput`

**Ritorna:** `Promise<Merchant>`

## Tipi

### Merchant

```typescript
interface Merchant {
  uuid: string;
  vatNumber: string;
  businessName: string;
  fiscalCode?: string;
  address?: MerchantAddress;
  createdAt: string;
  updatedAt: string;
}
```

### MerchantCreateInput

```typescript
interface MerchantCreateInput {
  vatNumber: string;
  businessName: string;
  fiscalCode?: string;
  address?: MerchantAddress;
}
```

### MerchantAddress

```typescript
interface MerchantAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}
```

## Prossimi Passi

- [Cashier API](./cashiers.md)
- [Cash Register API](./cash-registers.md)
