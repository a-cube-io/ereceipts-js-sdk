# Autenticazione

L'ACube eReceipt SDK supporta due modalita' di autenticazione:

1. **JWT (JSON Web Token)** - Per autenticazione con email/password
2. **mTLS (Mutual TLS)** - Per autenticazione con certificato client

## Modalita' di Autenticazione

### JWT Authentication

Modalita' standard per la maggior parte dei casi d'uso:

- Login con email e password
- Token JWT salvato in secure storage
- Refresh automatico del token
- Compatibile con Expo Go

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox',
});

const user = await sdk.login({
  email: 'user@example.com',
  password: 'password',
});
```

### mTLS Authentication

Per operazioni che richiedono autenticazione con certificato:

- Richiede certificato client (.pem o .p12)
- Connessione su porta 444
- Richiede development build (non Expo Go)
- Maggiore sicurezza per operazioni critiche

```typescript
await sdk.storeCertificate(certificate, privateKey, {
  format: 'pem',
});

const mtlsStatus = await sdk.getMTLSStatus();
console.log('mTLS Ready:', mtlsStatus.isReady);
```

## Quale Modalita' Usare?

| Scenario | Modalita' Consigliata |
|----------|----------------------|
| Sviluppo/Test | JWT |
| Expo Go | JWT |
| Operazioni standard | JWT |
| Operazioni PEM/Fiscali | mTLS |
| Produzione con certificato | mTLS |

## Flusso di Autenticazione

```
┌─────────────────────────────────────────────────────────┐
│                    App Startup                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              SDK Initialization                          │
│   - Carica adapters piattaforma                         │
│   - Verifica token esistente                            │
│   - Configura certificato se presente                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   Token esistente?     │
              └────────────────────────┘
                    │           │
                   Yes          No
                    │           │
                    ▼           ▼
           ┌──────────────┐  ┌──────────────┐
           │ Verifica     │  │ Login        │
           │ scadenza     │  │ richiesto    │
           └──────────────┘  └──────────────┘
                    │
                    ▼
              ┌────────────────────────┐
              │    Token valido?       │
              └────────────────────────┘
                    │           │
                   Yes          No
                    │           │
                    ▼           ▼
           ┌──────────────┐  ┌──────────────┐
           │ Utente       │  │ Logout       │
           │ autenticato  │  │ automatico   │
           └──────────────┘  └──────────────┘
```

## User Object

Dopo il login, l'SDK fornisce un oggetto `User`:

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;  // Ruoli per dominio
  fid: string;
  pid: string | null;
  expiresAt: number;
}

type UserRole = 'ROLE_SUPPLIER' | 'ROLE_CASHIER' | 'ROLE_MERCHANT';
type Domain = 'ereceipts-it.acubeapi.com';
type UserRoles = Record<Domain, UserRole[]>;
```

### Ruoli e Permessi

| Ruolo | Descrizione | Polling |
|-------|-------------|---------|
| **ROLE_MERCHANT** | Proprietario/gestore attivita' | Notifiche + Telemetria |
| **ROLE_CASHIER** | Operatore cassa | Notifiche + Telemetria |
| **ROLE_SUPPLIER** | Fornitore | Solo Network State |

> **Nota**: Gli utenti SUPPLIER non hanno accesso agli endpoint di notifiche e telemetria. L'SDK disabilita automaticamente il polling per questi utenti.

## Eventi di Autenticazione

L'SDK notifica i cambiamenti di stato autenticazione:

```typescript
const sdk = await createACubeSDK(
  { environment: 'sandbox' },
  undefined,
  {
    onUserChanged: (user) => {
      if (user) {
        console.log('Utente loggato:', user.email);
      } else {
        console.log('Utente disconnesso');
      }
    },
    onAuthError: (error) => {
      console.error('Errore autenticazione:', error.message);
    },
  }
);
```

## Prossimi Passi

- [Autenticazione JWT](./jwt-auth.md)
- [Autenticazione mTLS](./mtls-auth.md)
- [Gestione Certificati](./certificates.md)
