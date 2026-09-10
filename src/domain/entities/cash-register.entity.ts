export interface CashRegister {
  uuid: string;
  pemSerialNumber: string;
  name: string;
}

export interface MtlsCertificatePem {
  certificate: string;
  privateKey: string;
}

export interface MtlsCertificate {
  pem: MtlsCertificatePem;
  pkcs12: string;
}

export interface CashRegisterDetailed extends CashRegister {
  mtlsCertificate: MtlsCertificate;
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

export interface CashRegisterMe {
  pemSerialNumber: string;
  cashRegisterName: string;
  atecoCodes: string[];
}
