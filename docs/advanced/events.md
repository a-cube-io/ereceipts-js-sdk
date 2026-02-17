# Eventi SDK

Sistema di eventi per monitorare lo stato dell'SDK.

## Panoramica

L'SDK emette eventi per notificare cambiamenti di stato. Gli eventi si configurano durante l'inizializzazione.

## Configurazione

```typescript
import { createACubeSDK } from '@acube/ereceipt-sdk';

const sdk = await createACubeSDK(
  {
    environment: 'sandbox',
  },
  undefined,
  {
    onUserChanged: (user) => {
      console.log('Utente cambiato:', user);
    },
    onAuthError: (error) => {
      console.log('Errore autenticazione:', error);
    },
    onNetworkStatusChanged: (online) => {
      console.log('Stato rete:', online ? 'online' : 'offline');
    },
  }
);
```

## Eventi Disponibili

### onUserChanged

Emesso quando l'utente autenticato cambia (login/logout).

```typescript
onUserChanged?: (user: User | null) => void;
```

**Parametri:**
- `user` - Oggetto utente o `null` dopo logout

**Esempio:**

```typescript
onUserChanged: (user) => {
  if (user) {
    console.log('Login:', user.email);
    // Carica dati utente
  } else {
    console.log('Logout');
    // Pulisci stato locale
  }
}
```

### onAuthError

Emesso quando si verifica un errore di autenticazione.

```typescript
onAuthError?: (error: ACubeSDKError) => void;
```

**Parametri:**
- `error` - Errore SDK con dettagli

**Esempio:**

```typescript
onAuthError: (error) => {
  console.error('Errore auth:', error.message);

  if (error.type === 'AUTH_ERROR') {
    // Reindirizza a login
  }
}
```

### onNetworkStatusChanged

Emesso quando cambia lo stato della connessione.

```typescript
onNetworkStatusChanged?: (online: boolean) => void;
```

**Parametri:**
- `online` - `true` se connesso, `false` se offline

**Esempio:**

```typescript
onNetworkStatusChanged: (online) => {
  if (online) {
    console.log('Connessione ripristinata');
    // Sincronizza dati
  } else {
    console.log('Connessione persa');
    // Mostra avviso utente
  }
}
```

## Tipi

### SDKEvents

```typescript
interface SDKEvents {
  onUserChanged?: (user: User | null) => void;
  onAuthError?: (error: ACubeSDKError) => void;
  onNetworkStatusChanged?: (online: boolean) => void;
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  roles: UserRoles;
  fid: string;
  pid: string | null;
  expiresAt: number;
}
```

## Esempi

### Gestione Completa Eventi in React Native

```typescript
import { createACubeSDK } from '@acube/ereceipt-sdk';
import { Alert } from 'react-native';

const initSDK = async () => {
  const sdk = await createACubeSDK(
    { environment: 'production' },
    undefined,
    {
      onUserChanged: (user) => {
        if (!user) {
          // Naviga a schermata login
          navigation.navigate('Login');
        }
      },

      onAuthError: (error) => {
        Alert.alert(
          'Errore Autenticazione',
          error.message,
          [{ text: 'OK' }]
        );
      },

      onNetworkStatusChanged: (online) => {
        if (!online) {
          Alert.alert(
            'Connessione Persa',
            'Nessuna connessione di rete disponibile.'
          );
        }
      },
    }
  );

  return sdk;
};
```

### Logging Eventi

```typescript
const sdk = await createACubeSDK(
  { environment: 'sandbox', debug: true },
  undefined,
  {
    onUserChanged: (user) => {
      console.log('[SDK Event] User changed:', user?.email || 'logged out');
    },
    onAuthError: (error) => {
      console.error('[SDK Event] Auth error:', error.type, error.message);
    },
    onNetworkStatusChanged: (online) => {
      console.log('[SDK Event] Network:', online ? 'online' : 'offline');
    },
  }
);
```

## Prossimi Passi

- [Gestione Errori](./error-handling.md)
