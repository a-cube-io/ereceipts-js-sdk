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

export interface CashRegisterDetailedApiOutput extends CashRegisterApiOutput {
  mtls_certificate: string;
  private_key: string;
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
      mtlsCertificate: output.mtls_certificate,
      privateKey: output.private_key,
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
