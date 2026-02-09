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

Per un'esperienza reattiva con polling automatico e stato osservabile, usa `TelemetryService`:

```typescript
import { TelemetryService } from '@a-cube-io/ereceipts-js-sdk';

const telemetryService = new TelemetryService(
  sdk.telemetry,
  networkPort,
  { pollIntervalMs: 60000 }  // default: 60 secondi
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
    console.log('Ultimo fetch:', new Date(state.lastFetchedAt));
  }
});

// Avvia polling automatico
telemetryService.startPolling('pem-uuid');

// Fetch con cache (avvia polling se non attivo)
const state = await telemetryService.getTelemetry('pem-uuid');

// Force refresh (ignora cache)
const freshState = await telemetryService.refreshTelemetry('pem-uuid');

// Trigger sync manuale
const syncedState = await telemetryService.triggerSync();

// Pulisci dati
telemetryService.clearTelemetry();

// Stop polling
telemetryService.stopPolling();

// Cleanup
telemetryService.destroy();
```

### TelemetryState

```typescript
interface TelemetryState {
  data: Telemetry | null;
  isCached: boolean;
  isLoading: boolean;
  lastFetchedAt: number | null;  // timestamp in ms
  error?: string;
}
```

### TelemetryServiceConfig

```typescript
interface TelemetryServiceConfig {
  pollIntervalMs?: number;  // default: 60000 (60 secondi)
}
```

### Metodi TelemetryService

| Metodo | Descrizione |
|--------|-------------|
| `startPolling(pemId)` | Avvia polling per un PEM specifico |
| `stopPolling()` | Ferma il polling |
| `getTelemetry(pemId)` | Ritorna stato corrente (avvia polling se necessario) |
| `refreshTelemetry(pemId)` | Forza refresh immediato |
| `triggerSync()` | Trigger sync manuale |
| `clearTelemetry()` | Pulisce i dati correnti |
| `destroy()` | Cleanup risorse |

## Utilizzo con SDKManager (Raccomandato)

SDKManager gestisce automaticamente TelemetryService:

```typescript
import { SDKManager } from '@a-cube-io/ereceipts-js-sdk';

// Configura con intervallo personalizzato
SDKManager.configure({
  environment: 'sandbox',
  telemetryPollIntervalMs: 60000,  // default: 60 secondi
});

const manager = SDKManager.getInstance();
await manager.initialize();

// Il polling parte automaticamente se un certificato è installato

// Observable dello stato telemetria
manager.telemetryState$.subscribe(state => {
  if (state.data) {
    console.log('PEM Status:', state.data.pemStatus);
  }
});

// Operazioni telemetria via getServices()
const services = manager.getServices();

// Avvia polling manualmente (se non auto-avviato)
await services.telemetry.startPollingAuto();

// Oppure con pemId specifico
services.telemetry.startPolling('pem-uuid');

// Ottieni stato corrente
const state = await services.telemetry.getTelemetry('pem-uuid');

// Refresh forzato
const fresh = await services.telemetry.refreshTelemetry('pem-uuid');

// Sync manuale
const synced = await services.telemetry.triggerSync();

// Pulisci dati
services.telemetry.clearTelemetry();

// Stop polling
services.telemetry.stopPolling();

// Ottieni pemId dal certificato installato
const pemId = await services.telemetry.getPemId();
```

### TelemetryOperations (via getServices())

```typescript
interface TelemetryOperations {
  startPollingAuto: () => Promise<string | null>;  // auto-detect pemId
  startPolling: (pemId: string) => void;
  stopPolling: () => void;
  getTelemetry: (pemId: string) => Promise<TelemetryState>;
  refreshTelemetry: (pemId: string) => Promise<TelemetryState>;
  triggerSync: () => Promise<TelemetryState>;
  clearTelemetry: () => void;
  getPemId: () => Promise<string | null>;
}
```

## Auto-Polling

Quando usi `SDKManager`, il polling telemetria parte automaticamente durante `initialize()` se:

1. Un certificato mTLS è installato
2. Il certificato contiene un `pemId` valido

```typescript
// Il polling parte automaticamente
await manager.initialize();

// Verifica se il polling è attivo
const pemId = await manager.getPemId();
if (pemId) {
  console.log('Telemetry polling attivo per:', pemId);
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

- Endpoint: `GET /mf1/pems/{pemId}/telemetry`
- Autenticazione: mTLS (porta 444)
- I dati sono uno snapshot in tempo reale
- Molti campi sono nullable e richiedono controlli appropriati
- Il polling si ferma automaticamente quando offline e riprende alla riconnessione

## Prossimi Passi

- [SDKManager API](./sdk-manager.md)
- [Notifications API](./notifications.md)
- [PEM API](./pems.md)
