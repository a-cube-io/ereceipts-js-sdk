# Flusso Scontrini

Gestione completa del ciclo di vita degli scontrini.

## Panoramica

```
Creazione → Consultazione → Annullamento/Reso
```

## Creazione Scontrino

### Scontrino Base

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Prodotto A',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '22',
    },
  ],
});
```

### Scontrino con Aliquote IVA Multiple

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Alimentari',
      quantity: '1',
      unitPrice: '10.00',
      vatRateCode: '4', // IVA 4%
    },
    {
      description: 'Bevande',
      quantity: '2',
      unitPrice: '5.00',
      vatRateCode: '10', // IVA 10%
    },
    {
      description: 'Accessorio',
      quantity: '1',
      unitPrice: '30.00',
      vatRateCode: '22', // IVA 22%
    },
  ],
});
```

### Scontrino con Servizi

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      type: 'G', // Bene (default)
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '50.00',
      vatRateCode: '22',
    },
    {
      type: 'S', // Servizio
      description: 'Installazione',
      quantity: '1',
      unitPrice: '20.00',
      vatRateCode: '22',
    },
  ],
});
```

### Scontrino con Sconti

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '100.00',
      vatRateCode: '22',
      discount: '10.00', // Sconto articolo
    },
  ],
  discount: '5.00', // Sconto totale
});
```

### Scontrino con Pagamento Misto

```typescript
const receipt = await sdk.receipts.create({
  items: [
    {
      description: 'Acquisto',
      quantity: '1',
      unitPrice: '100.00',
      vatRateCode: '22',
    },
  ],
  cashPaymentAmount: '50.00',
  electronicPaymentAmount: '50.00',
});
```

### Scontrino con Codice Lotteria

```typescript
const receipt = await sdk.receipts.create({
  items: [...],
  customerLotteryCode: 'ABCD1234',
});
```

### Scontrino con Codice Fiscale

```typescript
const receipt = await sdk.receipts.create({
  items: [...],
  customerTaxCode: 'RSSMRA80A01H501Z',
});
```

## Consultazione Scontrini

### Lista con Filtri

```typescript
const page = await sdk.receipts.findAll({
  serialNumber: 'POS-001',
  status: 'sent',
  sort: 'descending',
  documentDatetimeAfter: '2024-01-01T00:00:00Z',
  documentDatetimeBefore: '2024-01-31T23:59:59Z',
  page: 1,
  size: 50,
});

console.log(`Pagina ${page.page} di ${page.pages}`);
console.log(`Totale: ${page.total}`);
```

### Dettaglio Scontrino

```typescript
const receipt = await sdk.receipts.findById('receipt-uuid');

console.log('Documento:', receipt.documentNumber);
console.log('Data:', receipt.documentDatetime);
console.log('Importo:', receipt.totalAmount);
console.log('Annullabile:', receipt.isVoidable);
console.log('Restituibile:', receipt.isReturnable);
```

### Download PDF

```typescript
const pdf = await sdk.receipts.getDetails('receipt-uuid', 'pdf');

// React Native: salva o condividi
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const path = FileSystem.documentDirectory + 'scontrino.pdf';
await FileSystem.writeAsStringAsync(path, pdf, {
  encoding: FileSystem.EncodingType.Base64,
});
await Sharing.shareAsync(path);
```

### Dettaglio JSON

```typescript
const details = await sdk.receipts.getDetails('receipt-uuid', 'json');

console.log('Dettagli completi:', details);
```

## Annullamento Scontrino

### Annullamento Stesso Dispositivo

```typescript
// Verifica se annullabile
const receipt = await sdk.receipts.findById('receipt-uuid');

if (receipt.isVoidable) {
  await sdk.receipts.voidReceipt({
    documentNumber: receipt.documentNumber,
  });
  console.log('Scontrino annullato');
}
```

### Annullamento da Dispositivo Diverso

```typescript
await sdk.receipts.voidViaDifferentDevice({
  posId: 'altro-pos-id',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '22',
    },
  ],
});
```

### Annullamento con Prova

```typescript
await sdk.receipts.voidWithProof({
  proof: 'POS',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '22',
    },
  ],
});
```

## Reso Articoli

### Verifica Articoli Restituibili

```typescript
const returnableItems = await sdk.receipts.getReturnableItems('receipt-uuid');

for (const item of returnableItems) {
  console.log(`${item.description}: max ${item.quantity} restituibili`);
}
```

### Reso Parziale

```typescript
const returnReceipt = await sdk.receipts.returnItems({
  documentNumber: '0001-0001-0001',
  items: [
    { id: 1, quantity: '1' }, // Restituisce solo 1 unita
  ],
});

console.log('Reso creato:', returnReceipt.uuid);
```

### Reso Completo

```typescript
const returnableItems = await sdk.receipts.getReturnableItems('receipt-uuid');

const returnReceipt = await sdk.receipts.returnItems({
  documentNumber: '0001-0001-0001',
  items: returnableItems.map((item) => ({
    id: item.id,
    quantity: item.quantity,
  })),
});
```

### Reso da Dispositivo Diverso

```typescript
const returnReceipt = await sdk.receipts.returnViaDifferentDevice({
  posId: 'altro-pos-id',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '22',
    },
  ],
});
```

### Reso con Prova

```typescript
const returnReceipt = await sdk.receipts.returnWithProof({
  proof: 'POS',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [
    {
      description: 'Prodotto',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '22',
    },
  ],
});
```

## Gestione Offline

```typescript
const offlineManager = sdk.getOfflineManager();

if (!sdk.isOnline()) {
  // Accoda creazione per sincronizzazione
  const operationId = await offlineManager.queueReceiptCreation({
    items: [...],
  });

  // Accoda annullamento
  await offlineManager.queueReceiptVoid({
    documentNumber: '0001-0001-0001',
  });

  // Accoda reso
  await offlineManager.queueReceiptReturn({
    documentNumber: '0001-0001-0001',
    items: [...],
  });
}
```

## Prossimi Passi

- [Attivazione POS](./pos-activation.md)
- [App Completa](./complete-app.md)
