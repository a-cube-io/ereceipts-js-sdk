# Autenticazione JWT

L'autenticazione JWT e' la modalita' standard per la maggior parte dei casi d'uso.

## Come Funziona

1. L'utente fornisce email e password
2. L'SDK invia le credenziali al server di autenticazione
3. Il server restituisce un token JWT
4. Il token viene salvato in secure storage
5. Il token viene usato per autenticare le richieste API

## Login

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox',
});

try {
  const user = await sdk.login({
    email: 'user@example.com',
    password: 'password',
  });

  console.log('Login effettuato:', user.email);
  console.log('Ruoli:', user.roles);
} catch (error) {
  console.error('Errore login:', error.message);
}
```

## Logout

```typescript
await sdk.logout();
console.log('Logout effettuato');
```

## Verificare Autenticazione

```typescript
const isAuth = await sdk.isAuthenticated();
console.log('Autenticato:', isAuth);

const user = await sdk.getCurrentUser();
if (user) {
  console.log('Utente corrente:', user.email);
}
```

## Gestione Token

Il token JWT viene gestito automaticamente dall'SDK:

- **Salvataggio**: Il token viene salvato in `expo-secure-store`
- **Validazione**: Il token viene verificato prima di ogni richiesta
- **Scadenza**: Token scaduti vengono rimossi automaticamente

### Verifica Scadenza Token

```typescript
const user = await sdk.getCurrentUser();
if (user) {
  const expiresAt = new Date(user.expiresAt);
  const now = new Date();

  if (expiresAt > now) {
    console.log('Token valido fino a:', expiresAt);
  } else {
    console.log('Token scaduto, ri-effettuare login');
  }
}
```

## Ruoli Utente

L'utente puo' avere uno o piu' ruoli:

| Ruolo | Descrizione |
|-------|-------------|
| `superadmin` | Accesso completo al sistema |
| `administrator` | Amministratore organizzazione |
| `owner` | Proprietario esercizio |
| `manager` | Gestore punto vendita |
| `operator` | Operatore cassa |
| `readonly` | Solo lettura |

### Verifica Ruoli

```typescript
const user = await sdk.getCurrentUser();
if (user) {
  const isAdmin = user.roles.includes('administrator');
  const canOperate = user.roles.some(r =>
    ['administrator', 'owner', 'manager', 'operator'].includes(r)
  );
}
```

## Eventi di Autenticazione

```typescript
const sdk = await createACubeSDK(
  { environment: 'sandbox' },
  undefined,
  {
    onUserChanged: (user) => {
      if (user) {
        console.log('Login:', user.email);
      } else {
        console.log('Logout');
      }
    },
    onAuthError: (error) => {
      console.error('Errore auth:', error.message);
    },
  }
);
```

## Errori Comuni

### Credenziali Non Valide

```typescript
try {
  await sdk.login({ email, password });
} catch (error) {
  if (error.type === 'AUTH_ERROR') {
    console.log('Email o password non corretti');
  }
}
```

### Token Scaduto

```typescript
try {
  await sdk.receipts.findAll();
} catch (error) {
  if (error.type === 'AUTH_ERROR') {
    await sdk.logout();
    // Mostra schermata login
  }
}
```

## Prossimi Passi

- [Autenticazione mTLS](./mtls-auth.md)
- [Gestione Certificati](./certificates.md)
