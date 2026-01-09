# Setup Expo

Guida specifica per configurare l'ACube eReceipt SDK in progetti Expo.

## Expo Go vs Development Build

### Expo Go

Funzionalita' disponibili in Expo Go:

- Autenticazione JWT
- Tutte le operazioni CRUD
- Modalita' offline
- Cache locale

### Development Build (Richiesto per mTLS)

Per autenticazione mTLS con certificati e' necessario un development build:

```bash
# Genera progetto nativo
expo prebuild

# iOS
expo run:ios

# Android
expo run:android
```

## Configurazione app.json

### Configurazione Base

```json
{
  "expo": {
    "name": "MyApp",
    "slug": "my-app",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "ios": {
      "bundleIdentifier": "com.example.myapp",
      "supportsTablet": true
    },
    "android": {
      "package": "com.example.myapp",
      "adaptiveIcon": {
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

### Permessi iOS

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": false,
          "NSExceptionDomains": {
            "acube.io": {
              "NSExceptionAllowsInsecureHTTPLoads": false,
              "NSExceptionRequiresForwardSecrecy": true,
              "NSIncludesSubdomains": true
            }
          }
        }
      }
    }
  }
}
```

### Permessi Android

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

## Configurazione app.config.js

Per configurazione dinamica basata su ambiente:

```javascript
// app.config.js
export default ({ config }) => {
  const env = process.env.APP_ENV || 'sandbox';

  return {
    ...config,
    name: env === 'production' ? 'ACube POS' : `ACube POS (${env})`,
    extra: {
      eas: {
        projectId: 'your-project-id',
      },
      acube: {
        environment: env,
      },
    },
  };
};
```

## Metro Bundler

### metro.config.js

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Supporto file .mjs
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Esclusioni se necessario
config.resolver.blockList = [
  /node_modules\/.*\/node_modules\/react-native\/.*/,
];

module.exports = config;
```

## Provider React

### Creare ACubeProvider

```typescript
// providers/ACubeProvider.tsx
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Constants from 'expo-constants';
import {
  createACubeSDK,
  type ACubeSDK,
  type Environment,
  type User,
} from '@a-cube-io/ereceipts-js-sdk';

interface ACubeContextType {
  sdk: ACubeSDK | null;
  user: User | null;
  isLoading: boolean;
  isOnline: boolean;
  error: Error | null;
}

const ACubeContext = createContext<ACubeContextType>({
  sdk: null,
  user: null,
  isLoading: true,
  isOnline: true,
  error: null,
});

interface ACubeProviderProps {
  children: ReactNode;
}

export function ACubeProvider({ children }: ACubeProviderProps) {
  const [sdk, setSDK] = useState<ACubeSDK | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initSDK();
  }, []);

  async function initSDK() {
    try {
      const { acube } = Constants.expoConfig?.extra || {};

      const instance = await createACubeSDK(
        {
          environment: (acube?.environment || 'sandbox') as Environment,
          debug: __DEV__,
        },
        undefined,
        {
          onUserChanged: setUser,
          onNetworkStatusChanged: setIsOnline,
          onAuthError: (err) => console.error('Auth error:', err),
        }
      );

      setSDK(instance);

      // Verifica sessione esistente
      const currentUser = await instance.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('SDK init failed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ACubeContext.Provider value={{ sdk, user, isLoading, isOnline, error }}>
      {children}
    </ACubeContext.Provider>
  );
}

export function useACube() {
  const context = useContext(ACubeContext);
  if (!context.sdk && !context.isLoading) {
    throw new Error('useACube must be used within ACubeProvider');
  }
  return context;
}
```

### Utilizzo Provider

```typescript
// App.tsx
import { ACubeProvider } from './providers/ACubeProvider';
import { MainNavigator } from './navigation/MainNavigator';

export default function App() {
  return (
    <ACubeProvider>
      <MainNavigator />
    </ACubeProvider>
  );
}
```

### Utilizzo Hook

```typescript
// screens/HomeScreen.tsx
import { useACube } from '../providers/ACubeProvider';

export function HomeScreen() {
  const { sdk, user, isLoading, isOnline } = useACube();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <View>
      <Text>Benvenuto, {user.email}</Text>
      <Text>Stato: {isOnline ? 'Online' : 'Offline'}</Text>
    </View>
  );
}
```

## EAS Build

### eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "sandbox"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "APP_ENV": "sandbox"
      }
    },
    "production": {
      "env": {
        "APP_ENV": "production"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build
eas build --profile development --platform ios

# Preview build
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all
```

## Debugging

### Abilitare Debug Mode

```typescript
const sdk = await createACubeSDK({
  environment: 'sandbox',
  debug: __DEV__, // true solo in development
});
```

### React Native Debugger

Per ispezionare le richieste di rete, usa React Native Debugger:

```bash
# Installa
brew install react-native-debugger

# Avvia
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

## Prossimi Passi

- [Autenticazione](../authentication/overview.md)
- [API Reference](../api-reference/sdk-instance.md)
- [Esempi Completi](../examples/basic-usage.md)
