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
- **Auto-polling basato su ruolo** - notifiche e telemetria attivi solo per MERCHANT/CASHIER
- **Network state per tutti** - rilevamento OFFLINE attivo per tutti gli utenti (incluso SUPPLIER)
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
// Per MERCHANT/CASHIER:
//   - Notifiche polling: parte automaticamente
//   - Telemetria polling: parte automaticamente se certificato installato
// Per SUPPLIER:
//   - Polling disabilitato (evita errori 401)
//   - Network state (OFFLINE) sempre attivo
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

Inizializza SDK e tutti i servizi. Il polling viene avviato in base al ruolo utente:

- **MERCHANT/CASHIER**: Polling notifiche (ogni 30s) e telemetria (ogni 60s, se certificato)
- **SUPPLIER**: Nessun polling (evita errori 401)
- **Tutti**: AppStateService attivo per rilevamento OFFLINE

```typescript
await manager.initialize();
// Polling attivo solo per MERCHANT/CASHIER
// Network state attivo per tutti
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

All'inizializzazione, SDKManager verifica il ruolo dell'utente per determinare se attivare il polling:

### Ruoli e Polling

| Ruolo | Notifiche | Telemetria | Network State |
|-------|-----------|------------|---------------|
| **MERCHANT** | Attivo | Attivo (se certificato) | Attivo |
| **CASHIER** | Attivo | Attivo (se certificato) | Attivo |
| **SUPPLIER** | Non attivo | Non attivo | Attivo |
| **Non autenticato** | Non attivo | Non attivo | Attivo |

> **Nota**: Gli utenti SUPPLIER non hanno accesso agli endpoint di notifiche e telemetria. Il polling viene disabilitato automaticamente per evitare errori 401.

### Logica di Inizializzazione

```typescript
await manager.initialize();

// L'SDK verifica automaticamente:
// 1. L'utente e' autenticato?
// 2. L'utente ha ruolo MERCHANT o CASHIER?
// 3. Se si, avvia polling notifiche e telemetria
// 4. Se no (SUPPLIER o non autenticato), skip polling
// 5. AppStateService (network OFFLINE) resta attivo per TUTTI gli utenti
```

### Comportamento per Ruolo

**MERCHANT / CASHIER:**
```typescript
await manager.initialize();
// Notifiche: polling attivo
// Telemetria: polling attivo se certificato presente
// Network state: attivo (OFFLINE detection)
```

**SUPPLIER:**
```typescript
await manager.initialize();
// Notifiche: NON attivo (nessuna chiamata API)
// Telemetria: NON attivo (nessuna chiamata API)
// Network state: attivo (OFFLINE detection funziona)
```

### Verifica Stato Polling

```typescript
const pemId = await manager.getPemId();
const user = await manager.getServices().getCurrentUser();

console.log('User role:', user?.roles);
console.log('Telemetry polling:', pemId ? 'attivo' : 'non attivo');

// Avvia manualmente se necessario (solo MERCHANT/CASHIER)
if (!pemId && user) {
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
