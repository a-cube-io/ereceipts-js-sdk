import { Cashier, CashierCreateInput, CashierListParams } from '@/domain/entities/cashier.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface ICashierRepository {
  create(input: CashierCreateInput): Promise<Cashier>;
  findMe(): Promise<Cashier>;
  findById(uuid: string): Promise<Cashier>;
  findAll(params?: CashierListParams): Promise<Page<Cashier>>;
  delete(uuid: string): Promise<void>;
}
