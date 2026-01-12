# Installazione

Guida completa per installare l'ACube eReceipt SDK in un progetto Expo.

## Requisiti di Sistema

### Versioni Minime

| Tecnologia | Versione Minima |
|------------|-----------------|
| Node.js | 18.0+ |
| Expo SDK | 50+ |
| React Native | 0.73+ |
| TypeScript | 5.0+ |
| iOS | 13.0+ |
| Android | API 24+ |

### Requisiti Runtime

- Connessione internet per operazioni online
- Storage sicuro per token e certificati
- Accesso al filesystem per cache offline

## Installazione SDK

### Con Bun (Consigliato)

```bash
bun add @a-cube-io/ereceipts-js-sdk
```

### Con npm

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

### Con Yarn

```bash
yarn add @a-cube-io/ereceipts-js-sdk
```

## Dipendenze Peer

L'SDK richiede alcune dipendenze peer per funzionare correttamente con Expo.

### Installazione Dipendenze

```bash
expo install expo-secure-store @react-native-async-storage/async-storage
```

### Dipendenze Opzionali

Per funzionalita' mTLS (autenticazione con certificato):

```bash
expo install expo-file-system
```

Per monitoraggio stato rete:

```bash
expo install @react-native-community/netinfo
```

## Struttura Dipendenze

```json
{
  "dependencies": {
    "@a-cube-io/ereceipts-js-sdk": "^1.0.0"
  },
  "peerDependencies": {
    "expo-secure-store": ">=12.0.0",
    "@react-native-async-storage/async-storage": ">=1.19.0"
  },
  "optionalDependencies": {
    "expo-file-system": ">=16.0.0",
    "@react-native-community/netinfo": ">=11.0.0"
  }
}
```

## Verifica Installazione

Crea un file di test per verificare l'installazione:

```typescript
// test-sdk.ts
import { createACubeSDK, type SDKConfig } from '@a-cube-io/ereceipts-js-sdk';

async function testInstallation() {
  try {
    const config: SDKConfig = {
      environment: 'sandbox',
      apiUrl: 'https://api-sandbox.acube.io',
      debug: true,
    };

    const sdk = await createACubeSDK(config);
    console.log('SDK inizializzato correttamente');
    console.log('Configurazione:', sdk.getConfig());

    return true;
  } catch (error) {
    console.error('Errore inizializzazione SDK:', error);
    return false;
  }
}

testInstallation();
```

## Problemi Comuni

### Metro Bundler

Se ricevi errori di bundling, aggiungi al `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;
```

### TypeScript Path Aliases

Se usi path aliases, configura `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@acube/*": ["node_modules/@acube/*"]
    }
  }
}
```

### Expo Go Limitazioni

L'SDK funziona con Expo Go per la maggior parte delle funzionalita'.
Per mTLS e' necessario un development build:

```bash
expo prebuild
expo run:ios
# oppure
expo run:android
```

## Prossimi Passi

- [Configurazione SDK](./configuration.md)
- [Setup Specifico Expo](./expo-setup.md)
- [Autenticazione](../authentication/overview.md)
