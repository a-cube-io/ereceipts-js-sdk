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

**Ritorna:** `Promise<Notification[]>`

## Tipi di Notifica

Le notifiche sono tipizzate in base al campo `code` usando una discriminated union:

### NotificationMf2Unreachable

Notifica quando MF2 non e' raggiungibile.

```typescript
interface NotificationMf2Unreachable {
  uuid: string;
  scope: { type: 'global' };
  source: 'system' | 'Italian Tax Authority';
  level: 'info' | 'warning' | 'error' | 'critical';
  createdAt: string;
  type: 'INTERNAL_COMMUNICATION_FAILURE';
  code: 'SYS-W-01';
  data: {
    block_at: string;
  };
}
```

### NotificationPemsBlocked

Notifica quando i PEM sono bloccati (passaggio a OFFLINE).

```typescript
interface NotificationPemsBlocked {
  uuid: string;
  scope: { type: 'global' };
  source: 'system' | 'Italian Tax Authority';
  level: 'info' | 'warning' | 'error' | 'critical';
  createdAt: string;
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-C-01';
  data: {
    from: 'ONLINE' | 'OFFLINE';
    to: 'ONLINE' | 'OFFLINE';
  };
}
```

### NotificationPemBackOnline

Notifica quando un PEM torna online.

```typescript
interface NotificationPemBackOnline {
  uuid: string;
  scope: { type: 'global' };
  source: 'system' | 'Italian Tax Authority';
  level: 'info' | 'warning' | 'error' | 'critical';
  createdAt: string;
  type: 'PEM_STATUS_CHANGED';
  code: 'SYS-I-01';
  data: {
    from: 'ONLINE' | 'OFFLINE';
    to: 'ONLINE' | 'OFFLINE';
  };
}
```

## Codici Notifica

| Codice | Tipo | Descrizione |
|--------|------|-------------|
| `SYS-W-01` | `INTERNAL_COMMUNICATION_FAILURE` | MF2 non raggiungibile |
| `SYS-C-01` | `PEM_STATUS_CHANGED` | PEM passato a OFFLINE |
| `SYS-I-01` | `PEM_STATUS_CHANGED` | PEM tornato ONLINE |

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
// Fetch semplice
const notifications = await sdk.notifications.fetchNotifications();

// Gestione per tipo
notifications.forEach((notification) => {
  switch (notification.code) {
    case 'SYS-W-01':
      console.log('MF2 bloccato da:', notification.data.block_at);
      break;
    case 'SYS-C-01':
      console.log('PEM offline:', notification.data.from, '->', notification.data.to);
      break;
    case 'SYS-I-01':
      console.log('PEM online:', notification.data.from, '->', notification.data.to);
      break;
  }
});
```

## Note Tecniche

- Endpoint: `GET /mf1/notifications`
- Autenticazione: mTLS (porta 444)
- Le notifiche sono solo in lettura (no acknowledge)

## Prossimi Passi

- [Telemetry API](./telemetry.md)
- [SDK Instance](./sdk-instance.md)
