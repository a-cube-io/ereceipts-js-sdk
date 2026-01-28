# Notifiche e Telemetria - Esempio Expo

Esempio completo di un'applicazione Expo che utilizza il sistema di notifiche e telemetria dell'SDK ACube per gestire gli stati dell'app (NORMAL, WARNING, BLOCKED, OFFLINE).

## Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP EXPO                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SDKManager                            │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │   │
│  │   │ Notification │  │  Telemetry  │  │   AppState      │ │   │
│  │   │   Service   │──▶│   Service   │  │   Service       │ │   │
│  │   └─────────────┘  └─────────────┘  └─────────────────┘ │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    UI STATE                               │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  NORMAL          WARNING           BLOCKED      OFFLINE   │  │
│  │  ┌─────┐        ┌─────────┐       ┌────────┐   ┌───────┐ │  │
│  │  │ App │        │ Banner  │       │Telemetry│  │Cached │ │  │
│  │  │Full │        │ Warning │       │  Only   │  │Telemetry│ │  │
│  │  │     │        ├─────────┤       │  View   │  │ View  │ │  │
│  │  │     │        │   App   │       │         │  │       │ │  │
│  │  └─────┘        └─────────┘       └────────┘   └───────┘ │  │
│  │  SYS-I-01       SYS-W-01          SYS-C-01    No Network │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Stati App

| Stato | Trigger | UI | Azioni Permesse |
|-------|---------|-----|-----------------|
| `NORMAL` | SYS-I-01 o default | App completa | Tutto |
| `WARNING` | SYS-W-01 | Banner countdown + App | Tutto |
| `BLOCKED` | SYS-C-01 | Solo Telemetry fullscreen | Solo lettura telemetry |
| `OFFLINE` | No network | Telemetry cached | Solo lettura |

## Implementazione con SDKManager

### 1. Context Provider (Semplificato)

```typescript
// src/contexts/ACubeContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  SDKManager,
  type AppState,
  type TelemetryState,
  type ManagedServices,
} from '@a-cube-io/ereceipts-js-sdk';

interface ACubeContextValue {
  isReady: boolean;
  appState: AppState | null;
  telemetryState: TelemetryState | null;
  services: ManagedServices | null;
}

const ACubeContext = createContext<ACubeContextValue | null>(null);

export function ACubeProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [telemetryState, setTelemetryState] = useState<TelemetryState | null>(null);

  useEffect(() => {
    // Configura SDK (una volta)
    if (!SDKManager.isConfigured()) {
      SDKManager.configure({
        environment: 'sandbox',
        notificationPollIntervalMs: 30000,
        telemetryCacheTtlMs: 300000,
      });
    }

    const manager = SDKManager.getInstance();

    // Inizializza e sottoscrivi
    manager.initialize().then(() => {
      const appSub = manager.appState$.subscribe(setAppState);
      const teleSub = manager.telemetryState$.subscribe(setTelemetryState);
      setIsReady(true);

      return () => {
        appSub.unsubscribe();
        teleSub.unsubscribe();
      };
    });

    return () => {
      SDKManager.destroy();
    };
  }, []);

  return (
    <ACubeContext.Provider
      value={{
        isReady,
        appState,
        telemetryState,
        services: isReady ? SDKManager.getInstance().getServices() : null,
      }}
    >
      {children}
    </ACubeContext.Provider>
  );
}

export function useACube() {
  const context = useContext(ACubeContext);
  if (!context) {
    throw new Error('useACube must be used within ACubeProvider');
  }
  return context;
}
```

### 2. Hooks Specifici

```typescript
// src/hooks/useAppState.ts
import { useACube } from '../contexts/ACubeContext';
import type { AppMode } from '@a-cube-io/ereceipts-js-sdk';

export function useAppState() {
  const { appState } = useACube();

  const mode = appState?.mode ?? ('NORMAL' as AppMode);
  const warning = appState?.warning ?? { active: false, blockAt: null, remainingMs: 0 };

  const formattedCountdown = warning.active
    ? formatCountdown(warning.remainingMs)
    : null;

  return {
    mode,
    isOnline: appState?.isOnline ?? true,
    warning,
    isBlocked: mode === 'BLOCKED',
    isOffline: mode === 'OFFLINE',
    isWarning: mode === 'WARNING',
    isNormal: mode === 'NORMAL',
    canUseApp: mode === 'NORMAL' || mode === 'WARNING',
    formattedCountdown,
  };
}

function formatCountdown(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
```

```typescript
// src/hooks/useTelemetry.ts
import { useACube } from '../contexts/ACubeContext';

export function useTelemetry() {
  const { services, telemetryState } = useACube();

  return {
    state: telemetryState,
    data: telemetryState?.data ?? null,
    isCached: telemetryState?.isCached ?? false,
    isLoading: telemetryState?.isLoading ?? false,
    error: telemetryState?.error,
    fetchTelemetry: (pemId: string) => services?.telemetry.getTelemetry(pemId),
    refreshTelemetry: (pemId: string) => services?.telemetry.refreshTelemetry(pemId),
  };
}
```

### 3. Componente Warning Banner

```typescript
// src/components/WarningBanner.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useAppState } from '../hooks/useAppState';

export function WarningBanner() {
  const { isWarning, formattedCountdown, warning } = useAppState();

  if (!isWarning || !warning.active) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.icon}>!</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Attenzione</Text>
          <Text style={styles.message}>
            L'app verra' bloccata tra {formattedCountdown}
          </Text>
        </View>
      </View>
      <View style={styles.countdown}>
        <Text style={styles.countdownText}>{formattedCountdown}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: '#92400e',
  },
  message: {
    color: '#a16207',
    fontSize: 12,
  },
  countdown: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countdownText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
```

### 4. Schermata Blocked

```typescript
// src/screens/BlockedScreen.tsx
import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useTelemetry } from '../hooks/useTelemetry';

interface Props {
  pemId: string;
}

export function BlockedScreen({ pemId }: Props) {
  const { data, isLoading, isCached, error, fetchTelemetry, refreshTelemetry } = useTelemetry();

  useEffect(() => {
    fetchTelemetry?.(pemId);
  }, [pemId, fetchTelemetry]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.blockedTitle}>App Bloccata</Text>
        <Text style={styles.blockedMessage}>
          Contatta il supporto per sbloccare l'applicazione
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refreshTelemetry?.(pemId)}
          />
        }
      >
        {isCached && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheText}>
              Dati dalla cache - Ultimo aggiornamento disponibile
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>Errore: {error}</Text>
          </View>
        )}

        {isLoading && !data ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : data ? (
          <View style={styles.telemetryCard}>
            <View style={styles.statusRow}>
              <Text style={styles.label}>Stato PEM:</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: data.pemStatus === 'ONLINE' ? '#22c55e' : '#ef4444' },
                ]}
              >
                <Text style={styles.statusText}>{data.pemStatus}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Esercente</Text>
              <Text style={styles.value}>{data.merchant.businessName}</Text>
              <Text style={styles.subvalue}>P.IVA: {data.merchant.vatNumber}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Scontrini in Sospeso</Text>
              <Text style={styles.bigNumber}>{data.pendingReceipts.count}</Text>
              <Text style={styles.subvalue}>Totale: EUR {data.pendingReceipts.totalAmount}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ultima Comunicazione</Text>
              <Text style={styles.value}>
                {new Date(data.lastCommunicationAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fef2f2' },
  header: { backgroundColor: '#dc2626', padding: 24, alignItems: 'center' },
  blockedTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  blockedMessage: { color: '#fecaca', textAlign: 'center' },
  content: { flex: 1, padding: 16 },
  cacheBanner: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 16 },
  cacheText: { color: '#92400e', textAlign: 'center' },
  errorBanner: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#dc2626', textAlign: 'center' },
  loader: { marginTop: 40 },
  telemetryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#fff', fontWeight: 'bold' },
  section: { marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sectionTitle: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '500' },
  subvalue: { fontSize: 14, color: '#9ca3af' },
  bigNumber: { fontSize: 36, fontWeight: 'bold', color: '#3b82f6' },
});
```

### 5. Schermata Offline

```typescript
// src/screens/OfflineScreen.tsx
import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useTelemetry } from '../hooks/useTelemetry';

interface Props {
  pemId: string;
}

export function OfflineScreen({ pemId }: Props) {
  const { data, isLoading, fetchTelemetry } = useTelemetry();

  useEffect(() => {
    fetchTelemetry?.(pemId);
  }, [pemId, fetchTelemetry]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Offline</Text>
        <Text style={styles.message}>
          Nessuna connessione di rete.{'\n'}
          Visualizzazione dati dalla cache.
        </Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" />
        ) : data ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ultima Telemetria Salvata</Text>
            <Text style={styles.businessName}>{data.merchant.businessName}</Text>
            <Text style={styles.info}>P.IVA: {data.merchant.vatNumber}</Text>
            <Text style={styles.info}>Scontrini: {data.pendingReceipts.count}</Text>
            <Text style={styles.info}>Totale: EUR {data.pendingReceipts.totalAmount}</Text>
          </View>
        ) : (
          <Text style={styles.noData}>Nessun dato in cache disponibile</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { backgroundColor: '#6b7280', padding: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  message: { color: '#d1d5db', textAlign: 'center', lineHeight: 20 },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  cardTitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  businessName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  info: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  noData: { textAlign: 'center', color: '#6b7280' },
});
```

### 6. App Root

```typescript
// App.tsx
import { ACubeProvider, useACube } from './src/contexts/ACubeContext';
import { useAppState } from './src/hooks/useAppState';
import { WarningBanner } from './src/components/WarningBanner';
import { BlockedScreen } from './src/screens/BlockedScreen';
import { OfflineScreen } from './src/screens/OfflineScreen';
import { MainApp } from './src/screens/MainApp';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';

const PEM_ID = 'your-pem-uuid';

function AppContent() {
  const { isReady } = useACube();
  const { mode, isBlocked, isOffline } = useAppState();

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isBlocked) {
    return <BlockedScreen pemId={PEM_ID} />;
  }

  if (isOffline) {
    return <OfflineScreen pemId={PEM_ID} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <WarningBanner />
      <MainApp />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ACubeProvider>
      <AppContent />
    </ACubeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

## Struttura Progetto

```
src/
├── components/
│   └── WarningBanner.tsx
├── contexts/
│   └── ACubeContext.tsx
├── hooks/
│   ├── useAppState.ts
│   └── useTelemetry.ts
├── screens/
│   ├── BlockedScreen.tsx
│   ├── OfflineScreen.tsx
│   └── MainApp.tsx
└── App.tsx
```

## Flow Notifiche

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUSSO NOTIFICHE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend DB                                                  │
│      │                                                       │
│      ▼                                                       │
│  GET /mf1/notifications (polling 30s)                       │
│      │                                                       │
│      ▼                                                       │
│  SDKManager.appState$                                        │
│      │                                                       │
│      ├── SYS-W-01 ──▶ mode: WARNING + countdown timer       │
│      ├── SYS-C-01 ──▶ mode: BLOCKED                         │
│      └── SYS-I-01 ──▶ mode: NORMAL                          │
│      │                                                       │
│      ▼                                                       │
│  React State ──▶ UI Update                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Note Importanti

1. **SDKManager.configure()** deve essere chiamato UNA SOLA VOLTA all'avvio
2. **Polling automatico**: Dopo `initialize()`:
   - Notifiche: polling parte sempre (default 30s)
   - Telemetria: polling parte automaticamente se certificato installato (default 60s)
3. La telemetria usa cache automatica quando offline
4. Gli observable emettono `distinctUntilChanged` per evitare re-render inutili
5. **mTLS Required**: Le API richiedono certificato mTLS:
   ```typescript
   const services = SDKManager.getInstance().getServices();
   await services.storeCertificate(cert, privateKey, { format: 'pem' });
   // Dopo aver installato il certificato, avvia telemetria manualmente se necessario
   await services.telemetry.startPollingAuto();
   ```

## API Reference

- [SDKManager API](../api-reference/sdk-manager.md)
- [AppStateService API](../api-reference/app-state.md)
- [Notifications API](../api-reference/notifications.md)
- [Telemetry API](../api-reference/telemetry.md)
