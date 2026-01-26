# Cashier API

Gestione cassieri.

## Accesso

```typescript
const cashiers = sdk.cashiers;
```

## Metodi

### create(input)

Crea un nuovo cassiere.

```typescript
const cashier = await sdk.cashiers.create({
  merchantUuid: 'merchant-uuid',
  email: 'cassiere@example.com',
  name: 'Mario Rossi',
  displayName: 'Mario R.',
});
```

**Parametri:** `CashierCreateInput`

**Ritorna:** `Promise<Cashier>`

### findMe()

Ottiene il cassiere corrente (autenticato).

```typescript
const me = await sdk.cashiers.findMe();
```

**Ritorna:** `Promise<Cashier>`

### findById(uuid)

Ottiene un cassiere per UUID.

```typescript
const cashier = await sdk.cashiers.findById('cashier-uuid');
```

**Parametri:**
- `uuid` - UUID cassiere

**Ritorna:** `Promise<Cashier>`

### findAll(params?)

Lista cassieri con filtri.

```typescript
const page = await sdk.cashiers.findAll({
  merchantUuid: 'merchant-uuid',
  status: 'active',
  page: 1,
  size: 20,
});
```

**Parametri:** `CashierListParams` (opzionale)

**Ritorna:** `Promise<Page<Cashier>>`

### delete(uuid)

Elimina un cassiere.

```typescript
await sdk.cashiers.delete('cashier-uuid');
```

**Parametri:**
- `uuid` - UUID cassiere

**Ritorna:** `Promise<void>`

## Tipi

### Cashier

```typescript
interface Cashier {
  uuid: string;
  merchantUuid: string;
  displayName: string | null;
  email: string;
  name: string;
  status: 'active' | 'disabled';
}
```

### CashierCreateInput

```typescript
interface CashierCreateInput {
  merchantUuid: string;
  email: string;
  name: string;
  displayName?: string;
}
```

### CashierListParams

```typescript
interface CashierListParams {
  merchantUuid?: string;
  status?: 'active' | 'disabled';
  page?: number;
  size?: number;
}
```

## Prossimi Passi

- [Cash Register API](./cash-registers.md)
- [Point of Sale API](./point-of-sales.md)
