# Offline Mode

Gestione operazioni offline con sincronizzazione automatica.

## Panoramica

L'SDK supporta operazioni offline tramite una coda persistente. Quando la connessione non e disponibile, le operazioni vengono salvate localmente e sincronizzate automaticamente al ripristino della connettivita.

## Accesso

```typescript
const offlineManager = sdk.getOfflineManager();
```

## Metodi Principali

### queueOperation(type, resource, endpoint, method, data, priority)

Accoda un'operazione generica.

```typescript
const operationId = await offlineManager.queueOperation(
  'CREATE',
  'receipt',
  '/mf1/receipts',
  'POST',
  receiptData,
  2
);
```

**Parametri:**
- `type` - Tipo operazione: `'CREATE'` | `'UPDATE'` | `'DELETE'`
- `resource` - Tipo risorsa: `'receipt'` | `'cashier'` | `'merchant'` | `'pem'` | etc.
- `endpoint` - Endpoint API
- `method` - Metodo HTTP: `'GET'` | `'POST'` | `'PUT'` | `'PATCH'` | `'DELETE'`
- `data` - Dati dell'operazione
- `priority` - Priorita (1 = bassa, 3 = alta)

**Ritorna:** `Promise<string>` - ID operazione

### queueReceiptCreation(receiptData, priority)

Accoda creazione scontrino.

```typescript
const operationId = await offlineManager.queueReceiptCreation({
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '10.00',
      vatRateCode: '22',
    },
  ],
}, 2);
```

### queueReceiptVoid(voidData, priority)

Accoda annullamento scontrino.

```typescript
const operationId = await offlineManager.queueReceiptVoid({
  documentNumber: '0001-0001-0001',
}, 3);
```

### queueReceiptReturn(returnData, priority)

Accoda reso scontrino.

```typescript
const operationId = await offlineManager.queueReceiptReturn({
  documentNumber: '0001-0001-0001',
  items: [{ id: 1, quantity: '1' }],
}, 3);
```

### sync()

Forza sincronizzazione manuale.

```typescript
const result = await offlineManager.sync();

if (result) {
  console.log('Sincronizzate:', result.successCount);
  console.log('Fallite:', result.failureCount);
}
```

**Ritorna:** `Promise<BatchSyncResult | null>`

### isOnline()

Verifica stato connessione.

```typescript
const online = offlineManager.isOnline();
```

### getStatus()

Ottiene stato completo della coda.

```typescript
const status = offlineManager.getStatus();

console.log('Online:', status.isOnline);
console.log('In elaborazione:', status.isProcessing);
console.log('Pending:', status.queueStats.pending);
```

### getPendingCount()

Numero operazioni in attesa.

```typescript
const pending = offlineManager.getPendingCount();
```

### isEmpty()

Verifica se la coda e vuota.

```typescript
const empty = offlineManager.isEmpty();
```

### getQueueStats()

Statistiche dettagliate della coda.

```typescript
const stats = offlineManager.getQueueStats();

console.log('Totale:', stats.total);
console.log('Pending:', stats.pending);
console.log('Completate:', stats.completed);
console.log('Fallite:', stats.failed);
```

### retryFailed()

Riprova operazioni fallite.

```typescript
await offlineManager.retryFailed();
```

### clearCompleted()

Rimuove operazioni completate.

```typescript
await offlineManager.clearCompleted();
```

### clearFailed()

Rimuove operazioni fallite.

```typescript
await offlineManager.clearFailed();
```

### clearAll()

Svuota l'intera coda.

```typescript
await offlineManager.clearAll();
```

### startAutoSync() / stopAutoSync()

Avvia o ferma sincronizzazione automatica.

```typescript
offlineManager.startAutoSync();
// ...
offlineManager.stopAutoSync();
```

## Tipi

### QueuedOperation

```typescript
interface QueuedOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'receipt' | 'cashier' | 'merchant' | 'pem' | etc.;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data?: unknown;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
  priority: number;
}
```

### BatchSyncResult

```typescript
interface BatchSyncResult {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  results: SyncResult[];
}
```

### SyncResult

```typescript
interface SyncResult {
  operation: QueuedOperation;
  success: boolean;
  error?: string;
  response?: unknown;
}
```

### QueueStats

```typescript
interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
```

### SyncStatus

```typescript
interface SyncStatus {
  isOnline: boolean;
  isProcessing: boolean;
  queueStats: QueueStats;
}
```

## Configurazione

La coda usa questi valori di default:

```typescript
const DEFAULT_QUEUE_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,        // 1 secondo
  maxRetryDelay: 30000,    // 30 secondi
  backoffMultiplier: 2,
  maxQueueSize: 1000,
  batchSize: 10,
  syncInterval: 30000,     // 30 secondi
};
```

## Esempi

### Gestione Scontrino Offline

```typescript
// Verifica connessione
if (!sdk.isOnline()) {
  // Accoda operazione per sincronizzazione successiva
  const operationId = await offlineManager.queueReceiptCreation({
    items: [
      {
        description: 'Vendita offline',
        quantity: '1',
        unitPrice: '25.00',
        vatRateCode: '22',
      },
    ],
  });

  console.log('Operazione in coda:', operationId);
} else {
  // Esegui normalmente
  const receipt = await sdk.receipts.create({
    items: [...],
  });
}
```

### Monitoraggio Coda

```typescript
// Verifica stato periodicamente
setInterval(() => {
  const stats = offlineManager.getQueueStats();

  if (stats.pending > 0) {
    console.log(`${stats.pending} operazioni in attesa`);
  }

  if (stats.failed > 0) {
    console.log(`${stats.failed} operazioni fallite`);
  }
}, 60000);
```

### Pulizia Periodica

```typescript
// Pulisci operazioni completate ogni ora
setInterval(async () => {
  await offlineManager.clearCompleted();
}, 3600000);
```

## Prossimi Passi

- [Eventi SDK](./events.md)
- [Gestione Errori](./error-handling.md)
