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
    onOfflineOperationAdded: (operationId) => {
      console.log('Operazione aggiunta:', operationId);
    },
    onOfflineOperationCompleted: (operationId, success) => {
      console.log('Operazione completata:', operationId, success);
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

### onOfflineOperationAdded

Emesso quando un'operazione viene aggiunta alla coda offline.

```typescript
onOfflineOperationAdded?: (operationId: string) => void;
```

**Parametri:**
- `operationId` - ID univoco dell'operazione

**Esempio:**

```typescript
onOfflineOperationAdded: (operationId) => {
  console.log('Nuova operazione offline:', operationId);
  // Aggiorna contatore UI
}
```

### onOfflineOperationCompleted

Emesso quando un'operazione offline viene completata (con successo o fallimento).

```typescript
onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
```

**Parametri:**
- `operationId` - ID dell'operazione
- `success` - `true` se completata con successo

**Esempio:**

```typescript
onOfflineOperationCompleted: (operationId, success) => {
  if (success) {
    console.log('Operazione sincronizzata:', operationId);
  } else {
    console.log('Operazione fallita:', operationId);
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
  onOfflineOperationAdded?: (operationId: string) => void;
  onOfflineOperationCompleted?: (operationId: string, success: boolean) => void;
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
            'Le operazioni verranno salvate e sincronizzate automaticamente.'
          );
        }
      },

      onOfflineOperationAdded: () => {
        // Aggiorna badge notifiche
        updateOfflineBadge();
      },

      onOfflineOperationCompleted: (_, success) => {
        if (!success) {
          Alert.alert(
            'Sincronizzazione Fallita',
            'Alcune operazioni non sono state sincronizzate.'
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
    onOfflineOperationAdded: (id) => {
      console.log('[SDK Event] Operation queued:', id);
    },
    onOfflineOperationCompleted: (id, success) => {
      console.log('[SDK Event] Operation completed:', id, success);
    },
  }
);
```

## Prossimi Passi

- [Gestione Errori](./error-handling.md)
- [Offline Mode](./offline-mode.md)
