import React, { ReactElement } from 'react';
import { 
  render,
  RenderOptions,
  within,
  screen,
  fireEvent,
  waitFor,
  act,
  renderHook,
} from '@testing-library/react';
import { EReceiptsProvider, EReceiptsProviderConfig } from '../../providers/EReceiptsProvider';
import { SecureTokenStorage } from '../../storage/token';
import { STORAGE_KEYS } from '../../constants/keys';

// Default E-Receipts provider config for testing
const defaultTestConfig: EReceiptsProviderConfig = {
  environment: 'sandbox',
  storage: {
    encryptionKeyId: 'test-key-v1',
    storeNamespace: 'test-store'
  },
  enableLogging: false,
  skipTokenValidation: true,
  onInitialized: jest.fn(),
  onError: jest.fn(),
  onLoadingChange: jest.fn(),
  onAuthChange: jest.fn(),
};

// All providers wrapper component
const AllTheProviders = ({ 
  children, 
  ereceiptsConfig = defaultTestConfig 
}: { 
  children: React.ReactNode;
  ereceiptsConfig?: EReceiptsProviderConfig;
}) => {
  return (
    <EReceiptsProvider config={ereceiptsConfig}>
      {children}
    </EReceiptsProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    ereceiptsConfig?: EReceiptsProviderConfig;
  }
) => {
  const { ereceiptsConfig, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders ereceiptsConfig={ereceiptsConfig}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Test utilities for onboarding state management
export const mockNoPersistedState = () => {
  const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
  mockSecureTokenStorage.getItem.mockImplementation(async (key) => {
    // Explicitly return null for all onboarding-related keys
    if (key === STORAGE_KEYS.ONBOARDING_STEP) return null;
    if (key === STORAGE_KEYS.MERCHANT_UUID) return null;
    if (key === STORAGE_KEYS.CURRENT_POS_SERIAL) return null;
    return null;
  });
};

export const mockPersistedState = (step: string, merchantUuid?: string, posSerial?: string) => {
  const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
  mockSecureTokenStorage.getItem.mockImplementation(async (key) => {
    if (key === STORAGE_KEYS.ONBOARDING_STEP) return step;
    if (key === STORAGE_KEYS.MERCHANT_UUID) return merchantUuid || null;
    if (key === STORAGE_KEYS.CURRENT_POS_SERIAL) return posSerial || null;
    return null;
  });
};

export const clearOnboardingStorage = () => {
  const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
  mockSecureTokenStorage.setItem.mockResolvedValue(undefined);
  mockSecureTokenStorage.removeToken.mockResolvedValue(undefined);
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override render method and export custom utilities
export {
  customRender as renderReact,
  AllTheProviders as AllTheProvidersReact,
  defaultTestConfig as defaultReactTestConfig,
  screen as screenReact,
  within as withinReact,
  fireEvent as fireEventReact,
  waitFor as waitForReact,
  renderHook as renderHookReact,
  act as actReact,
}; 