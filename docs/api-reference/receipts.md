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
      vatRateCode: '22.00',
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

### getReturnData(uuid)

Ottiene gli articoli e gli importi ancora restituibili di uno scontrino di vendita (`GET /mf1/receipts/{uuid}/return-data`).

```typescript
const returnable = await sdk.receipts.getReturnData('receipt-uuid');

for (const item of returnable.items) {
  const stillReturnable = Number(item.quantity) - Number(item.returnedQuantity);
  console.log(`${item.description}: ${stillReturnable} restituibili`);
}

const { paymentDetails } = returnable;
console.log(paymentDetails.cashPaymentAmount, paymentDetails.electronicPaymentAmount);
console.log(paymentDetails.vouchers?.amount, paymentDetails.vouchers?.count);
```

**Ritorna:** `Promise<ReturnData>`

```typescript
interface ReturnData {
  items: ReturnableReceiptItem[];
  lottery?: { twoDimensionalLotteryCode?: string; lotteryCode?: string };
  summary: ReturnableSummary[]; // importi restituibili per blocco Riepilogo
  paymentDetails: ReturnablePaymentDetails;
}

// importi ancora restituibili per tipo di payment detail del reso, tutti al lordo IVA
interface ReturnablePaymentDetails {
  cashPaymentAmount?: string;
  electronicPaymentAmount?: string;
  vouchers?: { amount: string; count: number };
  discountAmount?: string; // sconto a pagare, incluso l'arrotondamento per difetto
  uncollectedGoodsGrossAmount?: string;
  uncollectedServicesGrossAmount: string; // non riscossi servizi al lordo IVA, somma di tutti i summary
}
```

### voidReceipt(input)

Annulla uno scontrino dallo stesso PEM.

```typescript
const voidReceipt = await sdk.receipts.voidReceipt({
  documentNumber: '0001-0001',
});
```

**Parametri:** `VoidReceiptInput`

**Ritorna:** `Promise<Receipt>` (lo scontrino di annullo emesso)

### voidViaDifferentDevice(input)

Annulla scontrino da un dispositivo diverso.

```typescript
const voidReceipt = await sdk.receipts.voidViaDifferentDevice({
  deviceId: 'E001-000001',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00',
  items: [...],
});
```

**Parametri:** `VoidViaDifferentDeviceInput`

**Ritorna:** `Promise<Receipt>` (lo scontrino di annullo emesso)

### voidWithProof(input)

Annulla scontrino con prova documentale.

```typescript
const voidReceipt = await sdk.receipts.voidWithProof({
  proof: 'POS',
  documentDatetime: '2024-01-15T10:30:00',
  items: [...],
});
```

**Parametri:** `VoidWithProofInput`

**Ritorna:** `Promise<Receipt>` (lo scontrino di annullo emesso)

### returnItems(input)

Effettua un reso di articoli (stesso PEM).

`paymentDetails` è opzionale (`ReturnPaymentDetail[]`) e ha una struttura diversa dall'emissione:
- `type`: `cash` | `electronic` | `vouchers` | `discount` | `uncollected_goods` | `uncollected_services`
- `amount`: importo lordo, max 2 decimali
- `voucherCount`: obbligatorio (≥ 1) solo per `vouchers`
- `description` non è supportato
- `vouchers` rende quanto pagato con buoni fatturati da terzi (`meal_vouchers` e `other_vouchers`); l'arrotondamento per difetto si rende come `discount`
- se omesso, l'importo reso viene ripartito proporzionalmente agli importi ancora restituibili

```typescript
const returnReceipt = await sdk.receipts.returnItems({
  documentNumber: '0001-0001-0001',
  items: [
    { id: 1, quantity: '1' },
  ],
  paymentDetails: [
    { type: 'cash', amount: '10.00' },
    { type: 'vouchers', amount: '8.00', voucherCount: 1 },
  ],
});
```

**Parametri:** `ReceiptReturnInput`

**Ritorna:** `Promise<Receipt>`

### returnViaDifferentDevice(input)

Reso da dispositivo diverso.

```typescript
const returnReceipt = await sdk.receipts.returnViaDifferentDevice({
  deviceId: 'E001-000001',
  documentNumber: '0001-0001-0001',
  documentDatetime: '2024-01-15T10:30:00',
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
  documentDatetime: '2024-01-15T10:30:00',
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
  totalAmount?: string; // assente per resi e annulli
  documentNumber: string;
  documentDatetime: string; // YYYY-MM-DDTHH:mm:ss
  isReturnable: boolean;
  isVoidable: boolean;
  pdfUrl?: string;
  status: 'ready' | 'sent';
  parentReceiptUuid?: string; // solo per resi/annulli di scontrini dello stesso PEM
}
```

### ReceiptDetails

```typescript
interface ReceiptDetails extends Receipt {
  customerLotteryCode?: string;
  totalTaxableAmount: string;
  totalUncollectedAmount: string;
  totalVatAmount: string;
  totalDiscount: string; // sconto a pagare
  items: ReceiptItem[];
  cashierName?: string; // assente se emesso dal merchant
}
```

### ReceiptInput

```typescript
interface ReceiptInput {
  items: ReceiptItem[];
  customerTaxCode?: string; // alternativo a customerLotteryCode
  customerLotteryCode?: string;
  paymentDetails?: PaymentDetail[];
  invoiceIssuing?: boolean;
  uncollectedDcrToSsn?: boolean;
  additionalText?: string; // max 3 righe separate da \n
}
```

`additionalText` (max 3 righe) è accettato anche da tutti gli input di reso e annullo.

### ReceiptItem

```typescript
interface ReceiptItem {
  type?: 'goods' | 'service'; // default: goods
  quantity: string;
  description: string;
  unitPrice: string; // lordo IVA
  vatRateCode?: VatRateCode; // alternativo a simplifiedVatAllocation
  simplifiedVatAllocation?: boolean; // Ventilazione IVA
  discount?: string;
  surcharge?: string;
  prepaidOrVoucher?: boolean;
  complimentary?: boolean;
  atecoCode?: string;
}
```

### ReceiptListParams

```typescript
interface ReceiptListParams {
  serialNumber: string;
  page?: number;
  size?: number;
  status?: 'ready' | 'sent'; // default: sent
  sort?: 'descending' | 'ascending'; // ordine per numero documento, default: descending
  type?: 'sale' | 'return' | 'void';
  documentNumber?: string;
  documentDatetimeBefore?: string; // incluso
  documentDatetimeStrictlyBefore?: string; // escluso
  documentDatetimeAfter?: string; // incluso
  documentDatetimeStrictlyAfter?: string; // escluso
}
```

### VatRateCode

```typescript
type VatRateCode =
  | '4.00'
  | '5.00'
  | '10.00'
  | '22.00'
  | 'N1'
  | 'N2'
  | 'N3'
  | 'N4'
  | 'N5'
  | 'N6';
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
      vatRateCode: '22.00',
    },
    {
      description: 'Articolo 2',
      quantity: '1',
      unitPrice: '25.00',
      vatRateCode: '10.00',
      discount: '5.00',
    },
  ],
  paymentDetails: [
    { type: 'discount', amount: '2.00' },
    { type: 'cash', amount: '60.70' },
  ],
});
```

### Lista Scontrini con Filtri

```typescript
const page = await sdk.receipts.findAll({
  serialNumber: 'POS-001',
  status: 'sent',
  sort: 'descending',
  type: 'sale',
  documentDatetimeAfter: '2024-01-01T00:00:00',
  page: 1,
  size: 50,
});

console.log('Totale:', page.total);
console.log('Scontrini:', page.members.length);
```

## Prossimi Passi

- [Merchant API](./merchants.md)
- [Cashier API](./cashiers.md)
- [Back-office Report API](./backoffice-reports.md)
