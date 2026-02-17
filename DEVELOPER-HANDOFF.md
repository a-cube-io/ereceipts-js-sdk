# ACube E-Receipt SDK — Developer Handoff

> Documento di riferimento completo per chi deve lavorare su questo progetto.
> Versione corrente: `@a-cube-io/ereceipts-js-sdk` v2.0.9

---

## Indice

1. [Overview e Setup](#1-overview-e-setup)
2. [Architettura Esagonale e Struttura](#2-architettura-esagonale-e-struttura)
3. [Entry Point e Inizializzazione SDK](#3-entry-point-e-inizializzazione-sdk)
4. [Sistema di Autenticazione (JWT + mTLS)](#4-sistema-di-autenticazione-jwt--mtls) **[CRITICO]**
5. [Platform Adapters (Node, Web, React Native)](#5-platform-adapters-node-web-react-native)
6. [Domain Layer (Entities, Value Objects, Services)](#6-domain-layer)
7. [Data Flow: DTOs e Zod Validation](#7-data-flow-dtos-e-zod-validation)
8. [HTTP Client, Cache e Error Handling](#8-http-client-cache-e-error-handling)
9. [Offline Queue System](#9-offline-queue-system)
10. [Testing e Quality](#10-testing-e-quality)
11. [Guida Pratica: Come Fare Modifiche](#11-guida-pratica-come-fare-modifiche)

---

## 1. Overview e Setup

### Cos'e'

SDK TypeScript multi-piattaforma per le API ACube di scontrini elettronici. Supporta **Node.js**, **React Native (Expo)** e **Web browser**. Fornisce autenticazione mTLS, supporto offline-first e operazioni API type-safe.

### Stack Tecnologico

| Area | Tecnologia |
|------|------------|
| Linguaggio | TypeScript (strict mode, `noUncheckedIndexedAccess`) |
| HTTP Client | Axios |
| Validation | Zod v4 |
| Reactive State | RxJS |
| Build | Rollup (4 bundle) |
| Test | Jest + ts-jest |
| Package Manager | Bun |

### Comandi Principali

```bash
bun install          # Install dependencies
bun run dev          # Watch mode
bun run build        # Build tutti i bundle (ESM, CJS, RN, .d.ts)
bun run test         # Run test suite
bun run quality      # format + lint:fix + typecheck (pre-commit hook)
bun run typecheck    # Solo type checking
./deploy.sh          # Release interattivo (bump → quality → test → build → npm publish)
```

### 4 Bundle di Output

| Bundle | Target | File |
|--------|--------|------|
| ESM | Browser / bundler | `dist/index.esm.js` |
| CJS | Node.js | `dist/index.cjs.js` |
| React Native | Expo / RN | `dist/index.native.js` |
| Types | TypeScript | `dist/index.d.ts` |

La risoluzione e' automatica via `exports` in `package.json`:

```json
"exports": {
  ".": {
    "react-native": "./dist/index.native.js",
    "browser": "./dist/index.esm.js",
    "node": "./dist/index.cjs.js",
    "import": "./dist/index.esm.js",
    "require": "./dist/index.cjs.js",
    "types": "./dist/index.d.ts"
  }
}
```

Il bundle React Native usa `@rollup/plugin-replace` per sostituire i require Node.js con null/mock (vedi `rollup.config.js`).

### Pre-commit Hook (Husky)

Ogni commit esegue automaticamente: `bun run quality && bun run test`. Non e' possibile committare se lint, typecheck o test falliscono.

### Path Alias

`@/` risolve a `src/` ovunque (tsconfig, Rollup, Jest):

```typescript
import { Receipt } from '@/domain/entities';
import { IHttpPort } from '@/application/ports/driven';
```

### File chiave di questa sezione

- `package.json` — exports, scripts, dependencies
- `rollup.config.js` — build multi-piattaforma
- `tsconfig.json` — strict mode
- `.husky/pre-commit` — quality gate

---

## 2. Architettura Esagonale e Struttura

### Layer Diagram

```
                    ┌─────────────────────────────────┐
                    │          DOMAIN LAYER            │
                    │  (entities, value-objects,       │
                    │   repositories interfaces,       │
                    │   services, errors)              │
                    └──────────────▲──────────────────┘
                                   │  depends on
                    ┌──────────────┴──────────────────┐
                    │       APPLICATION LAYER          │
                    │  (ports driven/driving,          │
                    │   services, DTOs)                │
                    └──────────────▲──────────────────┘
                                   │  depends on
                    ┌──────────────┴──────────────────┐
                    │      INFRASTRUCTURE LAYER        │
                    │  driven: api, http, platforms,   │
                    │          cache, storage, offline │
                    │  driving: sdk, react             │
                    └──────────────▲──────────────────┘
                                   │
                    ┌──────────────┴──────────────────┐
                    │         SHARED LAYER             │
                    │  (config, types, utils,          │
                    │   validation)                    │
                    └─────────────────────────────────┘
```

**Le dipendenze puntano SEMPRE verso il domain (dependency inversion).**

### Struttura Cartelle

```
src/
├── domain/                          # Business logic puro (framework-agnostic)
│   ├── entities/                    # Receipt, Merchant, Cashier, CashRegister, etc.
│   ├── value-objects/               # VatCode, Address, Role, Page
│   ├── repositories/                # Interface contracts (IReceiptRepository, etc.)
│   ├── services/                    # JWT parsing, certificate validation
│   └── errors/                      # MTLSError
│
├── application/                     # Use cases e orchestrazione
│   ├── ports/
│   │   └── driven/                  # Secondary ports (HTTP, Storage, mTLS, Cache, Network, Auth)
│   ├── services/                    # AuthenticationService, CertificateService, AppStateService
│   └── dto/                         # Data Transfer Objects (camelCase <-> snake_case)
│
├── infrastructure/                  # Implementazioni esterne
│   ├── driven/
│   │   ├── api/                     # Repository implementations (HTTP calls)
│   │   ├── http/                    # AxiosHttpAdapter, AuthStrategy, error handling
│   │   ├── platforms/               # Node.js, Web, React Native adapters
│   │   ├── cache/                   # CachingHttpDecorator, CacheKeyGenerator, CacheManager
│   │   ├── storage/                 # TokenStorageAdapter
│   │   └── offline/                 # OfflineManager, OperationQueue, SyncManager
│   ├── driving/
│   │   └── sdk/                     # ACubeSDK, SDKFactory, SDKManager, DIContainer
│   └── loaders/                     # Platform adapter auto-loading
│
└── shared/                          # Cross-cutting
    ├── config/                      # ConfigManager (URL mapping per environment)
    ├── types/                       # SDKConfig, Environment, User, AuthCredentials
    ├── utils/                       # Logger, formatters, platform detection
    └── validation/                  # Zod schemas per API payloads
        └── api/                     # receipts.ts, merchants.ts, cashiers.ts, etc.
```

### Pattern Principali

| Pattern | Dove | Scopo |
|---------|------|-------|
| **Repository** | `domain/repositories/` → `infrastructure/driven/api/` | Interface in domain, implementazione in infrastructure |
| **Decorator** | `CachingHttpDecorator` wraps `AxiosHttpAdapter` | Aggiunge cache trasparente all'HTTP client |
| **Observer** | RxJS `BehaviorSubject` | Auth state, app state, network state reattivi |
| **DI Container** | `DIContainer` con Symbol tokens | Dependency injection custom senza framework |
| **Factory** | `SDKFactory.createContainer()` | Setup lazy delle dipendenze |
| **Strategy** | `AuthStrategy` | Routing JWT vs mTLS in base a contesto |

### DI Container — Spiegazione Approfondita

Il progetto usa un **container di dependency injection custom** (nessun framework esterno tipo InversifyJS o tsyringe). Il codice e' in due file:

- `src/infrastructure/driving/sdk/di-container.ts` — Container + token definitions
- `src/infrastructure/driving/sdk/sdk-factory.ts` — Registrazione di tutti i servizi

#### 1. Token: Identificatori Simbolici

I token sono `Symbol` usati come chiavi per il container. Ogni dipendenza ha il suo token univoco:

```typescript
// src/infrastructure/driving/sdk/di-container.ts
export const DI_TOKENS = {
  // --- Infrastruttura (ports) ---
  HTTP_PORT: Symbol('HTTP_PORT'),           // HTTP client (potenzialmente decorato con cache)
  BASE_HTTP_PORT: Symbol('BASE_HTTP_PORT'), // HTTP client raw (mai decorato)
  STORAGE_PORT: Symbol('STORAGE_PORT'),
  SECURE_STORAGE_PORT: Symbol('SECURE_STORAGE_PORT'),
  NETWORK_PORT: Symbol('NETWORK_PORT'),
  CACHE_PORT: Symbol('CACHE_PORT'),
  CACHE_KEY_GENERATOR: Symbol('CACHE_KEY_GENERATOR'),
  MTLS_PORT: Symbol('MTLS_PORT'),
  TOKEN_STORAGE_PORT: Symbol('TOKEN_STORAGE_PORT'),

  // --- Repository (domain interfaces, infrastructure implementations) ---
  RECEIPT_REPOSITORY: Symbol('RECEIPT_REPOSITORY'),
  MERCHANT_REPOSITORY: Symbol('MERCHANT_REPOSITORY'),
  CASHIER_REPOSITORY: Symbol('CASHIER_REPOSITORY'),
  CASH_REGISTER_REPOSITORY: Symbol('CASH_REGISTER_REPOSITORY'),
  POINT_OF_SALE_REPOSITORY: Symbol('POINT_OF_SALE_REPOSITORY'),
  SUPPLIER_REPOSITORY: Symbol('SUPPLIER_REPOSITORY'),
  PEM_REPOSITORY: Symbol('PEM_REPOSITORY'),
  DAILY_REPORT_REPOSITORY: Symbol('DAILY_REPORT_REPOSITORY'),
  JOURNAL_REPOSITORY: Symbol('JOURNAL_REPOSITORY'),
  NOTIFICATION_REPOSITORY: Symbol('NOTIFICATION_REPOSITORY'),
  TELEMETRY_REPOSITORY: Symbol('TELEMETRY_REPOSITORY'),

  // --- Application services ---
  RECEIPT_SERVICE: Symbol('RECEIPT_SERVICE'),
  AUTH_SERVICE: Symbol('AUTH_SERVICE'),
  AUTHENTICATION_SERVICE: Symbol('AUTHENTICATION_SERVICE'),
  CERTIFICATE_SERVICE: Symbol('CERTIFICATE_SERVICE'),
  OFFLINE_SERVICE: Symbol('OFFLINE_SERVICE'),
  NOTIFICATION_SERVICE: Symbol('NOTIFICATION_SERVICE'),
  TELEMETRY_SERVICE: Symbol('TELEMETRY_SERVICE'),
} as const;
```

**Perche' Symbol?** Ogni `Symbol()` e' garantito unico anche se la stringa e' la stessa. Questo evita collisioni di nomi e rende impossibile risolvere un servizio con una stringa hardcoded.

#### 2. Il Container: Come Funziona

```typescript
export class DIContainer {
  private services = new Map<symbol, unknown>();   // Istanze singleton
  private factories = new Map<symbol, () => unknown>(); // Factory lazy

  // Registra un'istanza gia' creata (singleton immediato)
  register<T>(token: symbol, instance: T): void {
    this.services.set(token, instance);
  }

  // Registra una factory (eseguita solo al primo get())
  registerFactory<T>(token: symbol, factory: () => T): void {
    this.factories.set(token, factory);
  }

  // Risolvi: cerca prima in services, poi in factories
  get<T>(token: symbol): T {
    // 1. Se c'e' gia' un'istanza, restituiscila
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }
    // 2. Se c'e' una factory, eseguila, salva il risultato come singleton, restituisci
    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory() as T;
      this.services.set(token, instance);  // ← diventa singleton dopo il primo get
      return instance;
    }
    // 3. Nessuno dei due: errore
    throw new Error(`Service not registered: ${token.toString()}`);
  }

  has(token: symbol): boolean { ... }
  clear(): void { ... }
}
```

**Il pattern chiave**: `registerFactory()` + `get()` = **lazy singleton**. La factory viene eseguita solo al primo `get()`, il risultato viene salvato in `services`, e da quel momento tutte le chiamate `get()` successive restituiscono la stessa istanza.

#### 3. SDKFactory: Chi Registra Cosa

La registrazione avviene in fasi progressive dentro `sdk-factory.ts`:

```
SDKFactory.createContainer(config)        ← Fase 1: HTTP + Repository factories
SDKFactory.registerAuthServices(...)      ← Fase 2: Token storage + Auth service
SDKFactory.registerCacheServices(...)     ← Fase 3: Cache decorator (opzionale)
```

**Fase 1 — `createContainer()`**: Crea HTTP adapter e registra tutti i repository come factory:

```typescript
// Istanze immediate
container.register(DI_TOKENS.BASE_HTTP_PORT, httpAdapter);  // sempre il raw Axios
container.register(DI_TOKENS.HTTP_PORT, httpAdapter);        // inizialmente = BASE, poi sostituito

// Factory lazy — il repository viene creato solo quando qualcuno lo chiede
container.registerFactory(DI_TOKENS.RECEIPT_REPOSITORY, () => {
  const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);  // ← risolve HTTP_PORT qui
  return new ReceiptRepositoryImpl(http);
});
// ... stesso pattern per tutti gli 11 repository
```

**Fase 2 — `registerAuthServices()`**: Aggiunge token storage e auth service:

```typescript
container.register(DI_TOKENS.TOKEN_STORAGE_PORT, tokenStorage);
container.registerFactory(DI_TOKENS.AUTHENTICATION_SERVICE, () => {
  const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
  const storage = container.get<ITokenStoragePort>(DI_TOKENS.TOKEN_STORAGE_PORT);
  return new AuthenticationService(http, storage, { authUrl, timeout });
});
```

**Fase 3 — `registerCacheServices()`**: Wrappa l'HTTP port con il caching decorator:

```typescript
container.register(DI_TOKENS.CACHE_PORT, cache);
container.register(DI_TOKENS.CACHE_KEY_GENERATOR, keyGenerator);

const baseHttp = container.get<IHttpPort>(DI_TOKENS.BASE_HTTP_PORT);    // raw Axios
const cachingHttp = new CachingHttpDecorator(baseHttp, cache, keyGenerator, network);
container.register(DI_TOKENS.HTTP_PORT, cachingHttp);  // ← SOVRASCRIVE HTTP_PORT!
```

#### 4. Il Trucco Critico: HTTP_PORT Swap

Questo e' il punto piu' importante da capire:

```
Stato dopo Fase 1:
  BASE_HTTP_PORT → AxiosHttpAdapter  (raw)
  HTTP_PORT      → AxiosHttpAdapter  (stessa istanza)

Stato dopo Fase 3 (se cache disponibile):
  BASE_HTTP_PORT → AxiosHttpAdapter  (raw, invariato)
  HTTP_PORT      → CachingHttpDecorator(AxiosHttpAdapter)  ← SOSTITUITO!
```

**Perche' funziona?** Tutti i repository usano factory lazy che risolvono `HTTP_PORT` solo al primo `get()`. Siccome le factory vengono eseguite **dopo** la Fase 3, i repository ricevono automaticamente la versione cached. L'ordine delle fasi e' quindi critico.

```
Ordine di registrazione:              Ordine di risoluzione (al primo accesso):
┌──────────────────────┐              ┌────────────────────────────────────┐
│ Fase 1: register     │              │ sdk.receipts  (primo accesso)      │
│   BASE_HTTP = Axios  │              │  └→ factory eseguita               │
│   HTTP = Axios       │              │      └→ get(HTTP_PORT)             │
│   repos = factories  │              │          └→ CachingHttpDecorator ✓ │
│                      │              │                                    │
│ Fase 2: register     │              │ sdk.merchants (primo accesso)      │
│   TOKEN_STORAGE      │              │  └→ factory eseguita               │
│   AUTH_SERVICE(f)    │              │      └→ get(HTTP_PORT)             │
│                      │              │          └→ stessa istanza cached  │
│ Fase 3: register     │              │                                    │
│   HTTP = Caching(Ax) │ ← swap      │ Tutti i repo hanno cache gratis    │
└──────────────────────┘              └────────────────────────────────────┘
```

#### 5. Recupero Servizi: `getServices()`

Alla fine dell'init, `SDKFactory.getServices(container)` risolve tutti i token e restituisce un oggetto tipato:

```typescript
static getServices(container: DIContainer): SDKServices {
  return {
    http: container.get<IHttpPort>(DI_TOKENS.HTTP_PORT),
    receipts: container.get<IReceiptRepository>(DI_TOKENS.RECEIPT_REPOSITORY),
    merchants: container.get<IMerchantRepository>(DI_TOKENS.MERCHANT_REPOSITORY),
    // ... tutti i repository
    // + opzionalmente tokenStorage e authService se registrati
  };
}
```

A questo punto tutte le factory vengono eseguite e ogni repository diventa singleton.

#### 6. Gotchas e Regole Pratiche

| Regola | Motivazione |
|--------|-------------|
| **Mai risolvere un repository prima della Fase 3** | Riceverebbe `AxiosHttpAdapter` raw invece di `CachingHttpDecorator` |
| **Usare `registerFactory` per tutto cio' che dipende da `HTTP_PORT`** | Garantisce che la risoluzione avvenga dopo lo swap |
| **`BASE_HTTP_PORT` e' l'escape hatch** | Se servono chiamate HTTP senza cache (es. auth), usare `BASE_HTTP_PORT` |
| **Il container NON gestisce cicli** | Non tentare di creare dipendenze circolari — non c'e' protezione |
| **`clear()` distrugge tutto** | Usato nel `destroy()` dell'SDK per cleanup completo |

#### 7. Come Aggiungere un Nuovo Servizio

```typescript
// 1. Aggiungi il token in di-container.ts
export const DI_TOKENS = {
  // ...
  MY_NEW_SERVICE: Symbol('MY_NEW_SERVICE'),  // ← nuovo
};

// 2. Registra la factory in sdk-factory.ts (dentro createContainer o un metodo dedicato)
container.registerFactory(DI_TOKENS.MY_NEW_SERVICE, () => {
  const http = container.get<IHttpPort>(DI_TOKENS.HTTP_PORT);
  return new MyNewServiceImpl(http);
});

// 3. Risolvi dove serve
const myService = container.get<IMyNewService>(DI_TOKENS.MY_NEW_SERVICE);
```

---

## 3. Entry Point e Inizializzazione SDK

### Due Modi di Usare l'SDK

```typescript
// Opzione 1: Low-level (full control)
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';
const sdk = await createACubeSDK({ environment: 'sandbox', debug: true });

// Opzione 2: Singleton wrapper (production apps)
import { SDKManager } from '@a-cube-io/ereceipts-js-sdk';
SDKManager.configure({ environment: 'sandbox' });
const manager = await SDKManager.getInstance();
```

### Sequenza di Inizializzazione

File: `src/infrastructure/driving/sdk/acube-sdk.ts` — metodo `initialize()` (righe 68-297):

```
createACubeSDK(config)
 └─> new ACubeSDK(config) + initialize()
     │
     ├─ 1. Load Platform Adapters (auto-detect Node/Web/RN)
     │     └─> loadPlatformAdapters() → storage, secureStorage, network, cache, mtls
     │
     ├─ 2. Create DI Container
     │     └─> SDKFactory.createContainer() → registra HTTP_PORT, BASE_HTTP_PORT, tutti i repository factories
     │
     ├─ 3. Register Auth Services
     │     └─> TokenStorageAdapter wraps secureStorage
     │
     ├─ 4. Register Cache Services (se cache adapter disponibile)
     │     └─> HTTP_PORT sostituito con CachingHttpDecorator(BASE_HTTP_PORT)
     │
     ├─ 5. Initialize Services
     │     ├─> CertificateService(secureStorage)
     │     ├─> AuthenticationService(httpPort, tokenStorage, config, events)
     │     └─> OfflineManager(storage, httpPort, networkMonitor, config, events)
     │
     ├─ 6. Subscribe to Network Status
     │     └─> offline→online transition triggers auto-sync
     │
     ├─ 7. Restore Auth Token (se autenticato)
     │     └─> setAuthToken() su HTTP port
     │
     ├─ 8. Configure mTLS Adapter + Auth Strategy
     │     ├─> baseHttpPort.setMTLSAdapter(mtlsAdapter)
     │     └─> baseHttpPort.setAuthStrategy(new AuthStrategy(jwt, mtls, userProvider, mtls))
     │
     └─ 9. Auto-configure Certificate (se gia' stored)
           └─> mtlsAdapter.configureCertificate(storedCert)
```

### API URL per Environment

File: `src/shared/config/config-manager.ts`

| Environment | API URL | Auth URL |
|-------------|---------|----------|
| `production` | `https://ereceipts-it.acubeapi.com` | `https://common.api.acubeapi.com` |
| `development` | `https://ereceipts-it.dev.acubeapi.com` | `https://common-sandbox.api.acubeapi.com` |
| `sandbox` | `https://ereceipts-it-sandbox.acubeapi.com` | `https://common-sandbox.api.acubeapi.com` |

Default: timeout 30s, retry 3 tentativi.

### API Pubblica dell'SDK

```typescript
// Auth
sdk.login({ email, password }): Promise<User>
sdk.logout(): Promise<void>
sdk.getCurrentUser(): Promise<User | null>
sdk.isAuthenticated(): Promise<boolean>

// Repositories (getter lazy dal DI Container)
sdk.receipts       // IReceiptRepository
sdk.merchants      // IMerchantRepository
sdk.cashiers       // ICashierRepository
sdk.cashRegisters  // ICashRegisterRepository
sdk.pointOfSales   // IPointOfSaleRepository
sdk.suppliers      // ISupplierRepository
sdk.pems           // IPemRepository
sdk.dailyReports   // IDailyReportRepository
sdk.journals       // IJournalRepository
sdk.notifications  // INotificationRepository
sdk.telemetry      // ITelemetryRepository

// Certificates
sdk.storeCertificate(cert, key, { format: 'pem' }): Promise<void>
sdk.hasCertificate(): Promise<boolean>
sdk.getCertificateInfo(): Promise<CertificateInfo | null>
sdk.clearCertificate(): Promise<void>
sdk.getMTLSStatus(): Promise<MTLSStatus>

// Offline
sdk.getOfflineManager(): OfflineManager
sdk.isOnline(): boolean

// Lifecycle
sdk.destroy(): void
```

### File chiave di questa sezione

- `src/index.ts` — exports pubblici
- `src/infrastructure/driving/sdk/acube-sdk.ts` — classe SDK e `initialize()`
- `src/infrastructure/driving/sdk/sdk-factory.ts` — setup DI
- `src/infrastructure/driving/sdk/sdk-manager.ts` — singleton wrapper
- `src/infrastructure/driving/sdk/di-container.ts` — DI container + tokens
- `src/shared/config/config-manager.ts` — URL mapping

---

## 4. Sistema di Autenticazione (JWT + mTLS)

> **QUESTA E' L'AREA PIU' CRITICA DEL PROGETTO. Comprenderla e' prerequisito per qualsiasi modifica.**

### Overview

L'SDK usa **dual authentication**:
- **JWT** (Bearer token) — autenticazione standard HTTP
- **mTLS** (Client certificate) — mutual TLS per operazioni sensibili

La scelta e' **automatica** basata su 3 fattori: **Ruolo utente**, **Piattaforma**, **Endpoint**.

### Auth Strategy — La Tabella Decisionale

File: `src/infrastructure/driven/http/auth-strategy.ts`

Questo file e' il **cervello** dell'autenticazione. Metodo `determineAuthConfig()`:

| Ruolo | Endpoint | Piattaforma | Auth Mode | Porta |
|-------|----------|-------------|-----------|-------|
| **SUPPLIER** | Qualsiasi | Qualsiasi | JWT | 443 |
| **CASHIER** | Non-receipt | Qualsiasi | JWT | 443 |
| **CASHIER** | Receipt | Mobile | **mTLS** | **444** |
| **CASHIER** | Receipt | Web | JWT | 444 |
| **MERCHANT** | Non-receipt | Qualsiasi | JWT | 443 |
| **MERCHANT** | Receipt GET (lista) | Qualsiasi | JWT | 443 |
| **MERCHANT** | Receipt GET (details) | Mobile | **mTLS** | **444** |
| **MERCHANT** | Receipt GET (details) | Web | JWT | 444 |
| **MERCHANT** | Receipt mutations | Mobile | **mTLS** | **444** |
| **MERCHANT** | Receipt mutations | Web | JWT | 444 |
| **MERCHANT** | Returnable items | Qualsiasi | **mTLS** | **444** |
| Qualsiasi | `/mf1/notifications` | Qualsiasi | **mTLS** | **444** |
| Qualsiasi | `/mf1/pems/*/telemetry` | Qualsiasi | **mTLS** | **444** |

### Flusso di una Richiesta HTTP

```
sdk.receipts.create(input)
 │
 ├─> ReceiptRepositoryImpl.create()
 │     └─> httpPort.post('/mf1/receipts', apiInput)
 │
 ├─> AxiosHttpAdapter.post()
 │     └─> shouldUseMTLS('/mf1/receipts', 'POST')
 │           └─> authStrategy.determineAuthConfig()
 │                 └─> Controlla: role=CASHIER, platform=mobile, endpoint=receipt
 │                     → return { mode: 'mtls', usePort444: true }
 │
 ├─> Se mode === 'mtls':
 │     └─> mtlsAuthHandler.makeRequest()
 │           ├─> Request deduplication (evita chiamate identiche parallele)
 │           ├─> mtlsAdapter.request({ url con porta 444, headers con JWT, data })
 │           └─> Se errore certificato → riconfigura e riprova UNA volta
 │
 └─> Se mode === 'jwt':
       └─> axios.request() con header Authorization: Bearer {token}
```

### Login Flow

File: `src/application/services/authentication.service.ts`

```
sdk.login({ email, password })
 └─> AuthenticationService.login()
     ├─> POST {authUrl}/login → { token, ... }
     ├─> parseJwt(token) → estrae ruoli, uid, username, exp
     ├─> tokenStorage.saveAccessToken(token, expiresAt)
     ├─> tokenStorage.saveUser(user)
     ├─> httpPort.setAuthToken(token)
     └─> events.onUserChanged(user)
```

### JWT Parsing e Expiry

File: `src/domain/services/jwt-parser.service.ts`

- `parseJwt(token)` — decodifica payload JWT (NO verifica firma)
- `isTokenExpired(payload)` — **buffer di 5 minuti** prima della scadenza reale
  ```typescript
  Date.now() >= payload.exp * 1000 - 300000  // 5 min buffer
  ```
- `extractRoles(jwtRoles)` — appiattisce ruoli da tutti i domini, filtra solo `ROLE_SUPPLIER/MERCHANT/CASHIER`

### mTLS Auth Handler

File: `src/infrastructure/driven/http/mtls-auth.handler.ts`

Funzionalita' chiave:
- **Request deduplication**: genera key da `{method}:{url}:{dataHash}:{authHash}`, previene duplicati
- **Retry su errore certificato**: detecta errori SSL/TLS, riconfigura cert e riprova UNA volta
- **Status reporting**: `adapterAvailable`, `hasCertificate`, `isReady`, `pendingRequestsCount`

> **ATTENZIONE**: Le richieste mTLS includono ANCHE il JWT token nell'header `Authorization`. Il certificato serve per il TLS handshake, il JWT per l'auth applicativa.

### Gotchas Critici

1. **Port 444**: mTLS usa SEMPRE porta 444. JWT usa 444 SOLO per receipt endpoints specifici.
2. **SUPPLIER non usa MAI mTLS**, anche se richiesto esplicitamente (override a JWT).
3. **Web non supporta mTLS programmatico** — il browser gestisce i certificati. L'SDK fa fallback a JWT.
4. `testConnection()` su React Native NON e' affidabile per validazione. Usare `hasCertificate()`.

### File chiave di questa sezione

- **`src/infrastructure/driven/http/auth-strategy.ts`** — IL file piu' importante del progetto
- `src/infrastructure/driven/http/axios-http.adapter.ts` — HTTP client con dual-mode
- `src/infrastructure/driven/http/jwt-auth.handler.ts` — JWT handler
- `src/infrastructure/driven/http/mtls-auth.handler.ts` — mTLS handler con dedup e retry
- `src/application/services/authentication.service.ts` — login/logout/token
- `src/domain/services/jwt-parser.service.ts` — JWT parsing
- `src/application/services/certificate.service.ts` — certificate storage

---

## 5. Platform Adapters (Node, Web, React Native)

### Platform Detection

File: `src/shared/utils/platform-detector.ts`

```
React Native?  → global.__DEV__ + navigator.product === 'ReactNative'
Web?           → window + window.document
Node.js?       → process.versions.node
Fallback       → 'unknown'
```

### Adapter Loading

File: `src/infrastructure/loaders/adapter-loader.ts`

All'inizializzazione SDK, `loadPlatformAdapters()` carica automaticamente:

| Adapter | Node.js | Web | React Native |
|---------|---------|-----|-------------|
| **Storage** | In-memory Map (solo test!) | localStorage | AsyncStorage |
| **Secure Storage** | In-memory Map (solo test!) | XOR obfuscation (non sicura!) | expo-secure-store / react-native-keychain |
| **Network Monitor** | Network interfaces check | `window.online/offline` events | `@react-native-community/netinfo` |
| **Cache** | - | IndexedDB (`idb` library) | SQLite (expo-sqlite / rn-sqlite-storage) |
| **mTLS** | `https.Agent` nativo | NOT SUPPORTED (fallback JWT) | `@a-cube-io/expo-mutual-tls` native module |

### mTLS per Piattaforma — Dettagli

#### React Native (Production-ready)

File: `src/infrastructure/driven/platforms/react-native/mtls.ts`

- Usa `@a-cube-io/expo-mutual-tls` (modulo nativo)
- Supporta **PEM** e **P12** format
- Due step: `configurePEM()` → `storePEM()` (o `configureP12()` → `storeP12()`)
- Certificati in iOS Keychain / Android EncryptedSharedPreferences
- Event listeners per debug/errori (DEVONO essere cleaned up su `destroy()`)
- Estrae PEM ID e Cash Register UUID dal subject CN (formato: `{uuid}:{pem-id}`)

#### Node.js (Production-ready)

File: `src/infrastructure/driven/platforms/node/mtls.ts`

- Usa `https.Agent` con `cert` + `key` + Axios
- Solo formato **PEM** supportato
- keepAlive, maxSockets: 10, timeout: 30s
- Parsing certificato incompleto (ritorna placeholder)

#### Web (NOT SUPPORTED)

File: `src/infrastructure/driven/platforms/web/mtls.ts`

- Tutti i metodi lanciano `MTLSError.NOT_SUPPORTED`
- Il browser gestisce i certificati client via settings, non programmaticamente
- `AuthStrategy` fa automaticamente fallback a JWT per piattaforma web

### Cache per Piattaforma

#### Web: IndexedDB

File: `src/infrastructure/driven/platforms/web/cache.ts`

- DB `acube_cache`, store `cache_entries`
- Compressione opzionale per item > 1KB
- Gestione conflitti multi-tab (version conflict → delete + recreate DB)
- Il cache **non scade mai** a livello storage (TTL gestito dal decorator)

#### React Native: SQLite

File: `src/infrastructure/driven/platforms/react-native/cache.ts`

- Supporta `expo-sqlite` e `react-native-sqlite-storage`
- Migration automatica per colonna `compressed`
- Fallback `MemoryCacheAdapter` se SQLite non disponibile (no persistenza tra restart)

### Storage Security Summary

| Piattaforma | Storage Normale | Storage Sicuro | Livello Sicurezza |
|-------------|-----------------|----------------|-------------------|
| Node.js | In-memory Map | In-memory Map | SOLO TEST |
| Web | localStorage | XOR cipher + localStorage | BASSO (obfuscation) |
| React Native | AsyncStorage | Keychain / Keystore | ALTO (OS-level crypto) |

### File chiave di questa sezione

- `src/infrastructure/loaders/adapter-loader.ts` — auto-loading
- `src/infrastructure/driven/platforms/react-native/mtls.ts` — il piu' complesso
- `src/infrastructure/driven/platforms/react-native/storage.ts` — secure storage
- `src/infrastructure/driven/platforms/web/cache.ts` — IndexedDB
- `src/infrastructure/driven/platforms/react-native/cache.ts` — SQLite

---

## 6. Domain Layer

### Entita' Principali

#### Receipt (la piu' complessa)

File: `src/domain/entities/receipt.entity.ts`

- Tipi: `'sale' | 'return' | 'void'`
- **9 workflow di mutation**: create, void (3 varianti), return (3 varianti)
- Varianti void/return: stesso device, device diverso, con prova (POS/VR/ND)
- Tutti gli importi sono **string decimali** (`"10.50"`, MAI numbers)
- `isReturnable` / `isVoidable` — flag calcolati dal server
- Customer identifiers mutuamente esclusivi: `customerTaxCode` XOR `customerLotteryCode`
- Almeno un metodo di pagamento obbligatorio (cash, electronic, ticket restaurant)

#### Merchant

File: `src/domain/entities/merchant.entity.ts`

- `vatNumber` — Partita IVA (11 cifre)
- Naming rule: `businessName` XOR (`firstName` + `lastName`), mai entrambi
- Email obbligatoria e unica

#### CashRegister

File: `src/domain/entities/cash-register.entity.ts`

- `CashRegisterDetailed` include `mtlsCertificate` + `privateKey`
- **CRITICO**: Queste credenziali mTLS sono restituite SOLO alla creazione. Salvale subito!

#### PEM / PointOfSale

Due entita' diverse per due API diverse:
- `PointOfSale` (MF1 API) — operazioni: activate, closeJournal, communicateOffline
- `PointOfSaleMf2` (MF2 API) — creazione, recupero certificati

Lifecycle PEM: `NEW → REGISTERED → ACTIVATED → ONLINE ⇄ OFFLINE → DISCARDED`

#### Altre Entita'

- `Cashier` — status `'active' | 'disabled'`, metodo speciale `findMe()`
- `Supplier` — scoped per merchant (ogni merchant ha i suoi)
- `DailyReport` — report giornalieri (read-only)
- `Journal` — log audit (auto-creati, solo `close()` come mutation)
- `Notification` — discriminated union su `code` (4 tipi: MF2_UNREACHABLE, STATUS_OFFLINE/ONLINE, COMM_RESTORED)
- `Telemetry` — metriche real-time PEM

### Value Objects

| Value Object | File | Dettagli |
|-------------|------|----------|
| `VatCode` | `vat-code.vo.ts` | 22 codici validi: rates (4.00, 5.00, 10.00, 22.00, +8 speciali) + exempt (N1-N6) |
| `Address` | `address.vo.ts` | Indirizzo italiano: CAP 5 cifre, provincia 2 char uppercase |
| `Page<T>` | `page.vo.ts` | Container paginazione (members, total, page, size, pages) |
| `Role` | `role.vo.ts` | `ROLE_SUPPLIER`, `ROLE_CASHIER`, `ROLE_MERCHANT` — domain-scoped |

### Domain Services

| Service | File | Funzione |
|---------|------|----------|
| `JwtParserService` | `jwt-parser.service.ts` | Parse JWT (no crypto), expiry con 5-min buffer, extract roles |
| `CertificateValidator` | `certificate-validator.service.ts` | Valida formato PEM (headers/footers), check scadenza |

### Domain Errors

Solo `MTLSError` (`src/domain/errors/mtls.error.ts`) con 7 tipi:
`NOT_SUPPORTED`, `CERTIFICATE_NOT_FOUND`, `CERTIFICATE_EXPIRED`, `CERTIFICATE_INVALID`, `CONNECTION_FAILED`, `AUTHENTICATION_FAILED`, `CONFIGURATION_ERROR`

### Repository Interfaces

Tutte in `src/domain/repositories/`. Pattern comune:

```typescript
export interface IReceiptRepository {
  create(input: ReceiptInput): Promise<Receipt>;
  findById(uuid: string): Promise<Receipt>;
  findAll(params: ReceiptListParams): Promise<Page<Receipt>>;
  getDetails(uuid: string, format: 'json'): Promise<ReceiptDetails>;
  getDetails(uuid: string, format: 'pdf'): Promise<string>;  // overloaded
  voidReceipt(input: VoidReceiptInput): Promise<void>;
  // ... 9 mutation methods total
}
```

> **Nota**: `IMerchantRepository.findAll()` ritorna `Merchant[]`, NON `Page<Merchant>` — inconsistenza con gli altri repository.

---

## 7. Data Flow: DTOs e Zod Validation

### Il Flusso Completo

```
                     OUTBOUND (Invio)
Domain Object ─→ DTO.toApiInput() ─→ Zod Validation ─→ HTTP Request
 (camelCase)        (snake_case)       (snake_case)

                     INBOUND (Ricezione)
HTTP Response ─→ DTO.fromApiOutput() ─→ Domain Object
 (snake_case)       (camelCase)          (camelCase)
```

### DTO Mappers

Posizione: `src/application/dto/`

Ogni entita' ha un mapper con pattern simmetrico:

```typescript
// src/application/dto/receipt.dto.ts
export class ReceiptMapper {
  static toApiInput(domain: ReceiptInput): ReceiptApiInput {
    return {
      cash_register_uuid: domain.cashRegisterUuid,    // camelCase → snake_case
      total_amount: formatDecimal(domain.totalAmount), // "10" → "10.00"
      items: domain.items.map(ReceiptMapper.itemToApiInput),
      // ...
    };
  }

  static fromApiOutput(api: ReceiptApiOutput): Receipt {
    return {
      uuid: api.uuid,
      cashRegisterUuid: api.cash_register_uuid,  // snake_case → camelCase
      totalAmount: api.total_amount,              // preserva string decimal
      // ...
    };
  }
}
```

#### Mapper per Entita'

| Mapper | File | Note |
|--------|------|------|
| `ReceiptMapper` | `receipt.dto.ts` | Il piu' complesso, 15+ metodi (create, void x3, return x3, pagination) |
| `MerchantMapper` + `AddressMapper` | `merchant.dto.ts` | Nested object mapping, preserva `null` vs `undefined` |
| `NotificationMapper` | `notification.dto.ts` | Discriminated union con switch su `code` |
| `TelemetryMapper` | `telemetry.dto.ts` | Deep nested objects con helper privati |
| `CashierMapper`, `CashRegisterMapper`, etc. | file corrispondenti | Pattern standard |

#### Regole Importanti

- **String decimals**: `formatDecimal("10")` → `"10.00"`. MAI `parseFloat()`.
- **null vs undefined**: `null` = "cancella il campo", `undefined` = "non cambiare". Critico per update operations.
- **Simmetria**: `fromApi(toApi(original))` deve essere uguale all'originale. I test lo verificano.

### Zod Validation Schemas

Posizione: `src/shared/validation/api/`

Validano i payload API (snake_case) **prima** dell'invio HTTP.

#### Receipt Validation (`receipts.ts`)

```typescript
const ReceiptInputSchema = z.object({
  items: z.array(ReceiptItemSchema).min(1),  // Almeno un item
  customer_tax_code: z.string().optional(),
  customer_lottery_code: z.string().optional(),
  // ...
})
.refine(/* almeno 1 metodo di pagamento */)
.refine(/* customer_tax_code XOR customer_lottery_code */);
```

#### Merchant Validation (`merchants.ts`)

```typescript
const MerchantCreateInputSchema = z.object({
  vat_number: z.string().regex(/^\d{11}$/),     // 11 cifre
  email: z.string().email(),
  password: z.string().regex(/^((?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{10,}).*)$/),
  // ...
})
.refine(/* business_name XOR (first_name + last_name) */);
```

Password: min 10 char, 1 maiuscola, 1 minuscola, 1 cifra, 1 speciale.

#### Address Validation

```typescript
z.object({
  zip_code: z.string().regex(/^\d{5}$/),              // 5 cifre
  province: z.string().min(2).max(2).toUpperCase(),    // 2 char
});
```

### File chiave di questa sezione

- `src/application/dto/receipt.dto.ts` — DTO piu' completo
- `src/application/dto/merchant.dto.ts` — nested objects + null handling
- `src/shared/validation/api/receipts.ts` — refinements complessi
- `src/shared/validation/api/merchants.ts` — password regex
- `src/shared/utils/formatters.ts` — `formatDecimal()`

---

## 8. HTTP Client, Cache e Error Handling

### HTTP Client (AxiosHttpAdapter)

File: `src/infrastructure/driven/http/axios-http.adapter.ts`

- Implementa `IHttpPort` con tutti i metodi HTTP (get, post, put, patch, delete)
- **Dual-mode**: ogni richiesta chiama `shouldUseMTLS()` → delega a JWT o mTLS
- Request interceptor: attach JWT token + log completo (metodo, URL, params, body)
- Response interceptor: log risposta + dettagli errore
- `clearObject()` rimuove campi `undefined`/`null` dal body prima dell'invio

### Cache Layer

#### CachingHttpDecorator

File: `src/infrastructure/driven/cache/caching-http-decorator.ts`

Wraps HTTP client con cache intelligente:

```
GET Request Flow:
  1. Caching globalmente disabilitato? → bypass
  2. URL cacheable? → bypass se in exclude list
  3. Genera cache key
  4. Check cache:
     ├─ Valido (dentro TTL) → return cached    [x-cache: HIT]
     ├─ Scaduto + offline → return stale        [x-cache: STALE]
     ├─ Scaduto + online → fetch + update cache [x-cache: MISS]
     └─ Assente + offline → throw error
  5. Mutations (POST/PUT/DELETE) → invalidateRelated()
```

#### Cache Key Generator

File: `src/infrastructure/driven/cache/cache-key-generator.ts`

URL patterns → cache keys:
- `/mf1/receipts/abc-123` → `receipt:abc-123`
- `/mf1/receipts/abc-123/details` → `receipt:abc-123:details`
- `/mf1/cashiers/me` → `cashier:me`

#### TTL per Resource

| Resource | TTL | Cache List? | Cache Item? |
|----------|-----|-------------|-------------|
| merchant | 30 min | No | Si |
| point-of-sale | 30 min | No | Si |
| cash-register | 30 min | No | Si |
| cashier | 10 min | No | Si |
| supplier | 10 min | No | Si |
| receipt | 5 min | No | Si |
| notification | 1 min | No | No |
| telemetry | 1 min | No | No |

> **Nota**: Le **liste NON sono cached** di default (performance). Solo gli item singoli.

#### Cache Manager

File: `src/infrastructure/driven/cache/cache-manager.ts`

- Cleanup automatico ogni 5 min
- Trigger se memory > 70% o entries > 70% max
- Strategie: LRU (least recently used) o age-based
- Rimuove il 30% piu' vecchio/meno usato

### Error Handling

#### Error Transformer

File: `src/infrastructure/driven/http/error-transformer.ts`

| HTTP Status | Domain Error Type |
|-------------|-------------------|
| 400 | `VALIDATION_ERROR` |
| 401 | `AUTH_ERROR` |
| 403 | `FORBIDDEN_ERROR` |
| 404 | `NOT_FOUND_ERROR` |
| 422 | `VALIDATION_ERROR` |
| 5xx | `UNKNOWN_ERROR` |
| No response | `NETWORK_ERROR` |

Estrae message da: `detail` > `title` > `message`

#### Error Classifier

File: `src/infrastructure/driven/http/error-classifier.ts`

| Categoria | Retryable? |
|-----------|-----------|
| `SERVER_ERROR` (5xx) | No |
| `AUTH_ERROR` (401, 403) | No |
| `CLIENT_ERROR` (4xx) | No |
| `CERTIFICATE_ERROR` (MTLSError) | Si |
| `NETWORK_ERROR` (timeout, connection) | Si |

---

## 9. Offline Queue System

### Architettura a 3 Componenti

```
┌────────────────────────────────────────────────┐
│              OfflineManager (Facade)            │
│  - queue$: Observable<QueuedOperation[]>       │
│  - syncStatus$: Observable<SyncStatus>         │
│  - queueReceiptCreation(), sync(), retryFailed │
└──────────┬─────────────────────┬───────────────┘
           │                     │
    ┌──────▼──────┐      ┌──────▼──────┐
    │ Operation   │      │   Sync      │
    │   Queue     │      │  Manager    │
    │             │      │             │
    │ - priority  │      │ - RxJS      │
    │ - persist   │◄────►│ - batch     │
    │ - crash     │      │ - retry     │
    │   recovery  │      │ - backoff   │
    └─────────────┘      └─────────────┘
```

### OfflineManager (Facade)

File: `src/infrastructure/driven/offline/offline-manager.ts`

```typescript
// Observables reattivi
manager.queue$       // lista operazioni pending
manager.syncStatus$  // stato sync (online/processing/stats)

// Queue con priorita'
manager.queueReceiptCreation(data)  // priority 2
manager.queueReceiptVoid(data)      // priority 3 (piu' urgente)
manager.queueReceiptReturn(data)    // priority 3

// Controlli manuali
manager.sync()            // trigger sync immediato
manager.retryFailed()     // resetta failed → pending
manager.clearCompleted()  // pulizia
```

### OperationQueue

File: `src/infrastructure/driven/offline/queue.ts`

- Storage key: `acube_operation_queue`
- **Persistente**: salvato dopo OGNI modifica (attenzione: storage thrashing per alta frequenza)
- Priority queue: **higher number = sync prima** (counterintuitive)
- Max size: 1000, evicts lowest priority quando pieno
- **Crash recovery**: al caricamento, operazioni `processing` → `pending`

Struttura operazione:

```typescript
{
  id: string,                // timestamp-random
  type: 'CREATE'|'UPDATE'|'DELETE',
  resource: 'receipt'|'cashier'|...,
  endpoint: string,          // API path
  method: 'POST'|'PUT'|...,
  data?: unknown,
  status: 'pending'|'processing'|'completed'|'failed',
  retryCount: number,
  maxRetries: number,        // default 3
  priority: number,          // higher = prima
}
```

### SyncManager

File: `src/infrastructure/driven/offline/sync-manager.ts`

- **Auto-sync**: rileva transizioni `offline → online` via RxJS, triggera sync
- **Batch processing**: `Promise.allSettled` (continua anche su failure parziali)
- **Retry con exponential backoff**: `retryDelay * backoffMultiplier^retryCount`, cap a 60s
- Errori retryable: network, 5xx, 429, timeout
- 500ms delay tra batch

### Config Defaults

```typescript
{
  maxRetries: 3,
  retryDelay: 1000,       // 1s base
  maxRetryDelay: 30000,   // 30s cap
  backoffMultiplier: 2,   // 1s → 2s → 4s → 8s...
  maxQueueSize: 1000,
  batchSize: 10,
  syncInterval: 30000     // check ogni 30s
}
```

---

## 10. Testing e Quality

### Setup

- **Framework**: Jest + ts-jest
- **Environment**: Node
- **Timeout**: 10s
- **Test location**: `__tests__/` directories adiacenti al sorgente
- **29 test files** coprono domain, DTOs, infrastructure, validation, utilities

### Patterns di Test

#### 1. Unit Test Puro (Domain Service)

```typescript
// src/domain/services/__tests__/jwt-parser.service.test.ts
describe('parseJwt', () => {
  it('should parse valid JWT', () => {
    const token = createTestToken({ uid: 1, roles: {...} });
    const payload = parseJwt(token);
    expect(payload.uid).toBe(1);
  });
});
```

#### 2. DTO Mapping Test (Simmetria)

```typescript
// src/application/dto/__tests__/receipt.dto.test.ts
it('should map round-trip correctly', () => {
  const original = createReceiptInput();
  const api = ReceiptMapper.toApiInput(original);
  const restored = ReceiptMapper.fromApiOutput(api);
  expect(restored).toEqual(original);
});
```

#### 3. Error Handling Test

```typescript
// src/infrastructure/driven/http/__tests__/error-transformer.test.ts
it('should transform 401 to AUTH_ERROR', () => {
  const axiosError = createAxiosError(401);
  const error = transformError(axiosError);
  expect(error.type).toBe('AUTH_ERROR');
});
```

#### 4. Decorator Test (Cache)

```typescript
// src/infrastructure/driven/cache/__tests__/caching-http-decorator.test.ts
it('should return HIT from cache within TTL', async () => {
  mockCache.get.mockResolvedValue(cachedData);
  const result = await decorator.get('/receipts/123');
  expect(result.headers['x-cache']).toBe('HIT');
  expect(mockHttp.get).not.toHaveBeenCalled();
});
```

### Mocking Pattern Standard

```typescript
function createMockHttpPort(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}
```

### Quality Pipeline

```bash
bun run quality    # = format + lint:fix + typecheck
bun run test       # jest
```

Pre-commit hook esegue entrambi. Non puoi committare codice che non compila o che rompe test.

---

## 11. Guida Pratica: Come Fare Modifiche

### Come Aggiungere un Nuovo Repository

**6 step, 6 file**:

```
1. src/domain/repositories/my-entity.repository.ts    ← Interface
2. src/application/dto/my-entity.dto.ts               ← DTO Mapper
3. src/infrastructure/driven/api/my-entity.repo.impl.ts ← Implementation
4. src/infrastructure/driving/sdk/di-container.ts      ← Add DI_TOKEN
5. src/infrastructure/driving/sdk/sdk-factory.ts       ← Register factory
6. src/infrastructure/driving/sdk/acube-sdk.ts         ← Expose getter
```

Esempio step 3 (Implementation):

```typescript
export class MyEntityRepositoryImpl implements IMyEntityRepository {
  constructor(private readonly http: IHttpPort) {}

  async findById(id: string): Promise<MyEntity> {
    const response = await this.http.get<MyEntityApiOutput>(`/api/entities/${id}`);
    return MyEntityMapper.fromApiOutput(response.data);  // Map→Call→Map pattern
  }
}
```

### Come Aggiungere una Regola Auth

Modifica `determineAuthConfig()` in `src/infrastructure/driven/http/auth-strategy.ts`:

```typescript
// Aggiungi prima dei check per ruolo
if (this.isMyNewEndpoint(url)) {
  return { mode: 'mtls', usePort444: true };
}

// Aggiungi il metodo helper
private isMyNewEndpoint(url: string): boolean {
  return url.includes('/my-endpoint');
}
```

### Come Aggiungere un Nuovo Endpoint a un Repository Esistente

Pattern **Map → Call → Map**:

```typescript
// In repository implementation
async myNewOperation(input: MyInput): Promise<MyOutput> {
  const apiInput = MyMapper.toApiInput(input);              // 1. Map to API
  const response = await this.http.post('/endpoint', apiInput); // 2. HTTP call
  return MyMapper.fromApiOutput(response.data);             // 3. Map from API
}
```

Se serve validazione client-side, aggiungi Zod schema in `src/shared/validation/api/`.

### Come Debuggare Problemi Auth

1. **Abilita debug**: `createACubeSDK({ environment: 'sandbox', debug: true })`
2. **Cerca log con prefissi**:
   - `[AUTH-STRATEGY]` — decisioni auth (quale mode, quale porta)
   - `[HTTP-JWT]` — request/response JWT
   - `[HTTP-MTLS]` — request/response mTLS
   - `[MTLS-HANDLER]` — dedup, retry, cert config
   - `[SDK]` — inizializzazione
3. **Verifica ruolo e certificato**:
   ```typescript
   const user = await sdk.getCurrentUser();
   console.log('Roles:', user?.roles);
   const status = await sdk.getMTLSStatus();
   console.log('mTLS:', status);
   ```

### Checklist Prima di Completare un Task

- [ ] `bun run typecheck` — TypeScript compila senza errori
- [ ] `bun run lint` — Linter passa
- [ ] `bun run test` — Test esistenti non rotti
- [ ] Error handling implementato per ogni code path async
- [ ] Se nuovo DTO: mapping simmetrico verificato (toApi ↔ fromApi)
- [ ] Se nuovo payload: Zod schema aggiornato
- [ ] Se nuova auth rule: testato con tutti i ruoli e piattaforme

---

## Gotchas da Ricordare SEMPRE

| # | Gotcha | Impatto |
|---|--------|---------|
| 1 | Importi sono **string decimali** (`"10.50"`), MAI usare `parseFloat()` | Corruzione dati |
| 2 | Credenziali mTLS del `CashRegister` disponibili **SOLO alla creazione** | Perdita certificati |
| 3 | `testConnection()` su React Native **non e' affidabile** | False negative |
| 4 | **Web non supporta mTLS** programmatico → fallback JWT | Auth silently diversa |
| 5 | Node.js storage e' **solo in-memory** (per test, non production) | Dati persi al restart |
| 6 | Web secure storage usa **XOR** (non vera encryption) | Sicurezza limitata |
| 7 | Offline queue: **higher priority = sync prima** | Ordine controintuitivo |
| 8 | JWT expiry ha **5 minuti di buffer** | Token "scade" prima |
| 9 | Due API PEM diverse: **MF1** (operativo) vs **MF2** (creazione) | Confusione endpoint |
| 10 | `null` = "cancella campo", `undefined` = "non cambiare" | Bug su update |
| 11 | `BASE_HTTP_PORT` vs `HTTP_PORT` — il secondo puo' essere cached | Comportamento diverso |
| 12 | Request mTLS includono **anche JWT** nell'header | Doppia auth |
| 13 | `IMerchantRepository.findAll()` ritorna `Merchant[]`, non `Page<Merchant>` | Inconsistenza API |

---

## Mappa dei File Piu' Importanti

### Capire l'Architettura (leggere per primi)

| Priorita' | File | Perche' |
|-----------|------|---------|
| 1 | `src/infrastructure/driven/http/auth-strategy.ts` | Cervello dell'auth |
| 2 | `src/infrastructure/driving/sdk/acube-sdk.ts` | Init flow completo |
| 3 | `src/infrastructure/driving/sdk/di-container.ts` | DI tokens e container |
| 4 | `src/infrastructure/driving/sdk/sdk-factory.ts` | Come le dipendenze vengono registrate |
| 5 | `src/index.ts` | Cosa viene esportato |

### Capire il Domain

| File | Perche' |
|------|---------|
| `src/domain/entities/receipt.entity.ts` | Entita' piu' complessa |
| `src/domain/repositories/receipt.repository.ts` | Repository interface pattern |
| `src/domain/services/jwt-parser.service.ts` | Business logic auth |
| `src/domain/value-objects/vat-code.vo.ts` | Sistema IVA italiano |
| `src/domain/errors/mtls.error.ts` | Error pattern |

### Capire il Data Flow

| File | Perche' |
|------|---------|
| `src/application/dto/receipt.dto.ts` | DTO mapper completo |
| `src/shared/validation/api/receipts.ts` | Zod refinements |
| `src/infrastructure/driven/api/receipt.repository.impl.ts` | Pattern Map→Call→Map |

### Capire l'Infrastruttura

| File | Perche' |
|------|---------|
| `src/infrastructure/driven/http/axios-http.adapter.ts` | HTTP dual-mode |
| `src/infrastructure/driven/http/mtls-auth.handler.ts` | mTLS dedup e retry |
| `src/infrastructure/driven/cache/caching-http-decorator.ts` | Cache decorator |
| `src/infrastructure/driven/offline/sync-manager.ts` | Offline sync |
| `src/infrastructure/driven/platforms/react-native/mtls.ts` | mTLS nativo |

### Build e Config

| File | Perche' |
|------|---------|
| `package.json` | Scripts, exports, dependencies |
| `rollup.config.js` | 4 bundle, platform replacements |
| `tsconfig.json` | Strict mode config |
| `deploy.sh` | Release process |
