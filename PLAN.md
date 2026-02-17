# Plan: Rimuovere Offline Queue System dall'SDK

## Contesto

L'Offline Queue System (OfflineManager, OperationQueue, SyncManager) e' completamente implementato (~757 righe) ma MAI integrato nel flusso di richieste. Nessun repository lo usa, nessun interceptor HTTP accoda operazioni. E' solo istanziato e esposto al consumer. Va rimosso per ridurre complessita' e bundle size.

## Changes Overview

### Files to DELETE (6 file, ~757 righe di codice)
- `src/infrastructure/driven/offline/offline-manager.ts`
- `src/infrastructure/driven/offline/queue.ts`
- `src/infrastructure/driven/offline/sync-manager.ts`
- `src/infrastructure/driven/offline/index.ts`
- `src/domain/entities/offline.entity.ts`
- `docs/advanced/offline-mode.md`

### Files to MODIFY — Source (5 file)
- `src/domain/entities/index.ts` — rimuovere re-export offline.entity
- `src/infrastructure/driving/sdk/acube-sdk.ts` — rimuovere OfflineManager init, eventi, getter, destroy
- `src/infrastructure/driving/sdk/di-container.ts` — rimuovere OFFLINE_SERVICE token
- `src/index.ts` — rimuovere export offline
- `src/application/ports/driven/platform-adapters.port.ts` — valutare se rimuovere `storage: IStoragePort`

### Files to MODIFY — Documentation (10 file)
- `CLAUDE.md`
- `DEVELOPER-HANDOFF.md`
- `README.md`
- `docs/advanced/events.md`
- `docs/advanced/types.md`
- `docs/api-reference/sdk-instance.md`
- `docs/examples/receipts-flow.md`
- `docs/examples/complete-app.md`
- `docs/getting-started/configuration.md`
- `docs/troubleshooting/common-issues.md`

### DO NOT TOUCH (usano "offline" come stato, non come queue)
- `src/application/services/app-state.service.ts` — AppMode 'OFFLINE' (stato rete)
- `src/domain/entities/notification.entity.ts` — STATUS_OFFLINE
- `src/domain/entities/point-of-sale.entity.ts` — PEMStatus 'OFFLINE'
- `src/shared/validation/api/point-of-sales.ts` — PEMStatusOfflineRequest

---

## Steps

### Step 1 — Delete offline core files
**Files:** `src/infrastructure/driven/offline/` (intera directory)
**Action:** Eliminare i 4 file: `offline-manager.ts`, `queue.ts`, `sync-manager.ts`, `index.ts`
**Verification:** Directory non esiste piu'

### Step 2 — Delete offline entity
**File:** `src/domain/entities/offline.entity.ts`
**Action:** Eliminare il file
**Verification:** File non esiste piu'

### Step 3 — Update domain entities barrel export
**File:** `src/domain/entities/index.ts`
**Action:** Rimuovere riga `export * from './offline.entity'`
**Verification:** `bun run typecheck` (ci saranno errori — li risolviamo negli step successivi)

### Step 4 — Update main SDK class (acube-sdk.ts) — la modifica piu' critica
**File:** `src/infrastructure/driving/sdk/acube-sdk.ts`
**Action:**
- Rimuovere import di `OfflineManager`, `QueueEvents`
- Rimuovere `onOfflineOperationAdded` e `onOfflineOperationCompleted` da `SDKEvents`
- Rimuovere property `private offlineManager?: OfflineManager`
- Rimuovere blocco inizializzazione OfflineManager (righe ~155-176)
- Semplificare network subscription (mantenere solo `onNetworkStatusChanged`, rimuovere auto-sync)
- Rimuovere metodo `getOfflineManager()`
- Rimuovere `this.offlineManager?.destroy()` dal `destroy()`
**Verification:** File compila senza errori di import

### Step 5 — Remove OFFLINE_SERVICE DI token
**File:** `src/infrastructure/driving/sdk/di-container.ts`
**Action:** Rimuovere `OFFLINE_SERVICE: Symbol('OFFLINE_SERVICE')`
**Verification:** Nessun riferimento a `OFFLINE_SERVICE` nel codebase

### Step 6 — Update public exports
**File:** `src/index.ts`
**Action:** Rimuovere `export * from './infrastructure/driven/offline'`
**Verification:** `bun run typecheck` passa

### Step 7 — Full build verification
**Action:** `bun run build && bun run typecheck && bun run test`
**Verification:** Tutto passa. Questa e' la verifica critica — se fallisce, fix prima di continuare.

### Step 8 — Update CLAUDE.md
**File:** `CLAUDE.md`
**Action:** Rimuovere riferimenti a "offline-first support", offline queue, OfflineManager dalla descrizione progetto e dalla tabella architettura
**Verification:** Nessun riferimento a offline queue in CLAUDE.md

### Step 9 — Update DEVELOPER-HANDOFF.md
**File:** `DEVELOPER-HANDOFF.md`
**Action:**
- Rimuovere sezione 9 "Offline Queue System" (righe ~1025-1117)
- Rimuovere voce dall'indice
- Rimuovere `offline/` dalla struttura cartelle
- Rimuovere riferimenti a OfflineManager nella sezione init SDK
- Rinumerare le sezioni (10→9, 11→10)
**Verification:** Nessun riferimento a OfflineManager in DEVELOPER-HANDOFF.md

### Step 10 — Update README.md
**File:** `README.md`
**Action:** Rimuovere feature "Supporto offline" e link a offline-mode.md
**Verification:** Nessun riferimento a offline queue in README

### Step 11 — Delete offline docs
**File:** `docs/advanced/offline-mode.md`
**Action:** Eliminare il file
**Verification:** File non esiste piu'

### Step 12 — Update remaining docs
**Files:**
- `docs/advanced/events.md` — rimuovere sezioni `onOfflineOperationAdded/Completed`
- `docs/advanced/types.md` — rimuovere sezione "Offline" con tutti i tipi
- `docs/api-reference/sdk-instance.md` — rimuovere `getOfflineManager()` e eventi offline
- `docs/examples/receipts-flow.md` — rimuovere sezione "Gestione Offline"
- `docs/examples/complete-app.md` — rimuovere handler offline, UI banner, queue usage
- `docs/getting-started/configuration.md` — rimuovere esempi eventi offline
- `docs/troubleshooting/common-issues.md` — rimuovere sezione "Operazioni Offline"
**Verification:** `grep -ri "offlineManager\|OfflineManager\|offline-mode\|queueReceipt\|QueuedOperation" docs/` restituisce 0 risultati (escluso "offline" come stato)

### Step 13 — Final quality check
**Action:** `bun run quality` (format + lint:fix + typecheck)
**Verification:** Tutto passa, nessun errore

---

## Risks & Considerations

1. **Breaking change per i consumer** — Chi usa `sdk.getOfflineManager()` o i tipi `QueuedOperation`, `SyncResult`, etc. avra' errori. Questo e' un **major version bump** (semver).
2. **SDKEvents interface** — Rimuovere campi da un'interfaccia pubblica e' breaking.
3. **IStoragePort** — Dopo la rimozione, `IStoragePort` non ha piu' consumatori ma resta parte di `PlatformAdapters`. Lasciarla per eventuale uso futuro.
4. **rxjs** — Resta come dipendenza (usata da NetworkBase, CachingHttpDecorator, etc.).
5. **Network subscription** — La subscription `online$` in acube-sdk.ts serviva sia per `onNetworkStatusChanged` che per auto-sync. Mantenere solo la parte di notifica eventi.

## Verification Checklist
- [ ] TypeScript compiles (`bun run typecheck`)
- [ ] Tests pass (`bun run test`)
- [ ] Build succeeds (`bun run build`)
- [ ] Linter clean (`bun run lint`)
- [ ] No orphan references to OfflineManager/QueuedOperation in source
- [ ] No broken links in docs
- [ ] Architecture boundaries respected (nessun domain layer rotto)
