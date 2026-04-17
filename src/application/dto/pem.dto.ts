import {
  PemCertificates,
  PemCreateInput,
  PemCreateOutput,
  PemUpdateInput,
  PemUpdateOutput,
} from '@/domain/entities/pem.entity';
import { PointOfSaleMf2 } from '@/domain/entities/point-of-sale.entity';

import { AddressApiOutput } from './merchant.dto';

export interface PemCreateApiInput {
  merchant_uuid: string;
  address?: {
    street_address: string;
    street_number: string;
    zip_code: string;
    city: string;
    province: string;
  };
}

export interface PemCreateApiOutput {
  serial_number: string;
  registration_key: string;
}

export interface PemCertificatesApiOutput {
  mtls_certificate: string;
  activation_xml_response?: string;
}

export interface PemUpdateApiInput {
  receipt_format: 'standard' | 'narrow';
  display_cashier_name: boolean;
  receipt_header?: string;
  footer_text?: string;
  logo?: string;
}

export interface PemUpdateApiOutput {
  receipt_format: 'standard' | 'narrow';
  display_cashier_name: boolean;
  receipt_header?: string;
  footer_text?: string;
}

export interface PointOfSaleMf2ApiOutput {
  serial_number: string;
  status: 'NEW' | 'REGISTERED' | 'ACTIVATED' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
  type: 'AP' | 'SP' | 'TM' | 'PV';
  address?: AddressApiOutput;
}

export class PemMapper {
  static toCreateApiInput(input: PemCreateInput): PemCreateApiInput {
    const apiInput: PemCreateApiInput = {
      merchant_uuid: input.merchantUuid,
    };

    if (input.address) {
      apiInput.address = {
        street_address: input.address.streetAddress,
        street_number: input.address.streetNumber,
        zip_code: input.address.zipCode,
        city: input.address.city,
        province: input.address.province,
      };
    }

    return apiInput;
  }

  static fromCreateApiOutput(output: PemCreateApiOutput): PemCreateOutput {
    return {
      serialNumber: output.serial_number,
      registrationKey: output.registration_key,
    };
  }

  static fromCertificatesApiOutput(output: PemCertificatesApiOutput): PemCertificates {
    return {
      mtlsCertificate: output.mtls_certificate,
      activationXmlResponse: output.activation_xml_response,
    };
  }

  static toUpdateApiInput(input: PemUpdateInput): PemUpdateApiInput {
    return {
      receipt_format: input.receiptFormat,
      display_cashier_name: input.displayCashierName,
      receipt_header: input.receiptHeader,
      footer_text: input.footerText,
      logo: input.logo,
    };
  }

  static fromUpdateApiOutput(output: PemUpdateApiOutput): PemUpdateOutput {
    return {
      receiptFormat: output.receipt_format,
      displayCashierName: output.display_cashier_name,
      receiptHeader: output.receipt_header,
      footerText: output.footer_text,
    };
  }

  static fromPointOfSaleMf2ApiOutput(output: PointOfSaleMf2ApiOutput): PointOfSaleMf2 {
    return {
      serialNumber: output.serial_number,
      status: output.status,
      type: output.type,
      address: output.address
        ? {
            streetAddress: output.address.street_address,
            streetNumber: output.address.street_number ?? '',
            zipCode: output.address.zip_code,
            city: output.address.city,
            province: output.address.province,
          }
        : undefined,
    };
  }

  static pageFromApi(data: PointOfSaleMf2ApiOutput[]): PointOfSaleMf2[] {
    return data.map((item) => PemMapper.fromPointOfSaleMf2ApiOutput(item));
  }
}
