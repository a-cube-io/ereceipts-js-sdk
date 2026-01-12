export type CashierStatus = 'active' | 'disabled';

export interface Cashier {
  uuid: string;
  merchantUuid: string;
  displayName: string | null;
  email: string;
  name: string;
  status: CashierStatus;
}

export interface CashierCreateInput {
  email: string;
  password: string;
  name: string;
  displayName?: string | null;
}

export interface CashierListParams {
  page?: number;
  size?: number;
  status?: CashierStatus;
}
