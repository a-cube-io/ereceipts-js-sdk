import {
  CashRegister,
  CashRegisterCreateInput,
  CashRegisterDetailed,
  CashRegisterUpdateInput,
} from '@/domain/entities/cash-register.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface CashRegisterApiOutput {
  uuid: string;
  pem_serial_number: string;
  name: string;
}

export interface MtlsCertificatePemApiOutput {
  certificate: string;
  private_key: string;
}

export interface MtlsCertificateApiOutput {
  pem: MtlsCertificatePemApiOutput;
  pkcs12: string;
}

export interface CashRegisterDetailedApiOutput extends CashRegisterApiOutput {
  mtls_certificate: MtlsCertificateApiOutput;
}

export interface CashRegisterCreateApiInput {
  pem_serial_number: string;
  name: string;
}

export interface CashRegisterUpdateApiInput {
  name: string;
}

export class CashRegisterMapper {
  static toCreateApiInput(input: CashRegisterCreateInput): CashRegisterCreateApiInput {
    return {
      pem_serial_number: input.pemSerialNumber,
      name: input.name,
    };
  }

  static toUpdateApiInput(input: CashRegisterUpdateInput): CashRegisterUpdateApiInput {
    return {
      name: input.name,
    };
  }

  static fromApiOutput(output: CashRegisterApiOutput): CashRegister {
    return {
      uuid: output.uuid,
      pemSerialNumber: output.pem_serial_number,
      name: output.name,
    };
  }

  static fromDetailedApiOutput(output: CashRegisterDetailedApiOutput): CashRegisterDetailed {
    return {
      ...this.fromApiOutput(output),
      mtlsCertificate: {
        pem: {
          certificate: output.mtls_certificate.pem.certificate,
          privateKey: output.mtls_certificate.pem.private_key,
        },
        pkcs12: output.mtls_certificate.pkcs12,
      },
    };
  }

  static pageFromApi(response: Page<CashRegisterApiOutput>): Page<CashRegister> {
    return {
      members: response.members.map((c) => this.fromApiOutput(c)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
