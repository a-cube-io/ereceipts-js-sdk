# ACube eReceipts JS SDK

SDK ufficiale per l'integrazione con la piattaforma ACube eReceipt in applicazioni Expo/React Native.

## Caratteristiche

- Gestione completa scontrini elettronici (creazione, annullo, reso)
- Autenticazione JWT e mTLS
- Supporto offline con sincronizzazione automatica
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

### Utilizzo Base

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

- [Installazione](./getting-started/installation.md)
- [Configurazione](./getting-started/configuration.md)
- [Setup Expo](./getting-started/expo-setup.md)
- [Autenticazione](./authentication/overview.md)
- [API Reference](./api-reference/sdk-instance.md)
- [Esempi](./examples/basic-usage.md)
- [Troubleshooting](./troubleshooting/common-issues.md)

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

L'SDK espone i seguenti repository:

| Repository | Descrizione |
|------------|-------------|
| `sdk.receipts` | Gestione scontrini |
| `sdk.merchants` | Gestione esercenti |
| `sdk.cashiers` | Gestione cassieri |
| `sdk.cashRegisters` | Gestione registratori di cassa |
| `sdk.pointOfSales` | Gestione POS |
| `sdk.suppliers` | Gestione fornitori |
| `sdk.pems` | Gestione PEM (MF2) |
| `sdk.dailyReports` | Report giornalieri |
| `sdk.journals` | Gestione giornali |

## Licenza

Proprietary - ACube S.r.l.
