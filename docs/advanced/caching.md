# Caching System

Il sistema di caching dell'SDK fornisce caching automatico per le operazioni GET con TTL configurabile per risorsa e invalidazione automatica sulle mutazioni.

## Architettura

```
Repository Layer (invariato)
         │
         ▼
┌─────────────────────────────────┐
│   CachingHttpDecorator          │  ← Wrappa IHttpPort
│   - Cache key generation        │  ← Resource-aware
│   - TTL per risorsa             │  ← Configurabile
│   - Invalidazione automatica    │  ← Su POST/PUT/DELETE
└─────────────────────────────────┘
         │
         ▼
    AxiosHttpAdapter (invariato)
```

## Configurazione

Il caching è abilitato automaticamente se un `ICachePort` è registrato nel container DI.

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox',
  // Cache attiva automaticamente su piattaforme supportate
});
```

### Piattaforme Supportate

| Piattaforma | Storage | Note |
|-------------|---------|------|
| React Native | SQLite + Memory | Persistente + veloce |
| Web | IndexedDB | Persistente |
| Node.js | Memory only | Solo sessione |

## Comportamento Cache

### GET Requests

```
1. Check cache → Se HIT e dentro TTL → Ritorna cache
2. Se MISS o TTL scaduto → Fetch da network
3. Salva risposta in cache
4. Se offline → Ritorna cache stale
5. Se errore network → Ritorna cache stale (se disponibile)
```

### Mutazioni (POST/PUT/PATCH/DELETE)

```
1. Esegui operazione su network
2. Invalida cache patterns correlati
3. Ritorna risposta
```

## TTL per Risorsa

Ogni risorsa ha un TTL configurato:

| Risorsa | TTL | Note |
|---------|-----|------|
| `merchant` | 30 min | Dati stabili |
| `point-of-sale` | 30 min | Dati stabili |
| `cash-register` | 30 min | Dati stabili |
| `pem` | 30 min | Dati stabili |
| `cashier` | 10 min | Cambia moderatamente |
| `supplier` | 10 min | Cambia moderatamente |
| `receipt` | 5 min | Può cambiare |
| `daily-report` | 5 min | Può cambiare |
| `journal` | 5 min | Può cambiare |
| `telemetry` | 1 min | Real-time |
| `notification` | No cache | Sempre fresh |

### Solo GET Item

**Importante**: Solo le richieste per singoli item vengono cachate:

```typescript
// ✅ Cachato (GET item)
await sdk.receipts.findById('uuid-123');
await sdk.merchants.findById('merchant-uuid');

// ❌ NON cachato (GET list) - sempre fresh
await sdk.receipts.list();
await sdk.merchants.list();
```

## Cache Key Structure

Le cache key seguono un pattern strutturato:

| URL | Cache Key |
|-----|-----------|
| `/mf1/receipts/{uuid}` | `receipt:{uuid}` |
| `/mf1/receipts/{uuid}/details` | `receipt:{uuid}:details` |
| `/mf2/merchants/{uuid}` | `merchant:{uuid}` |
| `/mf1/cashiers/me` | `cashier:me` |
| `/mf2/merchants/{mid}/suppliers/{sid}` | `supplier:{mid}:{sid}` |

## Invalidazione Automatica

Quando esegui una mutazione, i pattern correlati vengono invalidati:

| Operazione | URL | Pattern Invalidati |
|------------|-----|-------------------|
| POST | `/mf1/receipts` | `receipt:*` |
| PUT | `/mf1/receipts/{id}` | `receipt:{id}*`, `receipt:list:*` |
| DELETE | `/mf2/merchants/{id}` | `merchant:{id}`, `merchant:list:*` |
| PUT | `/mf1/cashiers/{id}` | `cashier:{id}`, `cashier:me` |

## Stale-While-Offline

Quando offline, la cache stale viene utilizzata:

```typescript
// Online: fetch fresh
const receipt = await sdk.receipts.findById('uuid');

// Vai offline...

// Offline: ritorna cache stale (se disponibile)
const cachedReceipt = await sdk.receipts.findById('uuid');
// Header: x-cache: STALE
```

## Stale-On-Error

Se il network fallisce, la cache stale viene utilizzata:

```typescript
try {
  const receipt = await sdk.receipts.findById('uuid');
  // Se network error ma cache disponibile → cache stale
  // Se network error e no cache → throws error
} catch (error) {
  // Solo se no cache disponibile
}
```

## Headers di Risposta

Le risposte includono headers per identificare la source:

| Header | Valore | Significato |
|--------|--------|-------------|
| `x-cache` | `HIT` | Cache valida (dentro TTL) |
| `x-cache` | `MISS` | Fetch da network |
| `x-cache` | `STALE` | Cache scaduta usata (offline/error) |

## Disabilitare Cache

Per disabilitare il caching globalmente:

```typescript
// Non registrare ICachePort nel container
// oppure passa enabled: false nella config
```

## API CacheKeyGenerator

Per casi avanzati, puoi usare `CacheKeyGenerator`:

```typescript
import { CacheKeyGenerator } from '@a-cube-io/ereceipts-js-sdk';

const keyGen = new CacheKeyGenerator();

// Genera cache key
const key = keyGen.generate('/mf1/receipts/uuid-123');
// → "receipt:uuid-123"

// Identifica risorsa
const resource = keyGen.parseResource('/mf2/merchants/m-uuid');
// → "merchant"

// Ottieni TTL
const ttl = keyGen.getTTL('/mf1/receipts/uuid');
// → 300000 (5 min)

// Verifica se cachabile
const shouldCache = keyGen.shouldCache('/mf1/receipts/uuid');
// → true (GET item)

// Pattern invalidazione
const patterns = keyGen.getInvalidationPatterns('/mf1/receipts/uuid', 'PUT');
// → ["receipt:uuid*", "receipt:list:*"]
```

## Best Practices

### 1. Usa SDKManager

SDKManager gestisce automaticamente tutto:

```typescript
const manager = SDKManager.getInstance();
await manager.initialize();
// Cache attiva automaticamente
```

### 2. Force Refresh

Per dati critici, forza un refresh:

```typescript
// Telemetria: sempre fresh
const fresh = await services.telemetry.refreshTelemetry(pemId);

// O usa l'API diretta bypassando cache
const sdk = manager.getSDK();
// Le chiamate dirette non bypassano cache automaticamente
```

### 3. Clear Cache Manualmente

Per invalidare cache manualmente (raro):

```typescript
// Clear tutto
await cachePort.clear();

// Clear pattern specifico
await cachePort.invalidate('receipt:*');
```

## Logging

Il sistema logga operazioni cache in debug mode:

```
✅ [CACHE] HIT: receipt:uuid-123 (age: 45s, ttl: 300s)
❌ [CACHE] MISS: merchant:m-uuid (expired)
⚠️ [CACHE] STALE: receipt:uuid-123 (offline, using cached)
🗑️ [CACHE] INVALIDATE: receipt:* (POST /mf1/receipts)
```

## Troubleshooting

### Cache non funziona

1. Verifica che `ICachePort` sia registrato:
```typescript
const hasCache = container.has(DI_TOKENS.CACHE_PORT);
```

2. Verifica piattaforma supportata (IndexedDB o SQLite)

### Dati stale

1. Verifica TTL della risorsa
2. Controlla header `x-cache` nella risposta
3. Usa `refreshTelemetry()` per forzare fresh data

### Invalidazione non funziona

1. Verifica che la mutazione abbia successo
2. Controlla pattern di invalidazione nel log
3. Clear manualmente se necessario

## Prossimi Passi

- [Offline Mode](./offline-mode.md)
- [Error Handling](./error-handling.md)
- [SDKManager API](../api-reference/sdk-manager.md)
