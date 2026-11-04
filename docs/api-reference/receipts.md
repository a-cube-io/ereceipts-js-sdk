# Receipt API

Gestione scontrini elettronici.

## Accesso

```typescript
const receipts = sdk.receipts;
```

## Metodi

### create(input)

Crea un nuovo scontrino.

```typescript
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
```

**Parametri:** `ReceiptInput`

**Ritorna:** `Promise<Receipt>`

### findById(uuid)

Ottiene uno scontrino per UUID.

```typescript
const receipt = await sdk.receipts.findById('receipt-uuid');
```

**Parametri:**
- `uuid` - UUID scontrino

**Ritorna:** `Promise<Receipt>`

### findAll(params)

Lista scontrini con filtri.

```typescript
const page = await sdk.receipts.findAll({
  serialNumber: 'POS-001',
  page: 1,
  size: 20,
  status: 'sent',
  sort: 'descending',
});
```

**Parametri:** `ReceiptListParams`

**Ritorna:** `Promise<Page<Receipt>>`

### getDetails(uuid, format)

Ottiene dettagli scontrino in formato JSON o PDF.

```typescript
// JSON
const details = await sdk.receipts.getDetails('uuid', 'json');

// PDF
const pdfBlob = await sdk.receipts.getDetails('uuid', 'pdf');
```

**Parametri:**
- `uuid` - UUID scontrino
- `format` - `'json'` | `'pdf'`

**Ritorna:** `Promise<ReceiptDetails | Blob>`

### getReturnableItems(uuid)

Ottiene gli articoli e gli importi ancora restituibili di uno scontrino di vendita.

```typescript
const returnable = await sdk.receipts.getReturnableItems('receipt-uuid');

for (const item of returnable.items) {
  // quantity è la quantità originale, returnedQuantity quella già resa
  const stillReturnable = Number(item.quantity) - Number(item.returnedQuantity);
  console.log(`${item.description}: ${stillReturnable} restituibili`);
}

// Importi ancora restituibili per metodo di pagamento
console.log(returnable.cashPaymentAmount, returnable.electronicPaymentAmount);
console.log(returnable.ticket?.amount, returnable.ticket?.quantity);
```

**Ritorna:** `Promise<ReturnableItems>`

```typescript
interface ReturnableItems {
  items: ReturnableReceiptItem[];
  lottery?: { twoDimensionalLotteryCode?: string; lotteryCode?: string };
  summary: ReturnableSummary[]; // importi restituibili per blocco Riepilogo
  cashPaymentAmount?: string;
  electronicPaymentAmount?: string;
  ticket?: { amount: string; quantity: number };
  discountAmount?: string; // sconto a pagare, incluso l'arrotondamento per difetto
  uncollectedGoodsAmount?: string;
  uncollectedServicesAmount: string; // non riscossi servizi al lordo IVA, somma di tutti i summary
}
```

### voidReceipt(input)

Annulla uno scontrino dallo stesso POS.

```typescript
await sdk.receipts.voidReceipt({
  documentNumber: '0001-0001-0001',
});
```

**Parametri:** `VoidReceiptInput`

**Ritorna:** `Promise<void>`

### voidViaDifferentDevice(input)

Annulla scontrino da un dispositivo diverso.

```typescript
await sdk.receipts.voidViaDifferentDevice({
  posId: 'pos-id',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [...],
});
```

**Parametri:** `VoidViaDifferentDeviceInput`

**Ritorna:** `Promise<void>`

### voidWithProof(input)

Annulla scontrino con prova documentale.

```typescript
await sdk.receipts.voidWithProof({
  proof: 'POS',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [...],
});
```

**Parametri:** `VoidWithProofInput`

**Ritorna:** `Promise<void>`

### returnItems(input)

Effettua un reso di articoli (stesso PEM).

`paymentDetails` è opzionale (`ReturnPaymentDetail[]`) e ha una struttura diversa dall'emissione:
- `type`: `cash` | `electronic` | `ticket` | `discount` | `uncollected_goods` | `uncollected_services`
- `amount`: importo lordo, max 2 decimali
- `vouchersQuantity`: obbligatorio (≥ 1) solo per `ticket`
- `description` non è supportato
- i buoni pasto registrati con l'opzione buoni pasto attiva si rendono come `uncollected_services`; l'arrotondamento per difetto si rende come `discount`

```typescript
const returnReceipt = await sdk.receipts.returnItems({
  documentNumber: '0001-0001-0001',
  items: [
    { id: 1, quantity: '1' },
  ],
  paymentDetails: [
    { type: 'cash', amount: '10.00' },
    { type: 'ticket', amount: '8.00', vouchersQuantity: 1 },
  ],
});
```

**Parametri:** `ReceiptReturnInput`

**Ritorna:** `Promise<Receipt>`

### returnViaDifferentDevice(input)

Reso da dispositivo diverso.

```typescript
const returnReceipt = await sdk.receipts.returnViaDifferentDevice({
  posId: 'pos-id',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [...],
});
```

**Parametri:** `ReturnViaDifferentDeviceInput`

**Ritorna:** `Promise<Receipt>`

### returnWithProof(input)

Reso con prova documentale.

```typescript
const returnReceipt = await sdk.receipts.returnWithProof({
  proof: 'POS',
  documentDatetime: '2024-01-15T10:30:00Z',
  items: [...],
});
```

**Parametri:** `ReturnWithProofInput`

**Ritorna:** `Promise<Receipt>`

## Tipi

### Receipt

```typescript
interface Receipt {
  uuid: string;
  type: 'sale' | 'return' | 'void';
  createdAt: string;
  totalAmount: string;
  documentNumber: string;
  documentDatetime?: string;
  isReturnable: boolean;
  isVoidable: boolean;
  pdfUrl?: string;
  parentReceiptUuid?: string;
}
```

### ReceiptInput

```typescript
interface ReceiptInput {
  items: ReceiptItem[];
  customerTaxCode?: string;
  customerLotteryCode?: string;
  discount?: string;
  invoiceIssuing?: boolean;
  uncollectedDcrToSsn?: boolean;
  servicesUncollectedAmount?: string;
  goodsUncollectedAmount?: string;
  cashPaymentAmount?: string;
  electronicPaymentAmount?: string;
  ticketRestaurantPaymentAmount?: string;
  ticketRestaurantQuantity?: number;
}
```

### ReceiptItem

```typescript
interface ReceiptItem {
  type?: 'G' | 'S';
  quantity: string;
  description: string;
  unitPrice: string;
  vatRateCode?: VatRateCode;
  simplifiedVatAllocation?: boolean;
  discount?: string;
  isDownPaymentOrVoucherRedemption?: boolean;
  complimentary?: boolean;
}
```

### ReceiptListParams

```typescript
interface ReceiptListParams {
  serialNumber: string;
  page?: number;
  size?: number;
  status?: 'ready' | 'sent';
  sort?: 'descending' | 'ascending';
  documentNumber?: string;
  documentDatetimeBefore?: string;
  documentDatetimeAfter?: string;
}
```

### VatRateCode

```typescript
type VatRateCode =
  | '22'
  | '10'
  | '5'
  | '4'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6'
  | 'VI'
  | 'VF';
```

## Esempi

### Creare Scontrino con Sconto

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
      unitPrice: '25.00',
      vatRateCode: '10',
      discount: '5.00',
    },
  ],
  discount: '2.00',
});
```

### Lista Scontrini con Filtri

```typescript
const page = await sdk.receipts.findAll({
  serialNumber: 'POS-001',
  status: 'sent',
  sort: 'descending',
  documentDatetimeAfter: '2024-01-01T00:00:00Z',
  page: 1,
  size: 50,
});

console.log('Totale:', page.total);
console.log('Scontrini:', page.items.length);
```

## Prossimi Passi

- [Merchant API](./merchants.md)
- [Cashier API](./cashiers.md)
- [Back-office Report API](./backoffice-reports.md)
