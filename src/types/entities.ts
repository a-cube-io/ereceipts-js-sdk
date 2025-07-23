export interface MerchantInfo {
  uuid: string;
  fiscalId: string;
  name: string;
  email: string;
  address?: AddressInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInfo {
  streetAddress: string;
  zipCode: string;
  city: string;
  province: string;
}

export interface PointOfSaleInfo {
  serialNumber: string;
  status: 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
  address: AddressInfo;
  registrationKey?: string;
  activatedAt?: string;
}

export interface CashRegisterInfo {
  id: string;
  pemSerialNumber: string;
  name: string;
  mtlsCertificate?: string;
  createdAt: string;
}

export interface ReceiptInfo {
  uuid: string;
  type: 'sale' | 'return' | 'void';
  totalAmount: string;
  documentNumber?: string;
  documentDateTime?: string;
  customerLotteryCode?: string;
  createdAt: string;
  items: ReceiptItemInfo[];
}

export interface ReceiptItemInfo {
  quantity: string;
  description: string;
  unitPrice: string;
  goodOrService: 'B' | 'S';
  vatRateCode?: string;
  discount?: string;
}