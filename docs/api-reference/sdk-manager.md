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
- **Observable telemetry** - dati telemetria con cache offline
- **Servizi semplificati** - API pulita per uso in produzione

## Configurazione

### SDKManagerConfig

```typescript
interface SDKManagerConfig {
  environment: 'sandbox' | 'development' | 'production';
  debug?: boolean;

  // Configurazione notifiche
  notificationPollIntervalMs?: number;  // default: 30000
  notificationPageSize?: number;        // default: 30

  // Configurazione telemetria
  telemetryCacheTtlMs?: number;         // default: 300000 (5 min)
}
```

## Ciclo di Vita

### 1. Configurazione (una volta all'avvio)

```typescript
SDKManager.configure({
  environment: 'sandbox',
  notificationPollIntervalMs: 30000,
});
```

### 2. Inizializzazione

```typescript
const manager = SDKManager.getInstance();
await manager.initialize();
```

### 3. Utilizzo

```typescript
// Osserva lo stato dell'app
manager.appState$.subscribe(state => {
  console.log('Mode:', state.mode);
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

Stream dello stato telemetria.

```typescript
manager.telemetryState$.subscribe(state => {
  if (state.data) {
    console.log('PEM Status:', state.data.pemStatus);
  }
  console.log('Cached:', state.isCached);
});
```

**Tipo:** `Observable<TelemetryState>`

## Metodi

### initialize()

Inizializza SDK e tutti i servizi. Avvia il polling delle notifiche.

```typescript
await manager.initialize();
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

### getTelemetry()

Shortcut per ottenere dati telemetria.

```typescript
const telemetry = await manager.getTelemetry(pemId);
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

  // Telemetria semplificata
  telemetry: {
    getTelemetry: (pemId: string) => Promise<TelemetryState>;
    refreshTelemetry: (pemId: string) => Promise<TelemetryState>;
    clearCache: (pemId: string) => Promise<void>;
  };

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
    telemetryCacheTtlMs: 300000,
  },
  undefined,  // auto-detect adapters
  {
    onAppStateChanged: (state) => console.log('App mode:', state.mode),
    onNetworkStatusChanged: (online) => console.log('Network:', online),
  }
);

// 2. Inizializza
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
- [Esempio Completo](../examples/notifications-telemetry.md)
