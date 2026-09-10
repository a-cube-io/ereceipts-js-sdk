import {
  CashRegister,
  CashRegisterCreateInput,
  CashRegisterDetailed,
  CashRegisterListParams,
  CashRegisterMe,
  CashRegisterUpdateInput,
} from '@/domain/entities/cash-register.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface ICashRegisterRepository {
  create(input: CashRegisterCreateInput): Promise<CashRegisterDetailed>;
  findMe(): Promise<CashRegisterMe>;
  findById(uuid: string): Promise<CashRegister>;
  findAll(params?: CashRegisterListParams): Promise<Page<CashRegister>>;
  update(uuid: string, input: CashRegisterUpdateInput): Promise<CashRegister>;
}
