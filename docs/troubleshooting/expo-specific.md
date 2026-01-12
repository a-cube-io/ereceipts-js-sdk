# Problemi Specifici Expo

Soluzioni a problemi comuni nell'ambiente Expo/React Native.

## Metro Bundler

### Errore: Unable to resolve module

```
Unable to resolve module @/domain/entities from...
```

### Soluzione

Assicurati che `metro.config.js` sia configurato correttamente:

```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

## Secure Storage

### Errore: SecureStore not available

```
Error: SecureStore is not available on this device
```

### Causa
SecureStore non disponibile in Expo Go o su simulatore.

### Soluzione

```typescript
// Verifica disponibilita
import * as SecureStore from 'expo-secure-store';

const isSecureStoreAvailable = async () => {
  try {
    await SecureStore.setItemAsync('test', 'test');
    await SecureStore.deleteItemAsync('test');
    return true;
  } catch {
    return false;
  }
};

// Usa AsyncStorage come fallback in development
if (__DEV__ && !(await isSecureStoreAvailable())) {
  console.warn('SecureStore non disponibile, usa dev build');
}
```

Per risolvere definitivamente, usa una **dev build** invece di Expo Go:

```bash
npx expo run:ios
# oppure
npx expo run:android
```

## AsyncStorage

### Errore: AsyncStorage not found

```
Error: @react-native-async-storage/async-storage not found
```

### Soluzione

```bash
npx expo install @react-native-async-storage/async-storage
```

## Network Monitor

### Problema: Stato rete non rilevato

### Soluzione

```bash
npx expo install @react-native-community/netinfo
```

```typescript
// L'SDK usa automaticamente NetInfo se disponibile
```

## Permessi iOS

### Errore: Network access denied

### Soluzione

Aggiungi in `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSExceptionDomains": {
            "api.acube.io": {
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSIncludesSubdomains": true
            }
          }
        }
      }
    }
  }
}
```

## Permessi Android

### Errore: CLEARTEXT communication not permitted

### Soluzione

In `app.json`:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": false
    }
  }
}
```

## Build Development

### Problema: SDK non funziona in Expo Go

Alcune funzionalita (mTLS, SecureStore) richiedono una dev build.

### Soluzione

```bash
# Installa EAS CLI
npm install -g eas-cli

# Configura progetto
eas build:configure

# Crea dev build iOS
eas build --profile development --platform ios

# Crea dev build Android
eas build --profile development --platform android
```

## Hot Reload

### Problema: SDK perde stato dopo hot reload

### Soluzione

```typescript
// Usa useEffect con cleanup
useEffect(() => {
  let sdk: ACubeSDK | null = null;

  const init = async () => {
    sdk = await createACubeSDK({ environment: 'sandbox' });
  };

  init();

  return () => {
    sdk?.destroy();
  };
}, []);
```

## Hermes Engine

### Problema: Errori con Hermes

L'SDK e compatibile con Hermes. Se hai problemi:

### Soluzione

Verifica `app.json`:

```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

Se persistono problemi, prova con JSC:

```json
{
  "expo": {
    "jsEngine": "jsc"
  }
}
```

## Dimensione Bundle

### Problema: Bundle troppo grande

### Soluzione

1. Usa imports specifici:

```typescript
// Invece di
import { ACubeSDK } from '@acube/ereceipt-sdk';

// Usa
import { createACubeSDK } from '@acube/ereceipt-sdk';
```

2. Verifica con bundle analyzer:

```bash
npx expo export --dump-sourcemap
npx source-map-explorer dist/bundles/ios-*.js
```

## Expo Router

### Integrazione con Expo Router

```typescript
// app/_layout.tsx
import { Slot } from 'expo-router';
import { SDKProvider } from '../src/providers/SDKProvider';

export default function RootLayout() {
  return (
    <SDKProvider>
      <Slot />
    </SDKProvider>
  );
}
```

## EAS Build

### Variabili Ambiente

```bash
# eas.json
{
  "build": {
    "production": {
      "env": {
        "ACUBE_ENV": "production"
      }
    },
    "development": {
      "env": {
        "ACUBE_ENV": "sandbox"
      }
    }
  }
}
```

```typescript
// Uso
const sdk = await createACubeSDK({
  environment: process.env.ACUBE_ENV as Environment || 'sandbox',
});
```

## Debug Console

### Vedere log SDK in Expo

```typescript
const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: true,
});

// I log appariranno nella console Metro
```

### React Native Debugger

```bash
# Installa
brew install --cask react-native-debugger

# Avvia prima del progetto
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

## Prossimi Passi

- [Debug mTLS](./mtls-debugging.md)
- [Problemi Comuni](./common-issues.md)
