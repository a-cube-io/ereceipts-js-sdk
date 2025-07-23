# Receipts API

## Overview
E-receipt management system for creating, retrieving, voiding, and processing returns.

**🔗 Base URL**: Uses API Mode endpoints automatically
- **Sandbox**: `https://ereceipts-it-sandbox.acubeapi.com`
- **Production**: `https://ereceipts-it.acubeapi.com`
- **Development**: `https://ereceipts-it.dev.acubeapi.com`

## Methods

### `createReceipt(data: ReceiptInput): Promise<ReceiptOutput>`
Create a new electronic receipt.

### `getReceipts(page?: number, size?: number): Promise<ReceiptList>`
Retrieve paginated list of receipts.

### `getReceiptById(uuid: string): Promise<ReceiptOutput>`
Get specific receipt by UUID.

### `voidReceipt(data: VoidReceiptInput): Promise<ReceiptOutput>`
Void/cancel an existing receipt.

### `returnReceiptItems(data: ReturnReceiptInput): Promise<ReceiptOutput>`
Process returns/refunds for receipt items.

## Types

```typescript
interface ReceiptInput {
  items: ReceiptItem[];
  cash_payment_amount?: string;
  electronic_payment_amount?: string;
  lottery_code?: string;
}

interface ReceiptItem {
  description: string;
  quantity: string;
  unit_price: string;
  good_or_service: 'B' | 'S'; // B = goods, S = services
  vat_rate_code: string;
}
```

## Examples

See [USAGE_EXAMPLE.md](../../USAGE_EXAMPLE.md) for detailed examples.