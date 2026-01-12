export interface CashRegister {
  uuid: string;
  pemSerialNumber: string;
  name: string;
}

export interface CashRegisterDetailed extends CashRegister {
  mtlsCertificate: string;
  privateKey: string;
}

export interface CashRegisterCreateInput {
  pemSerialNumber: string;
  name: string;
}

export interface CashRegisterUpdateInput {
  name: string;
}

export interface CashRegisterListParams {
  page?: number;
  size?: number;
  pemId?: string;
}
