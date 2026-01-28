# SDKManager API

Singleton wrapper per l'SDK ACube con API semplificata per applicazioni in produzione.

## Import

```typescript
import { SDKManager, type SDKManagerConfig, type ManagedServices } from '@a-cube-io/ereceipts-js-sdk';
```

## Overview

`SDKManager` fornisce:
- **Singleton pattern** - un unico punto di inizializzazione
- **Observable app state** - stato dell'app (NORMAL, WARNING, BLOCKED, OFFLINE)
- **Observable telemetry** - dati telemetria con polling automatico
- **Auto-polling** - notifiche e telemetria partono automaticamente
- **Servizi semplificati** - API pulita per uso in produzione

## Configurazione

### SDKManagerConfig

```typescript
interface SDKManagerConfig {
  environment: 'sandbox' | 'development' | 'production';
  debug?: boolean;

  // Configurazione notifiche
  notificationPollIntervalMs?: number;  // default: 30000 (30 sec)
  notificationPageSize?: number;        // default: 30

  // Configurazione telemetria
  telemetryPollIntervalMs?: number;     // default: 60000 (60 sec)
}
```

## Ciclo di Vita

### 1. Configurazione (una volta all'avvio)

```typescript
SDKManager.configure({
  environment: 'sandbox',
  notificationPollIntervalMs: 30000,
  telemetryPollIntervalMs: 60000,
});
```

### 2. Inizializzazione

```typescript
const manager = SDKManager.getInstance();
await manager.initialize();
// Notifiche polling: parte automaticamente
// Telemetria polling: parte automaticamente se certificato installato
```

### 3. Utilizzo

```typescript
// Osserva lo stato dell'app
manager.appState$.subscribe(state => {
  console.log('Mode:', state.mode);
});

// Osserva la telemetria
manager.telemetryState$.subscribe(state => {
  if (state.data) {
    console.log('PEM:', state.data.pemStatus);
  }
});

// Usa i servizi
const services = manager.getServices();
const receipts = await services.receipts.list();
```

### 4. Cleanup

```typescript
SDKManager.destroy();
```

## Static Methods

### configure()

Configura il singleton. Deve essere chiamato prima di `getInstance()`.

```typescript
SDKManager.configure(
  config: SDKManagerConfig,
  adapters?: PlatformAdapters,  // opzionale, auto-detected
  events?: SDKManagerEvents     // opzionale
);
```

### getInstance()

Ritorna l'istanza singleton. Throws se non configurato.

```typescript
const manager = SDKManager.getInstance();
```

### isConfigured()

Verifica se il manager e' configurato.

```typescript
if (SDKManager.isConfigured()) {
  // ...
}
```

### destroy()

Distrugge il singleton e pulisce le risorse.

```typescript
SDKManager.destroy();
```

## Observables

### appState$

Stream dello stato completo dell'applicazione.

```typescript
manager.appState$.subscribe((state: AppState) => {
  console.log('Mode:', state.mode);
  console.log('Online:', state.isOnline);
  console.log('Warning:', state.warning.active);
});
```

**Tipo:** `Observable<AppState>`

### mode$

Stream del modo corrente (con `distinctUntilChanged`).

```typescript
manager.mode$.subscribe((mode: AppMode) => {
  switch (mode) {
    case 'NORMAL': showApp(); break;
    case 'WARNING': showWarning(); break;
    case 'BLOCKED': showBlocked(); break;
    case 'OFFLINE': showOffline(); break;
  }
});
```

**Tipo:** `Observable<AppMode>`

### isBlocked$

Stream booleano per stato bloccato.

```typescript
manager.isBlocked$.subscribe(blocked => {
  setDisabled(blocked);
});
```

**Tipo:** `Observable<boolean>`

### warning$

Stream stato warning con countdown.

```typescript
manager.warning$.subscribe(warning => {
  if (warning.active) {
    const secs = Math.floor(warning.remainingMs / 1000);
    console.log(`Blocco tra ${secs}s`);
  }
});
```

**Tipo:** `Observable<WarningState>`

### telemetryState$

Stream dello stato telemetria con polling automatico.

```typescript
manager.telemetryState$.subscribe(state => {
  if (state.isLoading) {
    console.log('Caricamento telemetria...');
  } else if (state.data) {
    console.log('PEM Status:', state.data.pemStatus);
    console.log('Ultimo fetch:', new Date(state.lastFetchedAt));
  }
  console.log('Cached:', state.isCached);
});
```

**Tipo:** `Observable<TelemetryState>`

## Metodi

### initialize()

Inizializza SDK e tutti i servizi. Avvia automaticamente:
- Polling notifiche (ogni 30s default)
- Polling telemetria (ogni 60s default, se certificato installato)

```typescript
await manager.initialize();
```

### getPemId()

Ottiene il pemId dal certificato installato.

```typescript
const pemId = await manager.getPemId();
if (pemId) {
  console.log('Certificato per PEM:', pemId);
}
```

### startTelemetryPollingAuto()

Avvia il polling telemetria usando il pemId dal certificato.

```typescript
const pemId = await manager.startTelemetryPollingAuto();
if (pemId) {
  console.log('Telemetry polling avviato per:', pemId);
}
```

### startTelemetryPolling(pemId)

Avvia il polling telemetria per un pemId specifico.

```typescript
manager.startTelemetryPolling('pem-uuid');
```

### stopTelemetryPolling()

Ferma il polling telemetria.

```typescript
manager.stopTelemetryPolling();
```

### getServices()

Ritorna i servizi semplificati per uso in produzione.

```typescript
const services: ManagedServices = manager.getServices();

// Repositories
await services.receipts.create({...});
await services.merchants.list();

// Telemetria
const state = await services.telemetry.getTelemetry(pemId);
await services.telemetry.refreshTelemetry(pemId);

// Auth
await services.login({ email, password });
await services.logout();
const user = await services.getCurrentUser();

// Certificati
await services.storeCertificate(cert, key);
const hasCert = await services.hasCertificate();

// Network
const online = services.isOnline();
```

### syncNotifications()

Forza sincronizzazione notifiche.

```typescript
await manager.syncNotifications();
```

### syncTelemetry()

Forza sincronizzazione telemetria.

```typescript
const state = await manager.syncTelemetry();
```

### getIsInitialized()

Verifica se il manager e' inizializzato.

```typescript
if (manager.getIsInitialized()) {
  // safe to use
}
```

### getSDK()

Ritorna l'istanza SDK sottostante (per casi avanzati).

```typescript
const sdk = manager.getSDK();
```

## ManagedServices

Interface semplificata per i servizi.

```typescript
interface ManagedServices {
  // Business repositories
  receipts: IReceiptRepository;
  merchants: IMerchantRepository;
  cashiers: ICashierRepository;
  cashRegisters: ICashRegisterRepository;
  pointOfSales: IPointOfSaleRepository;
  suppliers: ISupplierRepository;
  pems: IPemRepository;
  dailyReports: IDailyReportRepository;
  journals: IJournalRepository;

  // Telemetria
  telemetry: TelemetryOperations;

  // Auth
  login: (credentials: AuthCredentials) => Promise<User>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
  isAuthenticated: () => Promise<boolean>;

  // Certificati
  storeCertificate: (cert: string, key: string, options?: {...}) => Promise<void>;
  hasCertificate: () => Promise<boolean>;
  clearCertificate: () => Promise<void>;

  // Network
  isOnline: () => boolean;
}
```

### TelemetryOperations

```typescript
interface TelemetryOperations {
  startPollingAuto: () => Promise<string | null>;
  startPolling: (pemId: string) => void;
  stopPolling: () => void;
  getTelemetry: (pemId: string) => Promise<TelemetryState>;
  refreshTelemetry: (pemId: string) => Promise<TelemetryState>;
  triggerSync: () => Promise<TelemetryState>;
  clearTelemetry: () => void;
  getPemId: () => Promise<string | null>;
}
```

## Events

```typescript
interface SDKManagerEvents {
  // Eventi SDK base
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;

  // Eventi stato app
  onAppStateChanged?: (state: AppState) => void;
  onTelemetryStateChanged?: (state: TelemetryState) => void;
}
```

## Esempio Completo

```typescript
import { SDKManager, type AppState, type TelemetryState } from '@a-cube-io/ereceipts-js-sdk';

// 1. Configura all'avvio app
SDKManager.configure(
  {
    environment: 'production',
    notificationPollIntervalMs: 30000,
    telemetryPollIntervalMs: 60000,
  },
  undefined,  // auto-detect adapters
  {
    onAppStateChanged: (state) => console.log('App mode:', state.mode),
    onTelemetryStateChanged: (state) => console.log('Telemetry:', state.data?.pemStatus),
    onNetworkStatusChanged: (online) => console.log('Network:', online),
  }
);

// 2. Inizializza (polling parte automaticamente)
const manager = SDKManager.getInstance();
await manager.initialize();

// 3. Subscribe agli observables
const appSub = manager.appState$.subscribe(handleAppState);
const teleSub = manager.telemetryState$.subscribe(handleTelemetry);

// 4. Usa i servizi
const services = manager.getServices();
await services.login({ email: 'user@example.com', password: 'pwd' });
const receipts = await services.receipts.list();

// 5. Cleanup alla chiusura
appSub.unsubscribe();
teleSub.unsubscribe();
SDKManager.destroy();
```

## Auto-Polling Behavior

All'inizializzazione, SDKManager:

1. **Notifiche**: Polling parte sempre automaticamente
2. **Telemetria**: Polling parte automaticamente SE:
   - Un certificato mTLS è installato
   - Il certificato contiene un `pemId` valido

```typescript
await manager.initialize();
// Notifiche: polling attivo
// Telemetria: polling attivo se certificato presente

// Verifica stato
const pemId = await manager.getPemId();
console.log('Telemetry polling:', pemId ? 'attivo' : 'non attivo');

// Avvia manualmente se necessario
if (!pemId) {
  // Installa certificato prima
  await services.storeCertificate(cert, key);
  // Poi avvia polling
  await manager.startTelemetryPollingAuto();
}
```

## Utilizzo con React

Vedi [Esempio React](../examples/notifications-telemetry.md) per un'implementazione completa con:
- `ACubeProvider` context
- `useAppState` hook
- `useTelemetry` hook
- Componenti per WARNING, BLOCKED, OFFLINE

## Prossimi Passi

- [App State API](./app-state.md)
- [Notifications API](./notifications.md)
- [Telemetry API](./telemetry.md)
- [Caching](../advanced/caching.md)
- [Esempio Completo](../examples/notifications-telemetry.md)
