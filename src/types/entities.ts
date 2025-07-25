export type MerchantInfo = {
  uuid: string;
  fiscalId: string;
  name: string;
  email: string;
  address?: AddressInfo;
  createdAt: string;
  updatedAt: string;
}

export type AddressInfo = {
  streetAddress: string;
  zipCode: string;
  city: string;
  province: string;
}

export type PointOfSaleInfo = {
  serialNumber: string;
  status: 'NEW' | 'REGISTERED' | 'ACTIVE' | 'ONLINE' | 'OFFLINE' | 'DISCARDED';
  address: AddressInfo;
  registrationKey?: string;
  activatedAt?: string;
}

export type CashRegisterInfo = {
  id: string;
  pemSerialNumber: string;
  name: string;
  mtlsCertificate?: string;
  createdAt: string;
}

export type ReceiptInfo = {
  uuid: string;
  type: 'sale' | 'return' | 'void';
  totalAmount: string;
  documentNumber?: string;
  documentDateTime?: string;
  customerLotteryCode?: string;
  createdAt: string;
  items: ReceiptItemInfo[];
}

export type ReceiptItemInfo = {
  quantity: string;
  description: string;
  unitPrice: string;
  goodOrService: 'B' | 'S';
  vatRateCode?: string;
  discount?: string;
}

// Onboarding Flow Types
export type OnboardingCredentials = {
  email: string;
  password: string;
}

export type OnboardingMerchantInfo = {
  fiscalId: string;
  name: string;
  email: string;
  address: AddressInfo;
  password: string;
}

export type OnboardingPOSInfo = {
  address: AddressInfo;
}

export type OnboardingResult = {
  merchantUuid?: string;
  posSerialNumber?: string;
  registrationKey?: string;
  cashRegisterId?: string;
  mtlsCertificate?: string;
  existingMerchants?: MerchantInfo[];
  existingActivePOS?: PointOfSaleInfo[];
  flowCompleted?: boolean;
  skipReason?: string;
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

export type OnboardingState = {
  loading: boolean;
  step: OnboardingStep;
  nextStep?: OnboardingStep | null;
  error: string | null;
  progress: number;
  result: OnboardingResult;
  canSkipToCompletion?: boolean;
}

export type OnboardingCashRegisterInfo = {
  pemSerialNumber: string;
  name: string;
}

export type OnboardingPosActivationInfo = {
  registrationKey: string;
  posSerialNumber: string;
}

export type UseOnboardingFlowInput = {
  role: OnboardingRole;
} & (
  {
    step: 'authentication';
    credentials: OnboardingCredentials;
  } | {
    step: 'merchant_creation';
    merchantInfo: OnboardingMerchantInfo;
  } | {
    step: 'pos_creation';
    posInfo?: OnboardingPOSInfo;
  } | {
    step: 'cash_register_creation';
    cashRegisterInfo: OnboardingCashRegisterInfo
  } | {
    step: 'pos_activation';
    posActivationInfo: OnboardingPosActivationInfo;
  }
  | {
    step: Exclude<OnboardingStep, 'authentication' | 'pos_activation' | 'merchant_creation' | 'pos_creation' | 'cash_register_creation'>;
  }
)

export type UseOnboardingFlowReturn = {
  state: OnboardingState;
  compute: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}