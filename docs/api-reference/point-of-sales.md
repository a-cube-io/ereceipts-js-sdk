# Point of Sale API

Gestione punti vendita (POS) e operazioni associate.

## Accesso

```typescript
const pointOfSales = sdk.pointOfSales;
```

## Metodi

### findById(serialNumber)

Ottiene dettagli di un punto vendita.

```typescript
const pos = await sdk.pointOfSales.findById('POS-SERIAL-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del POS

**Ritorna:** `Promise<PointOfSaleDetailed>`

### findAll(params)

Lista punti vendita con filtri.

```typescript
const page = await sdk.pointOfSales.findAll({
  status: 'ACTIVATED',
  page: 1,
  size: 20,
});
```

**Parametri:** `PointOfSaleListParams`

**Ritorna:** `Promise<Page<PointOfSale>>`

### activate(serialNumber, input)

Attiva un punto vendita con la chiave di registrazione.

```typescript
await sdk.pointOfSales.activate('POS-SERIAL-001', {
  registrationKey: 'REGISTRATION-KEY-FROM-PEM',
});
```

**Parametri:**
- `serialNumber` - Numero seriale del POS
- `input` - `ActivationRequest`

**Ritorna:** `Promise<void>`

### closeJournal(serialNumber)

Chiude il giornale corrente del POS.

```typescript
await sdk.pointOfSales.closeJournal('POS-SERIAL-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del POS

**Ritorna:** `Promise<void>`

### createInactivity(serialNumber)

Segnala un periodo di inattivita del POS.

```typescript
await sdk.pointOfSales.createInactivity('POS-SERIAL-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del POS

**Ritorna:** `Promise<void>`

### communicateOffline(serialNumber, input)

Comunica stato offline del POS.

```typescript
await sdk.pointOfSales.communicateOffline('POS-SERIAL-001', {
  timestamp: '2024-01-15T10:30:00Z',
  reason: 'Manutenzione programmata',
});
```

**Parametri:**
- `serialNumber` - Numero seriale del POS
- `input` - `PEMStatusOfflineRequest`

**Ritorna:** `Promise<void>`

## Tipi

### PointOfSale

```typescript
interface PointOfSale {
  serialNumber: string;
  status: PEMStatus;
  address: Address;
  operationalStatus: string;
}
```

### PointOfSaleDetailed

```typescript
interface PointOfSaleDetailed extends PointOfSale {
  registrationKey?: string;
}
```

### PEMStatus

```typescript
type PEMStatus =
  | 'NEW'
  | 'REGISTERED'
  | 'ACTIVATED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'DISCARDED';
```

### PointOfSaleType

```typescript
type PointOfSaleType = 'AP' | 'SP' | 'TM' | 'PV';
```

### PointOfSaleListParams

```typescript
interface PointOfSaleListParams {
  status?: PEMStatus;
  page?: number;
  size?: number;
}
```

### ActivationRequest

```typescript
interface ActivationRequest {
  registrationKey: string;
}
```

### PEMStatusOfflineRequest

```typescript
interface PEMStatusOfflineRequest {
  timestamp: string;
  reason: string;
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

### Flusso Completo Attivazione POS

```typescript
// 1. Crea PEM
const pem = await sdk.pems.create({
  merchantUuid: 'merchant-uuid',
  address: {
    streetAddress: 'Via Roma',
    streetNumber: '1',
    zipCode: '00100',
    city: 'Roma',
    province: 'RM',
  },
});

// 2. Attiva POS con chiave di registrazione
await sdk.pointOfSales.activate(pem.serialNumber, {
  registrationKey: pem.registrationKey,
});

// 3. Verifica stato
const pos = await sdk.pointOfSales.findById(pem.serialNumber);
console.log('Stato POS:', pos.status); // 'ACTIVATED'
```

### Lista POS Attivi

```typescript
const activePOS = await sdk.pointOfSales.findAll({
  status: 'ACTIVATED',
});

for (const pos of activePOS.members) {
  console.log(`${pos.serialNumber}: ${pos.address.city}`);
}
```

### Gestione Chiusura Giornale

```typescript
// Chiudi giornale a fine giornata
await sdk.pointOfSales.closeJournal('POS-SERIAL-001');

// Verifica chiusura nel report giornaliero
const reports = await sdk.dailyReports.findAll('merchant-uuid', {
  pemSerialNumber: 'POS-SERIAL-001',
});
```

## Prossimi Passi

- [PEM API](./pems.md)
- [Daily Report API](./daily-reports.md)
