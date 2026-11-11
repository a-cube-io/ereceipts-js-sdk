import { PointOfSaleType } from '@/domain/entities/point-of-sale.entity';
import { Address } from '@/domain/value-objects/address.vo';

export type ReceiptFormat = 'standard' | 'narrow';

export interface PemData {
  version: string;
  type: PointOfSaleType;
}

export interface PemCreateInput {
  merchantUuid: string;
  address?: Address;
}

export interface PemCreateOutput {
  serialNumber: string;
  registrationKey: string;
}

export interface PemCertificates {
  mtlsCertificate: string;
  activationXmlResponse?: string;
}

export interface PemUpdateInput {
  receiptFormat: ReceiptFormat;
  displayCashierName: boolean;
  displayCashRegisterName: boolean;
  receiptHeader: string;
  footerText?: string;
  mealVouchersInvoicedToIssuer: boolean;
}

export type PemConfigurationOutput = PemUpdateInput;

/**
 * PNG image of the logo printed on the receipts.
 * Binary data is sent as-is; a string is treated as base64 (a `data:image/png;base64,` prefix is allowed).
 * The backend converts it to black and white for the current receipt format:
 * changing `receiptFormat` deletes the logo, which must be uploaded again.
 */
export type PemLogoData = ArrayBuffer | Uint8Array | Blob | string;

export interface PemLogoInput {
  logo: PemLogoData;
}
