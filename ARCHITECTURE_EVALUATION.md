# ACube SDK - Architecture Evaluation

## Current State Analysis for Hexagonal Architecture Migration

---

## 1. Project Overview

| Property | Value |
|----------|-------|
| **Name** | @a-cube-io/ereceipts-js-sdk |
| **Version** | 0.1.0 |
| **Total Files** | ~82 TypeScript files |
| **Lines of Code** | ~12,732 |
| **Platforms** | Web, Node.js, React Native, Expo |
| **Package Manager** | Bun |

---

## 2. Current Folder Structure

```
src/
├── acube-sdk.ts          # Main SDK orchestrator (GOD CLASS)
├── index.ts              # Barrel exports
├── adapters/             # Platform abstraction interfaces
├── cache/                # Cache management
├── core/                 # Core functionality (MIXED CONCERNS)
│   ├── api/              # API clients
│   ├── http/             # HTTP layer
│   ├── certificates/     # Certificate management
│   └── loaders/          # Adapter loaders
├── offline/              # Offline queue system
├── platforms/            # Platform implementations
│   ├── node/
│   ├── web/
│   └── react-native/
├── react/                # React integration
├── types/                # Type definitions
├── utils/                # Utilities
└── validations/          # Zod schemas
```

---

## 3. Current Architecture Patterns

### Patterns Already in Use

| Pattern | Implementation | Hexagonal Alignment |
|---------|---------------|---------------------|
| **Adapter Pattern** | `src/adapters/` interfaces | Good - maps to Driven Adapters |
| **Facade Pattern** | `ACubeSDK`, `APIClient` | Partial - could be Application Services |
| **Manager Pattern** | Auth, Certificate, Offline, Cache | Mixed - needs separation |
| **Handler Pattern** | MTLS, Cache, Error handlers | Good - maps to Ports |
| **Queue Pattern** | Offline operations | Good - Infrastructure concern |

### Current Dependency Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ACubeSDK (Entry)                       │
├─────────────────────────────────────────────────────────────┤
│  ConfigManager │ AuthManager │ APIClient │ OfflineManager   │
├─────────────────────────────────────────────────────────────┤
│  HttpClient │ MTLSHandler │ CacheHandler │ ErrorTransformer │
├─────────────────────────────────────────────────────────────┤
│      PlatformAdapters (Storage, Network, Cache, MTLS)       │
├─────────────────────────────────────────────────────────────┤
│         Platform Implementations (Node, Web, RN)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Module Analysis

### 4.1 Core Module (`src/core/`) - NEEDS REFACTORING

**Current State**: Mixed responsibilities

| Component | Current Role | Hexagonal Mapping |
|-----------|-------------|-------------------|
| `types.ts` | Central types | Domain Layer |
| `config.ts` | Configuration | Application Config |
| `auth-manager.ts` | JWT handling | Application Service + Port |
| `api/*.ts` | API resources | Application Services |
| `http/*.ts` | HTTP layer | Driven Adapter |
| `certificates/*.ts` | Cert management | Domain + Infrastructure |

**Issues**:
- Domain logic mixed with infrastructure
- API clients contain business rules
- No clear domain boundary

### 4.2 Adapters Module (`src/adapters/`) - GOOD

**Current State**: Well-defined interfaces

| Interface | Purpose | Hexagonal Role |
|-----------|---------|----------------|
| `IStorage` | Key-value persistence | Driven Port |
| `ISecureStorage` | Encrypted storage | Driven Port |
| `INetworkMonitor` | Network status | Driven Port |
| `ICacheAdapter` | Caching | Driven Port |
| `IMTLSAdapter` | mTLS requests | Driven Port |

**Assessment**: Already follows Port pattern - minimal changes needed

### 4.3 Platforms Module (`src/platforms/`) - GOOD

**Current State**: Platform-specific implementations

| Platform | Implementation |
|----------|---------------|
| `node/` | Node.js adapters |
| `web/` | Browser adapters |
| `react-native/` | RN/Expo adapters |

**Assessment**: Already implements Driven Adapters - minimal changes needed

### 4.4 Offline Module (`src/offline/`) - PARTIAL

**Current State**: Queue and sync management

| Component | Current Role | Issue |
|-----------|-------------|-------|
| `queue.ts` | Operation storage | Infrastructure concern in domain |
| `sync-manager.ts` | Sync coordination | Mixed concerns |
| `offline-manager.ts` | High-level API | Could be Application Service |

**Assessment**: Domain logic should be extracted

### 4.5 React Module (`src/react/`) - GOOD

**Current State**: Framework adapter

**Assessment**: Already a Driving Adapter - minimal changes needed

---

## 5. Hexagonal Architecture Mapping

### Proposed Structure

```
src/
├── domain/                    # CORE (Pure business logic)
│   ├── entities/
│   │   ├── receipt.ts
│   │   ├── cashier.ts
│   │   ├── merchant.ts
│   │   └── user.ts
│   ├── value-objects/
│   │   ├── money.ts
│   │   ├── certificate-info.ts
│   │   └── operation-status.ts
│   ├── repositories/          # Repository interfaces (Ports)
│   │   ├── receipt.repository.ts
│   │   ├── cashier.repository.ts
│   │   └── offline-queue.repository.ts
│   ├── services/              # Domain services
│   │   ├── receipt.service.ts
│   │   ├── sync.service.ts
│   │   └── auth.service.ts
│   └── events/
│       └── domain-events.ts
│
├── application/               # USE CASES
│   ├── ports/
│   │   ├── driving/           # Input ports (APIs)
│   │   │   ├── receipt.use-case.ts
│   │   │   ├── auth.use-case.ts
│   │   │   └── sync.use-case.ts
│   │   └── driven/            # Output ports (Interfaces)
│   │       ├── storage.port.ts
│   │       ├── http.port.ts
│   │       ├── network.port.ts
│   │       └── cache.port.ts
│   ├── services/              # Application services
│   │   ├── receipt.app-service.ts
│   │   ├── offline.app-service.ts
│   │   └── certificate.app-service.ts
│   └── dto/
│       ├── receipt.dto.ts
│       └── response.dto.ts
│
├── infrastructure/            # ADAPTERS
│   ├── driving/               # Primary adapters (input)
│   │   ├── sdk/
│   │   │   └── acube-sdk.ts
│   │   ├── react/
│   │   │   ├── context.tsx
│   │   │   └── hooks/
│   │   └── cli/               # Future CLI adapter
│   │
│   └── driven/                # Secondary adapters (output)
│       ├── persistence/
│       │   ├── storage/
│       │   │   ├── node-storage.adapter.ts
│       │   │   ├── web-storage.adapter.ts
│       │   │   └── rn-storage.adapter.ts
│       │   └── cache/
│       │       ├── indexeddb-cache.adapter.ts
│       │       └── sqlite-cache.adapter.ts
│       ├── http/
│       │   ├── axios-http.adapter.ts
│       │   └── mtls-http.adapter.ts
│       ├── network/
│       │   ├── node-network.adapter.ts
│       │   ├── web-network.adapter.ts
│       │   └── rn-network.adapter.ts
│       └── api/
│           └── acube-api.adapter.ts
│
├── shared/                    # Cross-cutting concerns
│   ├── config/
│   ├── errors/
│   ├── utils/
│   └── validation/
│
└── index.ts                   # Entry point
```

---

## 6. Gap Analysis

### What's Already Hexagonal

| Component | Status | Notes |
|-----------|--------|-------|
| Adapter interfaces | Ready | `src/adapters/` already defines ports |
| Platform implementations | Ready | Already driven adapters |
| React integration | Ready | Already driving adapter |
| Validation schemas | Ready | Can stay in shared |

### What Needs Refactoring

| Current | Issue | Target |
|---------|-------|--------|
| `acube-sdk.ts` | God class, mixed concerns | Split into driving adapter + app services |
| `core/api/*.ts` | Mixed domain + infra | Extract domain services |
| `core/http/*.ts` | Coupled to axios | Abstract behind port |
| `auth-manager.ts` | Mixed concerns | Domain service + app service |
| `offline/*.ts` | Domain in infrastructure | Extract domain logic |
| `core/types.ts` | Flat structure | Split entities/value-objects |

---

## 7. Migration Effort Estimate

### Phase 1: Foundation (Low Risk)
- Create folder structure
- Move adapters → infrastructure/driven
- Move react → infrastructure/driving
- Create shared module

### Phase 2: Domain Extraction (Medium Risk)
- Extract entities from types
- Create repository interfaces
- Define domain services
- Extract value objects

### Phase 3: Application Layer (Medium Risk)
- Create use cases
- Define ports
- Refactor managers → app services
- Create DTOs

### Phase 4: Refactor Infrastructure (High Risk)
- Refactor ACubeSDK
- Abstract HTTP client
- Refactor offline module
- Update all imports

### Complexity Matrix

| Phase | Files Affected | Risk | Effort |
|-------|---------------|------|--------|
| Phase 1 | ~20 | Low | 2-3 days |
| Phase 2 | ~15 | Medium | 3-5 days |
| Phase 3 | ~25 | Medium | 5-7 days |
| Phase 4 | ~30 | High | 7-10 days |
| **Total** | ~82 | - | **17-25 days** |

---

## 8. Benefits of Migration

### Pros

| Benefit | Description |
|---------|-------------|
| **Testability** | Domain logic testable without infrastructure |
| **Flexibility** | Easy to swap adapters (e.g., axios → fetch) |
| **Maintainability** | Clear boundaries reduce coupling |
| **Scalability** | Easy to add new platforms/features |
| **DDD Ready** | Foundation for domain-driven design |

### Cons

| Drawback | Mitigation |
|----------|-----------|
| **More files** | Clear naming conventions |
| **Learning curve** | Documentation + examples |
| **Initial overhead** | Long-term maintenance benefit |
| **Migration risk** | Incremental approach |

---

## 9. Recommendations

### Option A: Full Migration
- Complete hexagonal refactor
- Best for long-term maintainability
- Higher initial investment

### Option B: Partial Migration
- Extract domain layer only
- Keep current infrastructure
- Lower risk, moderate benefit

### Option C: Incremental Migration
- Start with new features in hexagonal
- Gradually migrate existing code
- Balanced approach

### Suggested Approach: Option C (Incremental)

1. **Immediately**: Create `domain/` folder for new entities
2. **Next sprint**: Abstract HTTP behind port
3. **Following sprints**: Migrate one module at a time
4. **Ongoing**: All new features follow hexagonal

---

## 10. Current Architecture Score

| Criterion | Score (1-10) | Notes |
|-----------|-------------|-------|
| Separation of Concerns | 6 | Good adapters, mixed core |
| Testability | 5 | Managers hard to test in isolation |
| Dependency Direction | 7 | Generally good, some violations |
| Port/Adapter Pattern | 7 | Adapters exist, ports implicit |
| Domain Isolation | 4 | Domain mixed with infrastructure |
| **Overall** | **5.8/10** | Good foundation, needs domain extraction |

---

## 11. Quick Wins (No Breaking Changes)

1. Create `domain/entities/` and move types
2. Create `application/ports/` with existing interfaces
3. Add barrel exports for new structure
4. Document module boundaries

---

## 12. Conclusion

The ACube SDK has a **solid foundation** for hexagonal architecture with:
- Well-defined adapter interfaces
- Platform-specific implementations
- Clear module boundaries

**Key gaps** to address:
- Domain logic extraction from `core/`
- ACubeSDK god class decomposition
- Explicit port definitions

**Recommended path**: Incremental migration starting with domain extraction, maintaining backward compatibility throughout the process.
