# ACube eReceipts JS SDK

SDK ufficiale per l'integrazione con la piattaforma ACube eReceipt in applicazioni Expo/React Native.

## Caratteristiche

- Gestione completa scontrini elettronici (creazione, annullo, reso)
- Autenticazione JWT e mTLS
- Supporto offline con sincronizzazione automatica
- Gestione stati app (NORMAL, WARNING, BLOCKED, OFFLINE)
- TypeScript first con tipizzazione completa
- Ottimizzato per Expo e React Native

## Quick Start

### Installazione

```bash
# Con bun (consigliato)
bun add @a-cube-io/ereceipts-js-sdk

# Con npm
npm install @a-cube-io/ereceipts-js-sdk

# Con yarn
yarn add @a-cube-io/ereceipts-js-sdk
```

### Dipendenze Expo

```bash
expo install expo-secure-store @react-native-async-storage/async-storage
```

### Utilizzo con SDKManager (Raccomandato)

```typescript
import { SDKManager } from '@a-cube-io/ereceipts-js-sdk';

// 1. Configura (una volta all'avvio)
SDKManager.configure({
  environment: 'sandbox',
  notificationPollIntervalMs: 30000,
});

// 2. Inizializza
const manager = SDKManager.getInstance();
await manager.initialize();

// 3. Osserva lo stato dell'app
manager.appState$.subscribe(state => {
  console.log('Mode:', state.mode); // NORMAL, WARNING, BLOCKED, OFFLINE
});

// 4. Usa i servizi
const services = manager.getServices();
await services.login({ email: 'user@example.com', password: 'password' });
const receipts = await services.receipts.list();

// 5. Cleanup
SDKManager.destroy();
```

### Utilizzo Base (Alternativo)

```typescript
import { createACubeSDK } from '@a-cube-io/ereceipts-js-sdk';

// Inizializza SDK
const sdk = await createACubeSDK({
  environment: 'sandbox',
});

// Login
const user = await sdk.login({
  email: 'user@example.com',
  password: 'password',
});

// Crea scontrino
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Prodotto esempio',
      quantity: '1',
      unitPrice: '10.00',
      vatRateCode: '22',
    },
  ],
});

console.log('Scontrino creato:', receipt.documentNumber);
```

## Documentazione

### Getting Started
- [Installazione](./getting-started/installation.md)
- [Configurazione](./getting-started/configuration.md)
- [Setup Expo](./getting-started/expo-setup.md)
- [Autenticazione](./authentication/overview.md)

### API Reference
- [SDKManager](./api-reference/sdk-manager.md) - API semplificata per produzione
- [ACubeSDK](./api-reference/sdk-instance.md) - API completa
- [AppStateService](./api-reference/app-state.md) - Gestione stati app
- [Notifications](./api-reference/notifications.md) - Sistema notifiche
- [Telemetry](./api-reference/telemetry.md) - Telemetria PEM

### Esempi
- [Esempi Base](./examples/basic-usage.md)
- [Notifiche e Telemetria](./examples/notifications-telemetry.md) - Esempio Expo completo

### Troubleshooting
- [Problemi Comuni](./troubleshooting/common-issues.md)

## Ambienti Disponibili

| Ambiente | URL API | Descrizione |
|----------|---------|-------------|
| `sandbox` | `https://ereceipts-it-sandbox.acubeapi.com` | Test e sviluppo |
| `development` | `https://ereceipts-it.dev.acubeapi.com` | Sviluppo interno |
| `production` | `https://ereceipts-it.acubeapi.com` | Produzione |

## Requisiti

- Expo SDK 50+
- React Native 0.73+
- TypeScript 5.0+
- iOS 13+ / Android API 24+

## Repository API

L'SDK espone i seguenti repository tramite `SDKManager.getServices()` o `sdk`:

| Repository | Descrizione |
|------------|-------------|
| `receipts` | Gestione scontrini |
| `merchants` | Gestione esercenti |
| `cashiers` | Gestione cassieri |
| `cashRegisters` | Gestione registratori di cassa |
| `pointOfSales` | Gestione POS |
| `suppliers` | Gestione fornitori |
| `pems` | Gestione PEM (MF2) |
| `dailyReports` | Report giornalieri |
| `journals` | Gestione giornali |
| `notifications` | Notifiche sistema |
| `telemetry` | Telemetria PEM |

## Stati App

Il sistema gestisce automaticamente gli stati dell'applicazione basandosi sulle notifiche dal backend:

| Stato | Trigger | Descrizione |
|-------|---------|-------------|
| `NORMAL` | SYS-I-01 | App funziona normalmente |
| `WARNING` | SYS-W-01 | Banner avviso con countdown |
| `BLOCKED` | SYS-C-01 | Solo visualizzazione telemetria |
| `OFFLINE` | No network | Dati dalla cache |

## Licenza

Proprietary - ACube S.r.l.
