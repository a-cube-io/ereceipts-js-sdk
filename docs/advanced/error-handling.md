# Gestione Errori

Sistema di gestione errori dell'SDK.

## ACubeSDKError

Tutti gli errori dell'SDK sono istanze di `ACubeSDKError`.

```typescript
class ACubeSDKError extends Error {
  type: SDKError;
  message: string;
  originalError?: unknown;
  statusCode?: number;
  violations?: APIViolation[];
}
```

## Tipi di Errore

### SDKError

```typescript
type SDKError =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'FORBIDDEN_ERROR'
  | 'UNKNOWN_ERROR'
  | 'STORAGE_CERTIFICATE_ERROR'
  | 'CERTIFICATE_MANAGER_NOT_INITIALIZED'
  | 'SDK_INITIALIZATION_ERROR'
  | 'SDK_NOT_INITIALIZED'
  | 'API_CLIENT_NOT_INITIALIZED'
  | 'MTLS_ADAPTER_NOT_AVAILABLE'
  | 'CERTIFICATE_INFO_ERROR';
```

### Descrizione Errori

| Tipo | Descrizione | Azione Consigliata |
|------|-------------|-------------------|
| `NETWORK_ERROR` | Errore di rete | Verifica connessione, riprova |
| `AUTH_ERROR` | Errore autenticazione | Ri-effettua login |
| `VALIDATION_ERROR` | Dati non validi | Correggi input |
| `NOT_FOUND_ERROR` | Risorsa non trovata | Verifica UUID/parametri |
| `FORBIDDEN_ERROR` | Accesso negato | Verifica permessi |
| `SDK_NOT_INITIALIZED` | SDK non inizializzato | Chiama `initialize()` |
| `MTLS_ADAPTER_NOT_AVAILABLE` | Adapter mTLS mancante | Configura certificati |

### APIViolation

Dettagli errori di validazione API.

```typescript
interface APIViolation {
  propertyPath: string;
  message: string;
}
```

## Gestione Base

```typescript
try {
  const receipt = await sdk.receipts.create({
    items: [...],
  });
} catch (error) {
  if (error instanceof ACubeSDKError) {
    switch (error.type) {
      case 'VALIDATION_ERROR':
        console.log('Errore validazione:', error.violations);
        break;
      case 'AUTH_ERROR':
        console.log('Sessione scaduta');
        await sdk.logout();
        break;
      case 'NETWORK_ERROR':
        console.log('Errore rete, operazione in coda offline');
        break;
      default:
        console.log('Errore:', error.message);
    }
  }
}
```

## Pattern di Gestione

### Gestione Errori Validazione

```typescript
try {
  await sdk.receipts.create({ items: [] });
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'VALIDATION_ERROR') {
    if (error.violations) {
      for (const violation of error.violations) {
        console.log(`Campo ${violation.propertyPath}: ${violation.message}`);
      }
    }
  }
}
```

### Gestione Errori Autenticazione

```typescript
try {
  await sdk.login({ email: 'test@example.com', password: 'wrong' });
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'AUTH_ERROR') {
    console.log('Credenziali non valide');
  }
}
```

### Gestione Errori di Rete

```typescript
try {
  await sdk.receipts.findAll({ serialNumber: 'POS-001' });
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'NETWORK_ERROR') {
    // Usa dati cached o mostra messaggio
    console.log('Impossibile connettersi al server');
  }
}
```

### Gestione SDK Non Inizializzato

```typescript
try {
  const receipt = await sdk.receipts.findById('uuid');
} catch (error) {
  if (error instanceof ACubeSDKError && error.type === 'SDK_NOT_INITIALIZED') {
    await sdk.initialize();
    // Riprova operazione
  }
}
```

## Helper Function

```typescript
function handleSDKError(error: unknown): string {
  if (!(error instanceof ACubeSDKError)) {
    return 'Errore sconosciuto';
  }

  switch (error.type) {
    case 'NETWORK_ERROR':
      return 'Verifica la connessione internet';

    case 'AUTH_ERROR':
      return 'Sessione scaduta, effettua nuovamente il login';

    case 'VALIDATION_ERROR':
      if (error.violations && error.violations.length > 0) {
        return error.violations.map(v => v.message).join(', ');
      }
      return 'Dati non validi';

    case 'NOT_FOUND_ERROR':
      return 'Risorsa non trovata';

    case 'FORBIDDEN_ERROR':
      return 'Non hai i permessi per questa operazione';

    case 'SDK_NOT_INITIALIZED':
      return 'SDK non inizializzato';

    case 'MTLS_ADAPTER_NOT_AVAILABLE':
      return 'Certificato mTLS non configurato';

    default:
      return error.message || 'Si e verificato un errore';
  }
}
```

## Esempi React Native

### Con Alert

```typescript
import { Alert } from 'react-native';
import { ACubeSDKError } from '@acube/ereceipt-sdk';

const createReceipt = async (data: ReceiptInput) => {
  try {
    const receipt = await sdk.receipts.create(data);
    Alert.alert('Successo', 'Scontrino creato');
    return receipt;
  } catch (error) {
    const message = handleSDKError(error);
    Alert.alert('Errore', message);
    return null;
  }
};
```

### Con Toast

```typescript
import Toast from 'react-native-toast-message';

const createReceipt = async (data: ReceiptInput) => {
  try {
    const receipt = await sdk.receipts.create(data);
    Toast.show({
      type: 'success',
      text1: 'Scontrino creato',
    });
    return receipt;
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Errore',
      text2: handleSDKError(error),
    });
    return null;
  }
};
```

## Logging Errori

```typescript
const logError = (context: string, error: unknown) => {
  if (error instanceof ACubeSDKError) {
    console.error(`[${context}] SDK Error:`, {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      violations: error.violations,
    });
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }
};

// Uso
try {
  await sdk.receipts.create({ items: [...] });
} catch (error) {
  logError('createReceipt', error);
  throw error;
}
```

## Prossimi Passi

- [Eventi SDK](./events.md)
- [Tipi TypeScript](./types.md)
