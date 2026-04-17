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
  receiptHeader?: string;
  footerText?: string;
  logo?: string;
}

export type PemConfigurationOutput = Omit<PemUpdateInput, 'logo'>;
