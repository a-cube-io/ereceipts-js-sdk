import { Cashier, CashierCreateInput, CashierStatus } from '@/domain/entities/cashier.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface CashierApiOutput {
  uuid: string;
  merchant_uuid: string;
  display_name: string | null;
  email: string;
  name: string;
  status: CashierStatus;
}

export interface CashierCreateApiInput {
  email: string;
  password: string;
  name: string;
  display_name: string | null;
}

export class CashierMapper {
  static toCreateApiInput(input: CashierCreateInput): CashierCreateApiInput {
    return {
      email: input.email,
      password: input.password,
      name: input.name,
      display_name: input.displayName ?? null,
    };
  }

  static fromApiOutput(output: CashierApiOutput): Cashier {
    return {
      uuid: output.uuid,
      merchantUuid: output.merchant_uuid,
      displayName: output.display_name,
      email: output.email,
      name: output.name,
      status: output.status,
    };
  }

  static pageFromApi(response: Page<CashierApiOutput>): Page<Cashier> {
    return {
      members: response.members.map((c) => this.fromApiOutput(c)),
      total: response.total,
      page: response.page,
      size: response.size,
      pages: response.pages,
    };
  }
}
