# ACubeSDK Reference

Riferimento completo dell'istanza principale SDK.

## Creazione SDK

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: true,
});
```

## Configurazione

### SDKConfig

```typescript
interface SDKConfig {
  environment: 'production' | 'development' | 'sandbox';
  debug?: boolean;
}
```

| Proprieta' | Tipo | Obbligatorio | Default | Descrizione |
|------------|------|--------------|---------|-------------|
| `environment` | `Environment` | Si | - | Ambiente target |
| `debug` | `boolean` | No | `false` | Abilita logging debug |

## Repository Disponibili

L'SDK espone i seguenti repository:

| Proprieta' | Tipo | Descrizione |
|------------|------|-------------|
| `sdk.receipts` | `IReceiptRepository` | Gestione scontrini |
| `sdk.merchants` | `IMerchantRepository` | Gestione esercenti |
| `sdk.cashiers` | `ICashierRepository` | Gestione cassieri |
| `sdk.cashRegisters` | `ICashRegisterRepository` | Gestione registratori |
| `sdk.pointOfSales` | `IPointOfSaleRepository` | Gestione POS |
| `sdk.suppliers` | `ISupplierRepository` | Gestione fornitori |
| `sdk.pems` | `IPemRepository` | Gestione PEM |
| `sdk.dailyReports` | `IDailyReportRepository` | Report giornalieri |
| `sdk.journals` | `IJournalRepository` | Gestione giornali |

## Metodi Autenticazione

### login(credentials)

Effettua il login con email e password.

```typescript
const user = await sdk.login({
  email: 'user@example.com',
  password: 'password',
});
```

**Parametri:**
- `credentials.email` - Email utente
- `credentials.password` - Password utente

**Ritorna:** `Promise<User>`

### logout()

Effettua il logout e rimuove i token salvati.

```typescript
await sdk.logout();
```

**Ritorna:** `Promise<void>`

### getCurrentUser()

Ottiene l'utente corrente se autenticato.

```typescript
const user = await sdk.getCurrentUser();
```

**Ritorna:** `Promise<User | null>`

### isAuthenticated()

Verifica se l'utente e' autenticato.

```typescript
const isAuth = await sdk.isAuthenticated();
```

**Ritorna:** `Promise<boolean>`

## Metodi Certificati

### storeCertificate(certificate, privateKey, options?)

Salva un certificato per mTLS.

```typescript
await sdk.storeCertificate(cert, key, {
  format: 'pem',
});
```

**Parametri:**
- `certificate` - Contenuto certificato
- `privateKey` - Chiave privata
- `options.format` - Formato: `'pem'` | `'p12'`

**Ritorna:** `Promise<void>`

### clearCertificate()

Rimuove il certificato salvato.

```typescript
await sdk.clearCertificate();
```

**Ritorna:** `Promise<void>`

### hasCertificate()

Verifica se e' presente un certificato.

```typescript
const hasCert = await sdk.hasCertificate();
```

**Ritorna:** `Promise<boolean>`

### getCertificateInfo()

Ottiene informazioni sul certificato.

```typescript
const info = await sdk.getCertificateInfo();
```

**Ritorna:** `Promise<CertificateInfo | null>`

### getMTLSStatus()

Ottiene lo stato completo mTLS.

```typescript
const status = await sdk.getMTLSStatus();
```

**Ritorna:** `Promise<MTLSStatus>`

```typescript
interface MTLSStatus {
  adapterAvailable: boolean;
  isReady: boolean;
  hasCertificate: boolean;
  certificateInfo: CertificateInfo | null;
  platformInfo: PlatformInfo | null;
}
```

### testMTLSConnection()

Testa la connessione mTLS.

```typescript
const ok = await sdk.testMTLSConnection();
```

**Ritorna:** `Promise<boolean>`

## Metodi Utility

### isOnline()

Verifica lo stato di connessione.

```typescript
const online = sdk.isOnline();
```

**Ritorna:** `boolean`

### getConfig()

Ottiene la configurazione corrente.

```typescript
const config = sdk.getConfig();
```

**Ritorna:** `SDKConfig`

### updateConfig(updates)

Aggiorna la configurazione.

```typescript
sdk.updateConfig({ debug: true });
```

**Parametri:**
- `updates` - Aggiornamenti parziali configurazione

**Ritorna:** `void`

### getOfflineManager()

Ottiene il gestore operazioni offline.

```typescript
const offlineManager = sdk.getOfflineManager();
```

**Ritorna:** `OfflineManager`

### destroy()

Distrugge l'istanza SDK e libera risorse.

```typescript
sdk.destroy();
```

**Ritorna:** `void`

## Eventi SDK

```typescript
const sdk = await createACubeSDK(
  { environment: 'sandbox' },
  undefined,
  {
    onUserChanged: (user) => { },
    onAuthError: (error) => { },
    onNetworkStatusChanged: (online) => { },
    onOfflineOperationAdded: (operationId) => { },
    onOfflineOperationCompleted: (operationId, success) => { },
  }
);
```

| Evento | Parametri | Descrizione |
|--------|-----------|-------------|
| `onUserChanged` | `user: User \| null` | Utente cambiato |
| `onAuthError` | `error: ACubeSDKError` | Errore autenticazione |
| `onNetworkStatusChanged` | `online: boolean` | Stato rete cambiato |
| `onOfflineOperationAdded` | `operationId: string` | Operazione offline aggiunta |
| `onOfflineOperationCompleted` | `operationId: string, success: boolean` | Operazione completata |

## Tipi Comuni

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRole[];
  fid: string;
  pid: string | null;
  expiresAt: number;
}
```

### Page<T>

```typescript
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

### ACubeSDKError

```typescript
class ACubeSDKError extends Error {
  type: SDKError;
  message: string;
  originalError?: unknown;
  statusCode?: number;
  violations?: APIViolation[];
}
```

## Prossimi Passi

- [Receipt API](./receipts.md)
- [Merchant API](./merchants.md)
