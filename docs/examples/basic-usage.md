# Uso Base

Esempi base per iniziare con l'SDK ACube eReceipt.

## Inizializzazione SDK

```typescript
import { createACubeSDK } from '@acube/ereceipt-sdk';

const sdk = await createACubeSDK({
  environment: 'sandbox', // 'production' | 'development' | 'sandbox'
  debug: true, // Abilita log debug
});
```

## Autenticazione

### Login

```typescript
const user = await sdk.login({
  email: 'user@example.com',
  password: 'password123',
});

console.log('Benvenuto', user.username);
console.log('Ruoli:', user.roles);
```

### Verifica Autenticazione

```typescript
const isAuth = await sdk.isAuthenticated();

if (isAuth) {
  const user = await sdk.getCurrentUser();
  console.log('Utente corrente:', user?.email);
}
```

### Logout

```typescript
await sdk.logout();
```

## Creare uno Scontrino

### Scontrino Semplice

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Prodotto A',
      quantity: '1',
      unitPrice: '10.00',
      vatRateCode: '22',
    },
  ],
});

console.log('Scontrino creato:', receipt.uuid);
console.log('Numero documento:', receipt.documentNumber);
```

### Scontrino con Piu Articoli

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Articolo 1',
      quantity: '2',
      unitPrice: '15.00',
      vatRateCode: '22',
    },
    {
      description: 'Articolo 2',
      quantity: '1',
      unitPrice: '8.50',
      vatRateCode: '10',
    },
    {
      type: 'S', // Servizio
      description: 'Consegna',
      quantity: '1',
      unitPrice: '5.00',
      vatRateCode: '22',
    },
  ],
});
```

### Scontrino con Sconto

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '100.00',
      vatRateCode: '22',
      discount: '10.00', // Sconto su articolo
    },
  ],
  discount: '5.00', // Sconto globale
});
```

### Scontrino con Pagamento Elettronico

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Acquisto',
      quantity: '1',
      unitPrice: '50.00',
      vatRateCode: '22',
    },
  ],
  electronicPaymentAmount: '50.00',
});
```

## Consultare Scontrini

### Lista Scontrini

```typescript
const page = await sdk.receipts.findAll({
  serialNumber: 'POS-001',
  page: 1,
  size: 20,
  sort: 'descending',
});

console.log('Totale scontrini:', page.total);

for (const receipt of page.members) {
  console.log(`${receipt.documentNumber}: ${receipt.totalAmount} EUR`);
}
```

### Dettaglio Scontrino

```typescript
const receipt = await sdk.receipts.findById('receipt-uuid');

console.log('Tipo:', receipt.type);
console.log('Importo:', receipt.totalAmount);
console.log('Restituibile:', receipt.isReturnable);
```

### Scaricare PDF

```typescript
const pdfBlob = await sdk.receipts.getDetails('receipt-uuid', 'pdf');

// In React Native, salva o condividi il blob
```

## Annullare uno Scontrino

```typescript
await sdk.receipts.voidReceipt({
  documentNumber: '0001-0001-0001',
});
```

## Effettuare un Reso

```typescript
// 1. Ottieni articoli restituibili
const returnableItems = await sdk.receipts.getReturnableItems('receipt-uuid');

// 2. Effettua il reso
const returnReceipt = await sdk.receipts.returnItems({
  documentNumber: '0001-0001-0001',
  items: [
    { id: returnableItems[0].id, quantity: '1' },
  ],
});

console.log('Reso effettuato:', returnReceipt.uuid);
```

## Gestione Merchant

### Lista Merchant

```typescript
const merchants = await sdk.merchants.findAll();

for (const merchant of merchants.members) {
  console.log(`${merchant.name} (${merchant.vatNumber})`);
}
```

### Dettaglio Merchant

```typescript
const merchant = await sdk.merchants.findById('merchant-uuid');

console.log('Nome:', merchant.name);
console.log('P.IVA:', merchant.vatNumber);
```

## Gestione Cassieri

### Creare Cassiere

```typescript
const cashier = await sdk.cashiers.create({
  firstName: 'Mario',
  lastName: 'Rossi',
  fiscalId: 'RSSMRA80A01H501Z',
});
```

### Lista Cassieri

```typescript
const cashiers = await sdk.cashiers.findAll({
  page: 1,
});

for (const cashier of cashiers.members) {
  console.log(`${cashier.firstName} ${cashier.lastName}`);
}
```

## Verifica Connettivita

```typescript
const online = sdk.isOnline();

if (!online) {
  console.log('Modalita offline attiva');
}
```

## Cleanup

```typescript
// Alla chiusura dell'app
sdk.destroy();
```

## Prossimi Passi

- [App Completa](./complete-app.md)
- [Flusso Scontrini](./receipts-flow.md)
