import { PointOfSaleType } from '@/domain/entities/point-of-sale.entity';
import { Address } from '@/domain/value-objects/address.vo';

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
