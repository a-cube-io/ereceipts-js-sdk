import { PemCertificates, PemCreateInput, PemCreateOutput } from '@/domain/entities/pem.entity';
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
