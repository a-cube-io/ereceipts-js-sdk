import React, { ReactElement } from 'react';
import { render, RenderOptions, within, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { EReceiptsProvider, EReceiptsProviderConfig } from '../../providers/EReceiptsProvider';

// Default E-Receipts provider config for testing
const defaultTestConfig: EReceiptsProviderConfig = {
  environment: 'sandbox',
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

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';

// Override render method and export custom utilities
export {
  customRender as renderReactNative,
  AllTheProviders as AllTheProvidersReactNative,
  defaultTestConfig as defaultReactNativeTestConfig,
  screen as screenReactNative,
  within as withinReactNative,
  fireEvent as fireEventReactNative,
  waitFor as waitForReactNative,
}; 