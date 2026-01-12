# Cash Register API

Gestione registratori di cassa virtuali associati ai PEM.

## Accesso

```typescript
const cashRegisters = sdk.cashRegisters;
```

## Metodi

### create(input)

Crea un nuovo registratore di cassa.

```typescript
const cashRegister = await sdk.cashRegisters.create({
  pemSerialNumber: 'PEM-SERIAL-001',
  name: 'Cassa 1',
});
```

**Parametri:** `CashRegisterCreateInput`

**Ritorna:** `Promise<CashRegisterDetailed>`

La risposta include il certificato mTLS e la chiave privata per configurare il dispositivo.

### findById(uuid)

Ottiene un registratore di cassa per UUID.

```typescript
const cashRegister = await sdk.cashRegisters.findById('cash-register-uuid');
```

**Parametri:**
- `uuid` - UUID del registratore di cassa

**Ritorna:** `Promise<CashRegister>`

### findAll(params)

Lista registratori di cassa con filtri.

```typescript
const page = await sdk.cashRegisters.findAll({
  pemId: 'pem-uuid',
  page: 1,
  size: 20,
});
```

**Parametri:** `CashRegisterListParams`

**Ritorna:** `Promise<Page<CashRegister>>`

### update(uuid, input)

Aggiorna un registratore di cassa.

```typescript
const updated = await sdk.cashRegisters.update('cash-register-uuid', {
  name: 'Cassa 1 - Aggiornata',
});
```

**Parametri:**
- `uuid` - UUID del registratore di cassa
- `input` - `CashRegisterUpdateInput`

**Ritorna:** `Promise<CashRegister>`

## Tipi

### CashRegister

```typescript
interface CashRegister {
  uuid: string;
  pemSerialNumber: string;
  name: string;
}
```

### CashRegisterDetailed

```typescript
interface CashRegisterDetailed extends CashRegister {
  mtlsCertificate: string;
  privateKey: string;
}
```

### CashRegisterCreateInput

```typescript
interface CashRegisterCreateInput {
  pemSerialNumber: string;
  name: string;
}
```

### CashRegisterUpdateInput

```typescript
interface CashRegisterUpdateInput {
  name: string;
}
```

### CashRegisterListParams

```typescript
interface CashRegisterListParams {
  page?: number;
  size?: number;
  pemId?: string;
}
```

## Esempi

### Creare e Configurare un Registratore di Cassa

```typescript
// 1. Crea registratore di cassa
const newCashRegister = await sdk.cashRegisters.create({
  pemSerialNumber: 'PEM-001',
  name: 'Cassa principale',
});

// 2. Salva certificato mTLS per operazioni future
await sdk.storeCertificate(
  newCashRegister.mtlsCertificate,
  newCashRegister.privateKey,
  { format: 'pem' }
);

console.log('Registratore creato:', newCashRegister.uuid);
```

### Lista Registratori per PEM

```typescript
const page = await sdk.cashRegisters.findAll({
  pemId: 'pem-uuid',
});

for (const cashRegister of page.members) {
  console.log(`${cashRegister.name}: ${cashRegister.uuid}`);
}
```

## Prossimi Passi

- [Point of Sale API](./point-of-sales.md)
- [PEM API](./pems.md)
