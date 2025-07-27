/**
 * Branded types for type-safe IDs and values
 * Prevents mixing different types of IDs at compile time
 */

// Base branded type utility
declare const __brand: unique symbol;
type Brand<T, TBrand> = T & { [__brand]: TBrand };

// ID Types
export type ReceiptId = Brand<string, 'ReceiptId'>;
export type CashierId = Brand<number, 'CashierId'>;
export type PEMId = Brand<string, 'PEMId'>;
export type MerchantId = Brand<string, 'MerchantId'>;
export type CashRegisterId = Brand<string, 'CashRegisterId'>;
export type SerialNumber = Brand<string, 'SerialNumber'>;
export type FiscalId = Brand<string, 'FiscalId'>;
export type DocumentNumber = Brand<string, 'DocumentNumber'>;

// Value Types
export type Amount = Brand<string, 'Amount'>;
export type VATRate = Brand<string, 'VATRate'>;
export type Quantity = Brand<string, 'Quantity'>;

// Utility functions to create branded types
export const createReceiptId = (id: string): ReceiptId => id as ReceiptId;
export const createCashierId = (id: number): CashierId => id as CashierId;
export const createPEMId = (id: string): PEMId => id as PEMId;
export const createMerchantId = (id: string): MerchantId => id as MerchantId;
export const createCashRegisterId = (id: string): CashRegisterId => id as CashRegisterId;
export const createSerialNumber = (sn: string): SerialNumber => sn as SerialNumber;
export const createFiscalId = (id: string): FiscalId => id as FiscalId;
export const createDocumentNumber = (dn: string): DocumentNumber => dn as DocumentNumber;

export const createAmount = (amount: string): Amount => amount as Amount;
export const createVATRate = (rate: string): VATRate => rate as VATRate;
export const createQuantity = (qty: string): Quantity => qty as Quantity;

// Type guards
export const isReceiptId = (value: unknown): value is ReceiptId => 
  typeof value === 'string' && value.length > 0;

export const isCashierId = (value: unknown): value is CashierId => 
  typeof value === 'number' && value > 0;

export const isFiscalId = (value: unknown): value is FiscalId => 
  typeof value === 'string' && /^\d{11}$/.test(value);

export const isAmount = (value: unknown): value is Amount => 
  typeof value === 'string' && /^\d+\.\d{2,8}$/.test(value);

export const isMerchantId = (value: unknown): value is MerchantId => 
  typeof value === 'string' && value.length > 0;

export const isSerialNumber = (value: unknown): value is SerialNumber => 
  typeof value === 'string' && value.length > 0;

export const isPEMId = (value: unknown): value is PEMId => 
  typeof value === 'string' && value.length > 0;

export const isQuantity = (value: unknown): value is Quantity => 
  typeof value === 'string' && /^\d+(\.\d{1,6})?$/.test(value);