# App Expo Completa

Esempio di integrazione completa dell'SDK in un'app Expo.

## Struttura Progetto

```
app/
├── App.tsx
├── src/
│   ├── providers/
│   │   └── SDKProvider.tsx
│   ├── hooks/
│   │   └── useSDK.ts
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   └── ReceiptScreen.tsx
│   └── services/
│       └── sdk.ts
```

## Provider SDK

```typescript
// src/providers/SDKProvider.tsx
import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { ACubeSDK, createACubeSDK, User } from '@acube/ereceipt-sdk';
import Toast from 'react-native-toast-message';

interface SDKContextType {
  sdk: ACubeSDK | null;
  user: User | null;
  isLoading: boolean;
  isOnline: boolean;
}

export const SDKContext = createContext<SDKContextType>({
  sdk: null,
  user: null,
  isLoading: true,
  isOnline: true,
});

interface Props {
  children: ReactNode;
}

export const SDKProvider: React.FC<Props> = ({ children }) => {
  const [sdk, setSDK] = useState<ACubeSDK | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const instance = await createACubeSDK(
          {
            environment: __DEV__ ? 'sandbox' : 'production',
            debug: __DEV__,
          },
          undefined,
          {
            onUserChanged: (newUser) => {
              setUser(newUser);
            },
            onAuthError: (error) => {
              Toast.show({
                type: 'error',
                text1: 'Errore Autenticazione',
                text2: error.message,
              });
            },
            onNetworkStatusChanged: (online) => {
              setIsOnline(online);
              Toast.show({
                type: online ? 'success' : 'info',
                text1: online ? 'Online' : 'Offline',
                text2: online
                  ? 'Connessione ripristinata'
                  : 'Modalita offline attiva',
              });
            },
            onOfflineOperationCompleted: (_, success) => {
              if (success) {
                Toast.show({
                  type: 'success',
                  text1: 'Sincronizzato',
                  text2: 'Operazione completata',
                });
              }
            },
          }
        );

        setSDK(instance);

        // Verifica autenticazione esistente
        const currentUser = await instance.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Errore inizializzazione SDK:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initSDK();

    return () => {
      sdk?.destroy();
    };
  }, []);

  return (
    <SDKContext.Provider value={{ sdk, user, isLoading, isOnline }}>
      {children}
    </SDKContext.Provider>
  );
};
```

## Hook useSDK

```typescript
// src/hooks/useSDK.ts
import { useContext } from 'react';
import { SDKContext } from '../providers/SDKProvider';

export const useSDK = () => {
  const context = useContext(SDKContext);

  if (!context.sdk) {
    throw new Error('SDK non inizializzato');
  }

  return context;
};
```

## App.tsx

```typescript
// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import { SDKProvider } from './src/providers/SDKProvider';
import { useSDK } from './src/hooks/useSDK';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReceiptScreen from './src/screens/ReceiptScreen';

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { user, isLoading } = useSDK();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <SDKProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
      <Toast />
    </SDKProvider>
  );
}
```

## Schermata Login

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSDK } from '../hooks/useSDK';
import { ACubeSDKError } from '@acube/ereceipt-sdk';

export default function LoginScreen() {
  const { sdk } = useSDK();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await sdk.login({ email, password });
      Toast.show({
        type: 'success',
        text1: 'Benvenuto',
      });
    } catch (error) {
      if (error instanceof ACubeSDKError) {
        Toast.show({
          type: 'error',
          text1: 'Errore Login',
          text2: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? 'Accesso...' : 'Accedi'}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
});
```

## Schermata Home

```typescript
// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSDK } from '../hooks/useSDK';
import { Receipt, Page } from '@acube/ereceipt-sdk';

export default function HomeScreen({ navigation }) {
  const { sdk, isOnline } = useSDK();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    try {
      const page = await sdk.receipts.findAll({
        serialNumber: 'POS-001',
        size: 20,
        sort: 'descending',
      });
      setReceipts(page.members);
    } catch (error) {
      console.error('Errore caricamento scontrini:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderReceipt = ({ item }: { item: Receipt }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('Receipt', { uuid: item.uuid })}
    >
      <Text style={styles.docNumber}>{item.documentNumber}</Text>
      <Text style={styles.amount}>{item.totalAmount} EUR</Text>
      <Text style={styles.type}>{item.type}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Modalita Offline</Text>
        </View>
      )}
      <FlatList
        data={receipts}
        renderItem={renderReceipt}
        keyExtractor={(item) => item.uuid}
        refreshing={loading}
        onRefresh={loadReceipts}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Receipt', { create: true })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    backgroundColor: '#f0ad4e',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  docNumber: {
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 18,
    color: '#333',
  },
  type: {
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
  },
});
```

## Schermata Scontrino

```typescript
// src/screens/ReceiptScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { useSDK } from '../hooks/useSDK';
import { ReceiptItem, ACubeSDKError } from '@acube/ereceipt-sdk';

export default function ReceiptScreen({ navigation, route }) {
  const { sdk, isOnline } = useSDK();
  const [items, setItems] = useState<Partial<ReceiptItem>[]>([
    { description: '', quantity: '1', unitPrice: '', vatRateCode: '22' },
  ]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([
      ...items,
      { description: '', quantity: '1', unitPrice: '', vatRateCode: '22' },
    ]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const createReceipt = async () => {
    setLoading(true);
    try {
      const validItems = items.filter(
        (item) => item.description && item.unitPrice
      ) as ReceiptItem[];

      if (validItems.length === 0) {
        Toast.show({
          type: 'error',
          text1: 'Errore',
          text2: 'Aggiungi almeno un articolo',
        });
        return;
      }

      if (!isOnline) {
        // Accoda per sincronizzazione offline
        const offlineManager = sdk.getOfflineManager();
        await offlineManager.queueReceiptCreation({ items: validItems });
        Toast.show({
          type: 'info',
          text1: 'Salvato Offline',
          text2: 'Verra sincronizzato automaticamente',
        });
      } else {
        const receipt = await sdk.receipts.create({ items: validItems });
        Toast.show({
          type: 'success',
          text1: 'Scontrino Creato',
          text2: receipt.documentNumber,
        });
      }

      navigation.goBack();
    } catch (error) {
      if (error instanceof ACubeSDKError) {
        Toast.show({
          type: 'error',
          text1: 'Errore',
          text2: error.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <TextInput
            style={styles.input}
            placeholder="Descrizione"
            value={item.description}
            onChangeText={(v) => updateItem(index, 'description', v)}
          />
          <TextInput
            style={[styles.input, styles.smallInput]}
            placeholder="Qta"
            value={item.quantity}
            onChangeText={(v) => updateItem(index, 'quantity', v)}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.smallInput]}
            placeholder="Prezzo"
            value={item.unitPrice}
            onChangeText={(v) => updateItem(index, 'unitPrice', v)}
            keyboardType="decimal-pad"
          />
        </View>
      ))}
      <Button title="+ Aggiungi Articolo" onPress={addItem} />
      <View style={styles.spacer} />
      <Button
        title={loading ? 'Creazione...' : 'Crea Scontrino'}
        onPress={createReceipt}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  smallInput: {
    flex: 0.3,
  },
  spacer: {
    height: 16,
  },
});
```

## Prossimi Passi

- [Flusso Scontrini](./receipts-flow.md)
- [Attivazione POS](./pos-activation.md)
