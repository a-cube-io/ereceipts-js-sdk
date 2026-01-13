# Telemetry API

Accesso ai dati di telemetria per monitorare lo stato e le prestazioni dei Point of Sale (PEM).

## Repository

```typescript
const telemetry = sdk.telemetry;
```

## Metodi

### getTelemetry(pemId)

Recupera lo snapshot di telemetria per un PEM specifico.

```typescript
const telemetryData = await sdk.telemetry.getTelemetry('pem-uuid-here');
```

**Parametri:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `pemId` | `string` | UUID del PEM |

**Ritorna:** `Promise<Telemetry>`

## Tipi

### Telemetry

Snapshot completo dello stato di un Point of Sale.

```typescript
interface Telemetry {
  pemId: string;
  pemStatus: PemStatus;
  pemStatusChangedAt: string;
  merchant: TelemetryMerchant;
  supplier: TelemetrySupplier;
  software: TelemetrySoftware;
  lastCommunicationAt: string;
  pendingReceipts: PendingReceipts;
  lastReceiptTransmission: Transmission;
  lastMessageFromMf2: Message;
  adeCorrispettiviTransmission: Transmission;
  lastMessageFromAde: Message;
  lottery: LotteryInfo;
}
```

### PemStatus

```typescript
type PemStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';
```

| Stato | Descrizione |
|-------|-------------|
| `ONLINE` | PEM operativo e connesso |
| `OFFLINE` | PEM non raggiungibile |
| `ERROR` | PEM in stato di errore |

### TelemetryMerchant / TelemetrySupplier

```typescript
interface TelemetryMerchant {
  vatNumber: string;
  fiscalCode: string | null;
  businessName: string;
}
```

### TelemetrySoftware

```typescript
interface TelemetrySoftware {
  code: string;
  name: string;
  approvalReference: string;
  versionInfo: TelemetrySoftwareVersion;
}

interface TelemetrySoftwareVersion {
  version: string;
  swid: string;
  installedAt: string;
  status: SoftwareStatus;
}

type SoftwareStatus = 'active' | 'inactive' | 'archived';
```

### PendingReceipts

```typescript
interface PendingReceipts {
  count: number;
  totalAmount: string;
}
```

### Transmission

```typescript
interface Transmission {
  attemptedAt: string;
  outcome: TransmissionOutcome;
}

type TransmissionOutcome = 'success' | 'failed' | 'pending';
```

### Message

```typescript
interface Message {
  receivedAt: string;
  content: string;
}
```

### LotteryInfo

```typescript
interface LotteryInfo {
  lastTransmission: Transmission;
  secretRequest: Transmission;
}
```

## TelemetryService

Per un'esperienza reattiva con caching e stato osservabile, usa `TelemetryService`:

```typescript
import { TelemetryService } from '@a-cube-io/ereceipts-js-sdk';

const telemetryService = new TelemetryService(
  sdk.telemetry,
  storagePort,
  networkPort
);

// Observable per stato (RxJS)
telemetryService.state$.subscribe((state) => {
  if (state.isLoading) {
    console.log('Caricamento...');
  } else if (state.error) {
    console.error('Errore:', state.error);
  } else if (state.data) {
    console.log('Telemetria:', state.data);
    console.log('Da cache:', state.isCached);
  }
});

// Fetch con fallback cache
const state = await telemetryService.getTelemetry('pem-uuid');

// Force refresh (ignora cache)
const freshState = await telemetryService.refreshTelemetry('pem-uuid');

// Cleanup
telemetryService.destroy();
```

### TelemetryState

```typescript
interface TelemetryState {
  data: Telemetry | null;
  isCached: boolean;
  isLoading: boolean;
  error?: string;
}
```

## Esempio Utilizzo

```typescript
// Fetch diretto
const telemetry = await sdk.telemetry.getTelemetry('pem-123');

// Verifica stato PEM
if (telemetry.pemStatus === 'OFFLINE') {
  console.warn('PEM offline da:', telemetry.pemStatusChangedAt);
}

// Verifica scontrini in sospeso
if (telemetry.pendingReceipts.count > 0) {
  console.log(
    `${telemetry.pendingReceipts.count} scontrini in sospeso`,
    `per un totale di ${telemetry.pendingReceipts.totalAmount}`
  );
}

// Verifica ultima trasmissione
if (telemetry.lastReceiptTransmission.outcome === 'failed') {
  console.error(
    'Ultima trasmissione fallita:',
    telemetry.lastReceiptTransmission.attemptedAt
  );
}

// Info software
console.log(
  'Software:',
  telemetry.software.name,
  'v' + telemetry.software.versionInfo.version
);
```

## Note Tecniche

- Endpoint: `GET /mf1/point-of-sales/{pemId}/telemetry`
- Autenticazione: mTLS (porta 444)
- I dati sono uno snapshot in tempo reale

## Prossimi Passi

- [Notifications API](./notifications.md)
- [PEM API](./pems.md)
- [SDK Instance](./sdk-instance.md)
