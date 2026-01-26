# Notifications API

Gestione delle notifiche di sistema per monitorare lo stato del sistema e degli endpoint PEM.

## Repository

```typescript
const notifications = sdk.notifications;
```

## Metodi

### fetchNotifications(params?)

Recupera la lista delle notifiche con paginazione.

```typescript
const notifications = await sdk.notifications.fetchNotifications({
  page: 1,
  size: 30,
});
```

**Parametri:**

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `page` | `number` | `1` | Numero pagina |
| `size` | `number` | `30` | Dimensione pagina |

**Ritorna:** `Promise<Page<Notification>>`

## Costanti

Le notifiche utilizzano costanti tipizzate per una migliore developer experience:

```typescript
import {
  NOTIFICATION_CODES,
  NOTIFICATION_TYPES,
  NOTIFICATION_LEVELS,
  NOTIFICATION_SOURCES,
  NOTIFICATION_SCOPES,
} from '@a-cube-io/ereceipts-js-sdk';
```

### NOTIFICATION_CODES

```typescript
const NOTIFICATION_CODES = {
  MF2_UNREACHABLE: 'SYS-W-01',
  STATUS_OFFLINE: 'SYS-C-01',
  STATUS_ONLINE: 'SYS-I-01',
  COMMUNICATION_RESTORED: 'SYS-I-02',
} as const;
```

### NOTIFICATION_TYPES

```typescript
const NOTIFICATION_TYPES = {
  MF2_UNREACHABLE: 'INTERNAL_COMMUNICATION_FAILURE',
  STATUS_OFFLINE: 'STATUS_OFFLINE',
  STATUS_ONLINE: 'STATUS_ONLINE',
  COMMUNICATION_RESTORED: 'INTERNAL_COMMUNICATION_RESTORED',
} as const;
```

### NOTIFICATION_LEVELS

```typescript
const NOTIFICATION_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
} as const;
```

### NOTIFICATION_SOURCES

```typescript
const NOTIFICATION_SOURCES = {
  SYSTEM: 'system',
  ITALIAN_TAX_AUTHORITY: 'Italian Tax Authority',
} as const;
```

### NOTIFICATION_SCOPES

```typescript
const NOTIFICATION_SCOPES = {
  GLOBAL: 'global',
  MERCHANT: 'merchant',
  PEM: 'pem',
} as const;
```

## Tipi di Notifica

Le notifiche sono tipizzate in base al campo `code` usando una discriminated union:

### NotificationMf2Unreachable

Notifica quando MF2 non e' raggiungibile. Include un countdown per il blocco.

```typescript
interface NotificationMf2Unreachable {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
  type: 'INTERNAL_COMMUNICATION_FAILURE';
  code: 'SYS-W-01';
  payload: {
    block_at: string;
  };
}
```

### NotificationStatusOffline

Notifica quando lo stato passa a OFFLINE.

```typescript
interface NotificationStatusOffline {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
  type: 'STATUS_OFFLINE';
  code: 'SYS-C-01';
  payload: null;
}
```

### NotificationStatusOnline

Notifica quando lo stato torna ONLINE.

```typescript
interface NotificationStatusOnline {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
  type: 'STATUS_ONLINE';
  code: 'SYS-I-01';
  payload: null;
}
```

### NotificationCommunicationRestored

Notifica quando la comunicazione con MF2 viene ripristinata.

```typescript
interface NotificationCommunicationRestored {
  uuid: string;
  message: string;
  scope: NotificationScope;
  source: NotificationSource;
  level: NotificationLevel;
  createdAt: string;
  type: 'INTERNAL_COMMUNICATION_RESTORED';
  code: 'SYS-I-02';
  payload: null;
}
```

## Codici Notifica

| Codice | Tipo | Descrizione |
|--------|------|-------------|
| `SYS-W-01` | `INTERNAL_COMMUNICATION_FAILURE` | MF2 non raggiungibile, countdown al blocco |
| `SYS-C-01` | `STATUS_OFFLINE` | Stato passato a OFFLINE |
| `SYS-I-01` | `STATUS_ONLINE` | Stato tornato ONLINE |
| `SYS-I-02` | `INTERNAL_COMMUNICATION_RESTORED` | Comunicazione MF2 ripristinata |

## NotificationService

Per un'esperienza reattiva con polling automatico, usa `NotificationService`:

```typescript
import { NotificationService } from '@a-cube-io/ereceipts-js-sdk';

const notificationService = new NotificationService(
  sdk.notifications,
  networkPort,
  {
    pollIntervalMs: 30000,
    defaultPageSize: 30,
  },
  {
    onNewNotifications: (notifications) => {
      console.log('Nuove notifiche:', notifications);
    },
    onSyncError: (error) => {
      console.error('Errore sync:', error);
    },
  }
);

// Avvia polling automatico
notificationService.startPolling();

// Observable per notifiche (RxJS)
notificationService.notifications$.subscribe((notifications) => {
  console.log('Tutte le notifiche:', notifications);
});

// Observable per stato sync
notificationService.syncState$.subscribe((state) => {
  console.log('Stato sync:', state.status);
});

// Sync manuale
await notificationService.triggerSync();

// Ferma polling
notificationService.stopPolling();

// Cleanup
notificationService.destroy();
```

### NotificationServiceConfig

```typescript
interface NotificationServiceConfig {
  pollIntervalMs: number;   // Intervallo polling in ms (default: 30000)
  defaultPageSize: number;  // Dimensione pagina default (default: 30)
}
```

### NotificationSyncState

```typescript
interface NotificationSyncState {
  status: 'idle' | 'syncing' | 'error';
  lastSyncAt: number | null;
  error?: string;
}
```

## Esempio Utilizzo

```typescript
import { NOTIFICATION_CODES } from '@a-cube-io/ereceipts-js-sdk';

// Fetch semplice
const page = await sdk.notifications.fetchNotifications();

// Gestione per tipo
page.members.forEach((notification) => {
  switch (notification.code) {
    case NOTIFICATION_CODES.MF2_UNREACHABLE:
      console.log('MF2 bloccato da:', notification.payload.block_at);
      break;
    case NOTIFICATION_CODES.STATUS_OFFLINE:
      console.log('Stato offline');
      break;
    case NOTIFICATION_CODES.STATUS_ONLINE:
      console.log('Stato online');
      break;
    case NOTIFICATION_CODES.COMMUNICATION_RESTORED:
      console.log('Comunicazione ripristinata');
      break;
  }
});
```

## Note Tecniche

- Endpoint: `GET /mf1/notifications`
- Autenticazione: mTLS (porta 444)
- Le notifiche sono solo in lettura (no acknowledge)
- Il campo `payload` è opzionale in API (omesso quando `null`)

## Prossimi Passi

- [Telemetry API](./telemetry.md)
- [App State](./app-state.md)
- [SDK Instance](./sdk-instance.md)
