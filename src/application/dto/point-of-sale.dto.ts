import {
  ActivationRequest,
  PEMStatus,
  PEMStatusOfflineRequest,
  PointOfSale,
  PointOfSaleDetailed,
} from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

import { AddressApiOutput, AddressMapper } from './merchant.dto';

export interface PointOfSaleApiOutput {
  serial_number: string;
  status: PEMStatus;
  address: AddressApiOutput;
  operational_status: string;
}

export interface PointOfSaleDetailedApiOutput extends PointOfSaleApiOutput {
  registration_key?: string;
}

export interface ActivationRequestApiInput {
  registration_key: string;
}

export interface PEMStatusOfflineRequestApiInput {
  timestamp: string;
  reason: string;
}

export class PointOfSaleMapper {
  static toActivationApiInput(input: ActivationRequest): ActivationRequestApiInput {
    return {
      registration_key: input.registrationKey,
    };
  }

  static toOfflineApiInput(input: PEMStatusOfflineRequest): PEMStatusOfflineRequestApiInput {
    return {
      timestamp: input.timestamp,
      reason: input.reason,
    };
  }

  static fromApiOutput(output: PointOfSaleApiOutput): PointOfSale {
    return {
      serialNumber: output.serial_number,
      status: output.status,
      address: AddressMapper.fromApi(output.address),
      operationalStatus: output.operational_status,
    };
  }

  static fromDetailedApiOutput(output: PointOfSaleDetailedApiOutput): PointOfSaleDetailed {
    return {
      ...this.fromApiOutput(output),
      registrationKey: output.registration_key,
    };
  }

  static pageFromApi(response: Page<PointOfSaleApiOutput>): Page<PointOfSale> {
    return {
      members: response.members.map((p) => this.fromApiOutput(p)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
