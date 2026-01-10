# PEM API

Gestione PEM (Punto di Emissione) per la registrazione dei punti vendita.

## Accesso

```typescript
const pems = sdk.pems;
```

## Metodi

### create(input)

Crea un nuovo PEM.

```typescript
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
```

**Parametri:** `PemCreateInput`

**Ritorna:** `Promise<PemCreateOutput>`

La risposta include `serialNumber` e `registrationKey` necessari per attivare il POS.

### findBySerialNumber(serialNumber)

Ottiene informazioni di un PEM.

```typescript
const pem = await sdk.pems.findBySerialNumber('PEM-SERIAL-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<PointOfSaleMf2>`

### findAllByMerchant(merchantUuid, page)

Lista PEM di un merchant.

```typescript
const page = await sdk.pems.findAllByMerchant('merchant-uuid', 1);
```

**Parametri:**
- `merchantUuid` - UUID del merchant
- `page` - Numero pagina (opzionale)

**Ritorna:** `Promise<Page<PointOfSaleMf2>>`

### getCertificates(serialNumber)

Ottiene i certificati mTLS di un PEM.

```typescript
const certs = await sdk.pems.getCertificates('PEM-SERIAL-001');
```

**Parametri:**
- `serialNumber` - Numero seriale del PEM

**Ritorna:** `Promise<PemCertificates>`

## Tipi

### PemCreateInput

```typescript
interface PemCreateInput {
  merchantUuid: string;
  address?: Address;
}
```

### PemCreateOutput

```typescript
interface PemCreateOutput {
  serialNumber: string;
  registrationKey: string;
}
```

### PemCertificates

```typescript
interface PemCertificates {
  mtlsCertificate: string;
  activationXmlResponse?: string;
}
```

### PointOfSaleMf2

```typescript
interface PointOfSaleMf2 {
  id: string;
  status: PEMStatus;
  type: PointOfSaleType;
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

### Flusso Completo Creazione PEM

```typescript
// 1. Crea PEM per il merchant
const pem = await sdk.pems.create({
  merchantUuid: 'merchant-uuid',
  address: {
    streetAddress: 'Via Nazionale',
    streetNumber: '50',
    zipCode: '00184',
    city: 'Roma',
    province: 'RM',
  },
});

console.log('PEM creato:', pem.serialNumber);
console.log('Chiave registrazione:', pem.registrationKey);

// 2. Attiva il POS associato
await sdk.pointOfSales.activate(pem.serialNumber, {
  registrationKey: pem.registrationKey,
});

// 3. Ottieni certificati per mTLS
const certs = await sdk.pems.getCertificates(pem.serialNumber);

// 4. Configura certificato nell'SDK
await sdk.storeCertificate(certs.mtlsCertificate, 'private-key', {
  format: 'pem',
});
```

### Lista PEM di un Merchant

```typescript
const merchantPems = await sdk.pems.findAllByMerchant('merchant-uuid');

for (const pem of merchantPems.members) {
  console.log(`PEM ${pem.id}: ${pem.status} (${pem.type})`);
}
```

### Verifica Stato PEM

```typescript
const pem = await sdk.pems.findBySerialNumber('PEM-SERIAL-001');

switch (pem.status) {
  case 'NEW':
    console.log('PEM appena creato, da attivare');
    break;
  case 'ACTIVATED':
    console.log('PEM attivo e pronto');
    break;
  case 'OFFLINE':
    console.log('PEM offline, verificare connettivita');
    break;
}
```

## Prossimi Passi

- [Point of Sale API](./point-of-sales.md)
- [Cash Register API](./cash-registers.md)
