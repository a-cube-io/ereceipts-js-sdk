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

Snapshot completo dello stato di un Point of Sale. Molti campi sono nullable in quanto dipendono dallo stato del PEM.

```typescript
interface Telemetry {
  pemId: string;
  pemStatus: string;
  pemStatusChangedAt: string | null;
  merchant: TelemetryMerchant;
  supplier: TelemetrySupplier;
  software: TelemetrySoftware;
  lastCommunicationAt: string | null;
  pendingReceipts: PendingReceipts | null;
  lastReceiptTransmission: TransmissionAttemptInfo | null;
  lastMessageFromMf2: MessageInfo | null;
  adeCorrispettiviTransmission: TransmissionAttemptInfo | null;
  lastMessageFromAde: MessageInfo | null;
  lottery: LotteryTelemetry;
}
```

### PemStatus

Lo stato del PEM è rappresentato come stringa. I valori comuni sono:

| Stato | Descrizione |
|-------|-------------|
| `ONLINE` | PEM operativo e connesso |
| `OFFLINE` | PEM non raggiungibile |

### TelemetryMerchant / TelemetrySupplier

Informazioni sull'esercente e sul fornitore. Tutti i campi sono nullable.

```typescript
interface TelemetryMerchant {
  vatNumber: string | null;
  fiscalCode: string | null;
  businessName: string | null;
}

interface TelemetrySupplier {
  vatNumber: string | null;
  fiscalCode: string | null;
  businessName: string | null;
}
```

### TelemetrySoftware

Informazioni sul software del registratore di cassa.

```typescript
interface TelemetrySoftware {
  code: string | null;
  name: string | null;
  approvalReference: string | null;
  versionInfo: TelemetrySoftwareVersion | null;
}

interface TelemetrySoftwareVersion {
  version: string | null;
  swid: string | null;
  installedAt: string | null;
  status: SoftwareVersionStatus;
}

type SoftwareVersionStatus = 'active';
```

### PendingReceipts

Scontrini in attesa di trasmissione.

```typescript
interface PendingReceipts {
  count: number;
  totalAmount: string;
}
```

### TransmissionAttemptInfo

Informazioni su un tentativo di trasmissione.

```typescript
interface TransmissionAttemptInfo {
  attemptedAt: string | null;
  outcome: string | null;
}
```

| Outcome | Descrizione |
|---------|-------------|
| `success` | Trasmissione riuscita |
| `failed` | Trasmissione fallita |

### MessageInfo

Messaggi ricevuti da MF2 o ADE.

```typescript
interface MessageInfo {
  receivedAt: string | null;
  content: string | null;
}
```

### LotteryTelemetry

Informazioni sulla lotteria degli scontrini.

```typescript
interface LotteryTelemetry {
  lastTransmission: TransmissionAttemptInfo | null;
  secretRequest: LotterySecretRequestInfo | null;
}

interface LotterySecretRequestInfo {
  requestedAt: string | null;
  outcome: string | null;
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

// Verifica scontrini in sospeso (con null check)
if (telemetry.pendingReceipts && telemetry.pendingReceipts.count > 0) {
  console.log(
    `${telemetry.pendingReceipts.count} scontrini in sospeso`,
    `per un totale di ${telemetry.pendingReceipts.totalAmount}`
  );
}

// Verifica ultima trasmissione (con null check)
if (telemetry.lastReceiptTransmission?.outcome === 'failed') {
  console.error(
    'Ultima trasmissione fallita:',
    telemetry.lastReceiptTransmission.attemptedAt
  );
}

// Info software (con null check)
if (telemetry.software.name && telemetry.software.versionInfo?.version) {
  console.log(
    'Software:',
    telemetry.software.name,
    'v' + telemetry.software.versionInfo.version
  );
}

// Lotteria (con null check)
if (telemetry.lottery.secretRequest?.requestedAt) {
  console.log('Ultimo secret request:', telemetry.lottery.secretRequest.requestedAt);
}
```

## Note Tecniche

- Endpoint: `GET /mf1/point-of-sales/{pemId}/telemetry`
- Autenticazione: mTLS (porta 444)
- I dati sono uno snapshot in tempo reale
- Molti campi sono nullable e richiedono controlli appropriati

## Prossimi Passi

- [Notifications API](./notifications.md)
- [PEM API](./pems.md)
- [SDK Instance](./sdk-instance.md)
