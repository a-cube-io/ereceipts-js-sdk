export interface MerchantInfo {
  uuid: string;
  fiscalId: string;
  name: string;
  email: string;
  address?: AddressInfo;
  createdAt: string;
  updatedAt: string;
}

export interface AddressInfo {
  streetAddress: string;
  zipCode: string;
  city: string;
  province: string;
}

export interface PointOfSaleInfo {
  serialNumber: string;
  status: 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
  address: AddressInfo;
  registrationKey?: string;
  activatedAt?: string;
}

export interface CashRegisterInfo {
  id: string;
  pemSerialNumber: string;
  name: string;
  mtlsCertificate?: string;
  createdAt: string;
}

export interface ReceiptInfo {
  uuid: string;
  type: 'sale' | 'return' | 'void';
  totalAmount: string;
  documentNumber?: string;
  documentDateTime?: string;
  customerLotteryCode?: string;
  createdAt: string;
  items: ReceiptItemInfo[];
}

export interface ReceiptItemInfo {
  quantity: string;
  description: string;
  unitPrice: string;
  goodOrService: 'B' | 'S';
  vatRateCode?: string;
  discount?: string;
}

// Onboarding Flow Types
export interface OnboardingCredentials {
  email: string;
  password: string;
}

export interface OnboardingMerchantInfo {
  fiscalId: string;
  name: string;
  email: string;
  address: AddressInfo;
}

export interface OnboardingPOSInfo {
  address: AddressInfo;
}

export interface OnboardingResult {
  merchantUuid?: string;
  posSerialNumber?: string;
  registrationKey?: string;
  cashRegisterId?: string;
  mtlsCertificate?: string;
}

export type OnboardingRole = 'provider' | 'merchant';

export type OnboardingStep = 
  | 'authentication'
  | 'merchant_check'
  | 'merchant_creation'
  | 'pos_creation'
  | 'pos_activation'
  | 'cash_register_creation'
  | 'completed'
  | 'error';

export interface OnboardingState {
  loading: boolean;
  step: OnboardingStep;
  error: string | null;
  progress: number;
  result: OnboardingResult;
}

export interface UseOnboardingFlowInput {
  role: OnboardingRole;
  step: OnboardingStep;
  credentials?: OnboardingCredentials;
  merchantInfo?: OnboardingMerchantInfo;
  posInfo?: OnboardingPOSInfo;
  registrationKey?: string;
}

export interface UseOnboardingFlowReturn {
  state: OnboardingState;
  compute: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}