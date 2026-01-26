import {
  Supplier,
  SupplierCreateInput,
  SupplierUpdateInput,
} from '@/domain/entities/supplier.entity';
import { Page } from '@/domain/value-objects/page.vo';

import { AddressApiOutput, AddressMapper } from './merchant.dto';

export interface SupplierApiOutput {
  uuid: string;
  fiscal_id: string;
  name: string;
  address?: AddressApiOutput;
}

export interface SupplierCreateApiInput {
  fiscal_id: string;
  name: string;
  address?: AddressApiOutput;
}

export interface SupplierUpdateApiInput {
  name: string;
  address?: AddressApiOutput;
}

export class SupplierMapper {
  static toCreateApiInput(input: SupplierCreateInput): SupplierCreateApiInput {
    return {
      fiscal_id: input.fiscalId,
      name: input.name,
      address: input.address ? AddressMapper.toApi(input.address) : undefined,
    };
  }

  static toUpdateApiInput(input: SupplierUpdateInput): SupplierUpdateApiInput {
    return {
      name: input.name,
      address: input.address ? AddressMapper.toApi(input.address) : undefined,
    };
  }

  static fromApiOutput(output: SupplierApiOutput): Supplier {
    return {
      uuid: output.uuid,
      fiscalId: output.fiscal_id,
      name: output.name,
      address: output.address ? AddressMapper.fromApi(output.address) : undefined,
    };
  }

  static pageFromApi(response: {
    members: SupplierApiOutput[];
    total?: number;
    page?: number;
    size?: number;
    pages?: number;
  }): Page<Supplier> {
    return {
      members: response.members.map((s) => this.fromApiOutput(s)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
