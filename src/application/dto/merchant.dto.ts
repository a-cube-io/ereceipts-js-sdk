import {
  Merchant,
  MerchantCreateInput,
  MerchantUpdateInput,
} from '@/domain/entities/merchant.entity';
import { Address } from '@/domain/value-objects/address.vo';
import { Page } from '@/domain/value-objects/page.vo';

export interface AddressApiOutput {
  street_address: string;
  street_number: string;
  zip_code: string;
  city: string;
  province: string;
}

export interface MerchantApiOutput {
  uuid: string;
  vat_number: string;
  fiscal_code?: string | null;
  email: string;
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: AddressApiOutput;
}

export interface MerchantCreateApiInput {
  vat_number: string;
  fiscal_code?: string;
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  password: string;
  address?: AddressApiOutput;
}

export interface MerchantUpdateApiInput {
  business_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address?: AddressApiOutput | null;
}

export class AddressMapper {
  static toApi(address: Address): AddressApiOutput {
    return {
      street_address: address.streetAddress,
      street_number: address.streetNumber,
      zip_code: address.zipCode,
      city: address.city,
      province: address.province,
    };
  }

  static fromApi(address: AddressApiOutput): Address {
    return {
      streetAddress: address.street_address,
      streetNumber: address.street_number,
      zipCode: address.zip_code,
      city: address.city,
      province: address.province,
    };
  }
}

export class MerchantMapper {
  static toCreateApiInput(input: MerchantCreateInput): MerchantCreateApiInput {
    return {
      vat_number: input.vatNumber,
      fiscal_code: input.fiscalCode,
      business_name: input.businessName,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      password: input.password,
      address: input.address ? AddressMapper.toApi(input.address) : undefined,
    };
  }

  static toUpdateApiInput(input: MerchantUpdateInput): MerchantUpdateApiInput {
    return {
      business_name: input.businessName,
      first_name: input.firstName,
      last_name: input.lastName,
      address: input.address ? AddressMapper.toApi(input.address) : input.address,
    };
  }

  static fromApiOutput(output: MerchantApiOutput): Merchant {
    return {
      uuid: output.uuid,
      vatNumber: output.vat_number,
      fiscalCode: output.fiscal_code,
      email: output.email,
      businessName: output.business_name,
      firstName: output.first_name,
      lastName: output.last_name,
      address: output.address ? AddressMapper.fromApi(output.address) : undefined,
    };
  }

  static pageFromApi(response: Page<MerchantApiOutput>): Page<Merchant> {
    return {
      members: response.members.map((m) => this.fromApiOutput(m)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
