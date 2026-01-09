# Configurazione SDK

Guida alla configurazione dell'ACube eReceipt SDK.

## Opzioni di Configurazione

### SDKConfig Interface

```typescript
interface SDKConfig {
  // Ambiente target (obbligatorio)
  // Gli URL API/Auth, timeout e retry sono gestiti automaticamente dall'ambiente
  environment: 'production' | 'development' | 'sandbox';

  // Abilita logging debug (default: false)
  debug?: boolean;
}
```

## Configurazione per Ambiente

L'SDK configura automaticamente gli URL e i parametri in base all'ambiente selezionato.

### Sandbox (Sviluppo e Test)

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: true,
});
```

### Produzione

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

const sdk = await createACubeSDK({
  environment: 'production',
});
```

## Gestione Ambienti con Expo

### Usando app.config.js

```javascript
// app.config.js
export default ({ config }) => {
  const environment = process.env.APP_ENV || 'sandbox';

  return {
    ...config,
    extra: {
      acubeEnvironment: environment,
    },
  };
};
```

### Lettura Configurazione Expo

```typescript
import Constants from 'expo-constants';
import { createACubeSDK, type Environment } from '@a-cube-io/ereceipts-js-sdk';

const { acubeEnvironment } = Constants.expoConfig?.extra || {};

const sdk = await createACubeSDK({
  environment: (acubeEnvironment || 'sandbox') as Environment,
});
```

### Usando .env con expo-constants

```bash
# .env.development
APP_ENV=sandbox

# .env.production
APP_ENV=production
```

## Eventi SDK

L'SDK emette eventi per monitorare lo stato:

```typescript
const sdk = await createACubeSDK(
  {
    environment: 'sandbox',
  },
  undefined, // adapters personalizzati
  {
    // Utente cambiato (login/logout)
    onUserChanged: (user) => {
      console.log('Utente:', user?.email || 'disconnesso');
    },

    // Errore autenticazione
    onAuthError: (error) => {
      console.error('Auth error:', error.message);
    },

    // Stato rete cambiato
    onNetworkStatusChanged: (online) => {
      console.log('Online:', online);
    },

    // Operazione offline aggiunta
    onOfflineOperationAdded: (operationId) => {
      console.log('Operazione in coda:', operationId);
    },

    // Operazione offline completata
    onOfflineOperationCompleted: (operationId, success) => {
      console.log('Operazione completata:', operationId, success);
    },
  }
);
```

## Configurazione TypeScript

### tsconfig.json Consigliato

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2020", "DOM"]
  }
}
```

## Prossimi Passi

- [Setup Specifico Expo](./expo-setup.md)
- [Autenticazione](../authentication/overview.md)
- [API Reference](../api-reference/sdk-instance.md)
