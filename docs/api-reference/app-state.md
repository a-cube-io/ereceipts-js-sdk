# AppStateService API

Servizio per la gestione dello stato dell'applicazione basato sulle notifiche di sistema.

## Import

```typescript
import { AppStateService } from '@a-cube-io/ereceipts-js-sdk';
```

## Costruttore

```typescript
const appStateService = new AppStateService(
  notifications$: Observable<Notification[]>,
  networkPort: INetworkPort
);
```

**Parametri:**

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `notifications$` | `Observable<Notification[]>` | Stream di notifiche da `NotificationService` |
| `networkPort` | `INetworkPort` | Porta per monitoraggio stato rete |

## Tipi

### AppMode

```typescript
type AppMode = 'NORMAL' | 'WARNING' | 'BLOCKED' | 'OFFLINE';
```

| Modo | Trigger | Descrizione |
|------|---------|-------------|
| `NORMAL` | Default o SYS-I-01 | App funziona normalmente |
| `WARNING` | SYS-W-01 | Banner avviso con countdown |
| `BLOCKED` | SYS-C-01 | Solo visualizzazione telemetria |
| `OFFLINE` | No network | Dati dalla cache |

### WarningState

```typescript
interface WarningState {
  active: boolean;
  blockAt: Date | null;
  remainingMs: number;
}
```

| Proprieta' | Tipo | Descrizione |
|------------|------|-------------|
| `active` | `boolean` | Warning attivo |
| `blockAt` | `Date \| null` | Data/ora blocco |
| `remainingMs` | `number` | Millisecondi rimanenti (aggiornato ogni secondo) |

### AppState

```typescript
interface AppState {
  mode: AppMode;
  isOnline: boolean;
  warning: WarningState;
  lastNotification: Notification | null;
}
```

## Observables

### state$

Stream dello stato completo dell'applicazione.

```typescript
appStateService.state$.subscribe((state: AppState) => {
  console.log('Mode:', state.mode);
  console.log('Online:', state.isOnline);
  console.log('Warning active:', state.warning.active);
});
```

**Tipo:** `Observable<AppState>`

### mode$

Stream del modo corrente (con `distinctUntilChanged`).

```typescript
appStateService.mode$.subscribe((mode: AppMode) => {
  switch (mode) {
    case 'NORMAL':
      showFullApp();
      break;
    case 'WARNING':
      showWarningBanner();
      break;
    case 'BLOCKED':
      showTelemetryOnly();
      break;
    case 'OFFLINE':
      showCachedData();
      break;
  }
});
```

**Tipo:** `Observable<AppMode>`

### isBlocked$

Stream booleano per stato bloccato.

```typescript
appStateService.isBlocked$.subscribe((blocked: boolean) => {
  if (blocked) {
    disableAllFeatures();
  }
});
```

**Tipo:** `Observable<boolean>`

### warning$

Stream dello stato warning con countdown.

```typescript
appStateService.warning$.subscribe((warning: WarningState) => {
  if (warning.active) {
    const seconds = Math.floor(warning.remainingMs / 1000);
    console.log(`Blocco tra ${seconds} secondi`);
  }
});
```

**Tipo:** `Observable<WarningState>`

## Metodi

### destroy()

Pulisce le risorse e ferma il timer del countdown.

```typescript
appStateService.destroy();
```

## Logica di Priorita'

Il servizio determina lo stato in base a queste regole:

1. **OFFLINE**: Se `networkPort.online$` emette `false`
2. **BLOCKED**: Se SYS-C-01 e' piu' recente di SYS-I-01
3. **WARNING**: Se SYS-W-01 esiste e `block_at` e' nel futuro
4. **NORMAL**: Default o se SYS-I-01 e' piu' recente di SYS-C-01

```
┌─────────────────────────────────────────┐
│           Logica Priorita'               │
├─────────────────────────────────────────┤
│                                          │
│  !isOnline?                              │
│      └── YES ──▶ OFFLINE                 │
│                                          │
│  SYS-C-01 > SYS-I-01?                   │
│      └── YES ──▶ BLOCKED                 │
│                                          │
│  SYS-W-01 && block_at > now?            │
│      └── YES ──▶ WARNING + countdown     │
│                                          │
│  DEFAULT ──▶ NORMAL                      │
│                                          │
└─────────────────────────────────────────┘
```

## Esempio Completo

```typescript
import {
  NotificationService,
  AppStateService,
  type AppState,
} from '@a-cube-io/ereceipts-js-sdk';

// Setup
const notificationService = new NotificationService(
  sdk.notifications,
  networkPort,
  { pollIntervalMs: 30000, defaultPageSize: 30 }
);

const appStateService = new AppStateService(
  notificationService.notifications$,
  networkPort
);

// Subscribe
const subscription = appStateService.state$.subscribe((state: AppState) => {
  console.log('App mode:', state.mode);

  if (state.warning.active) {
    const mins = Math.floor(state.warning.remainingMs / 60000);
    const secs = Math.floor((state.warning.remainingMs % 60000) / 1000);
    console.log(`Blocco tra ${mins}m ${secs}s`);
  }
});

// Avvia polling
notificationService.startPolling();

// Cleanup
subscription.unsubscribe();
appStateService.destroy();
notificationService.destroy();
```

## Utilizzo con React

```typescript
// Hook personalizzato
function useAppMode() {
  const [mode, setMode] = useState<AppMode>('NORMAL');

  useEffect(() => {
    const sub = appStateService.mode$.subscribe(setMode);
    return () => sub.unsubscribe();
  }, []);

  return mode;
}

// Nel componente
function App() {
  const mode = useAppMode();

  if (mode === 'BLOCKED') return <BlockedScreen />;
  if (mode === 'OFFLINE') return <OfflineScreen />;

  return (
    <>
      {mode === 'WARNING' && <WarningBanner />}
      <MainApp />
    </>
  );
}
```

## Prossimi Passi

- [Notifications API](./notifications.md)
- [Telemetry API](./telemetry.md)
- [Esempio Completo](../examples/notifications-telemetry.md)
