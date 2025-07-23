# Merchants API

## Overview
Merchant management system for creating and managing business accounts.

**🔗 Base URL**: Uses API Mode endpoints automatically
- **Sandbox**: `https://ereceipts-it-sandbox.acubeapi.com`
- **Production**: `https://ereceipts-it.acubeapi.com`
- **Development**: `https://ereceipts-it.dev.acubeapi.com`

## Methods

### `createMerchant(data: MerchantCreateInput): Promise<MerchantOutput>`
Create a new merchant account (Provider only).

### `getMerchants(page?: number): Promise<MerchantList>`
List merchants with pagination.

### `updateMerchant(uuid: string, data: MerchantUpdateInput): Promise<MerchantOutput>`
Update merchant information.

## Types

```typescript
interface MerchantCreateInput {
  business_name: string;
  vat_number: string;
  fiscal_code?: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postal_code: string;
    province: string;
    country: string;
  };
}
```

## Examples

See [USAGE_EXAMPLE.md](../../USAGE_EXAMPLE.md) for detailed examples.