import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { EReceiptsProvider } from '../../providers/EReceiptsProvider';
import { mockNoPersistedState, clearOnboardingStorage } from './test-utils';

// Mock the API functions
jest.mock('../../api/auth', () => ({
  isAuthenticated: jest.fn(),
  loginProvider: jest.fn(),
  loginMerchant: jest.fn(),
}));

jest.mock('../../api/mf2', () => ({
  createMerchant: jest.fn(),
  getMerchants: jest.fn(),
}));

jest.mock('../../api/mf1', () => ({
  activatePointOfSale: jest.fn(),
  createCashRegister: jest.fn(),
  getPointOfSales: jest.fn(),
}));

jest.mock('../../storage/token', () => ({
  SecureTokenStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    getToken: jest.fn(),
    isTokenValid: jest.fn(),
    getUserEmail: jest.fn(),
    getUserRole: jest.fn(),
    removeToken: jest.fn(),
  },
}));

jest.mock('../../utils/network', () => ({
  isConnected: jest.fn(),
}));

// Import mocked functions
import { isAuthenticated, loginProvider, loginMerchant } from '../../api/auth';
import { createMerchant, getMerchants } from '../../api/mf2';
import { activatePointOfSale, createCashRegister, getPointOfSales } from '../../api/mf1';
import { SecureTokenStorage } from '../../storage/token';
import { isConnected } from '../../utils/network';

// Test component
const TestComponent = ({ 
  role, 
  step, 
  credentials, 
  merchantInfo, 
  registrationKey 
}: {
  role: 'provider' | 'merchant';
  step: string;
  credentials?: { email: string; password: string };
  merchantInfo?: any;
  registrationKey?: string;
}) => {
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role,
    step: step as any,
    credentials,
    merchantInfo,
    registrationKey,
  });

  return (
    <div>
      <div data-testid="step">{state.step}</div>
      <div data-testid="loading">{state.loading.toString()}</div>
      <div data-testid="error">{state.error || ''}</div>
      <div data-testid="progress">{state.progress}</div>
      <div data-testid="result">{JSON.stringify(state.result)}</div>
      
      <button data-testid="compute" onClick={compute}>
        Execute Step
      </button>
      <button data-testid="reset" onClick={reset}>
        Reset
      </button>
      <button data-testid="clear-error" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
};

// Wrapper with provider
const TestWrapper = (props: any) => (
  <EReceiptsProvider
    config={{
      environment: 'sandbox',
      enableLogging: false,
    }}
  >
    <TestComponent {...props} />
  </EReceiptsProvider>
);

describe('useOnboardingFlow', () => {
  const providerCredentials = {
    email: 'provider@example.com',
    password: 'password123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure clean onboarding state - no persisted state by default
    mockNoPersistedState();
    clearOnboardingStorage();
    
    // Default mocks
    (isConnected as jest.Mock).mockResolvedValue(true);
    (isAuthenticated as jest.Mock).mockResolvedValue(false);
  });

  describe('Provider Flow', () => {

    const providerMerchantInfo = {
      fiscalId: '12345678901',
      name: 'Test Shop',
      email: 'shop@example.com',
      address: {
        streetAddress: 'Via Roma 10',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM'
      }
    };

    describe('Authentication Step', () => {
      it('should execute authentication step successfully', async () => {
        (loginProvider as jest.Mock).mockResolvedValue('token123');

        render(
          <TestWrapper
            role="provider"
            step="authentication"
            credentials={providerCredentials}
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(loginProvider).toHaveBeenCalledWith(
            'provider@example.com',
            'password123'
          );
        });

        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('');
        expect(screen.getByTestId('step')).toHaveTextContent('authentication');
      });

      it('should skip authentication if already authenticated', async () => {
        (isAuthenticated as jest.Mock).mockResolvedValue(true);

        render(
          <TestWrapper
            role="provider"
            step="authentication"
            credentials={providerCredentials}
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(loginProvider).not.toHaveBeenCalled();
        });

        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('');
        expect(screen.getByTestId('step')).toHaveTextContent('authentication');
      });

      it('should show error if credentials are missing', async () => {
        render(
          <TestWrapper
            role="provider"
            step="authentication"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(screen.getByTestId('error')).toHaveTextContent('Credentials are required');
        });
      });
    });

    describe('Merchant Check Step', () => {
      it('should check for existing merchants', async () => {
        const mockMerchants = [
          { uuid: 'merchant-123', name: 'Existing Shop' }
        ];
        (getMerchants as jest.Mock).mockResolvedValue(mockMerchants);

        render(
          <TestWrapper
            role="provider"
            step="merchant_check"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(getMerchants).toHaveBeenCalledWith(1);
        });

        expect(screen.getByTestId('result')).toHaveTextContent('merchant-123');
        expect(screen.getByTestId('step')).toHaveTextContent('merchant_check');
      });

      it('should handle no existing merchants', async () => {
        (getMerchants as jest.Mock).mockResolvedValue([]);

        render(
          <TestWrapper
            role="provider"
            step="merchant_check"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(getMerchants).toHaveBeenCalledWith(1);
        });

        expect(screen.getByTestId('result')).toHaveTextContent('{}');
        expect(screen.getByTestId('step')).toHaveTextContent('merchant_check');
      });
    });

    describe('Merchant Creation Step', () => {
      it('should create merchant successfully', async () => {
        const mockMerchant = { uuid: 'new-merchant-123' };
        (createMerchant as jest.Mock).mockResolvedValue(mockMerchant);

        render(
          <TestWrapper
            role="provider"
            step="merchant_creation"
            credentials={providerCredentials}
            merchantInfo={providerMerchantInfo}
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(createMerchant).toHaveBeenCalledWith({
            fiscal_id: '12345678901',
            name: 'Test Shop',
            email: 'shop@example.com',
            password: 'password123',
            address: {
              street_address: 'Via Roma 10',
              zip_code: '00100',
              city: 'Roma',
              province: 'RM'
            }
          });
        });

        expect(screen.getByTestId('result')).toHaveTextContent('new-merchant-123');
        expect(screen.getByTestId('step')).toHaveTextContent('merchant_creation');
      });

      it('should show error if merchant info is missing', async () => {
        render(
          <TestWrapper
            role="provider"
            step="merchant_creation"
            credentials={providerCredentials}
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(screen.getByTestId('error')).toHaveTextContent('Credentials and merchant info are required');
        });
      });
    });
  });

  describe('Merchant Flow', () => {
    const merchantCredentials = {
      email: 'merchant@example.com',
      password: 'password123'
    };

    describe('POS Activation Step', () => {
      it('should activate POS successfully', async () => {
        // Mock empty active POS first, then provide NEW POS for activation
        (getPointOfSales as jest.Mock)
          .mockResolvedValueOnce({ members: [] }) // No active POS
          .mockResolvedValueOnce({ members: [] }) // No registered POS
          .mockResolvedValueOnce({ members: [{ serial_number: 'POS-123' }] }); // NEW POS available
        (activatePointOfSale as jest.Mock).mockResolvedValue(undefined);

        render(
          <TestWrapper
            role="merchant"
            step="pos_activation"
            registrationKey="REG-KEY-123"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(activatePointOfSale).toHaveBeenCalledWith('POS-123', 'REG-KEY-123');
        });

        expect(screen.getByTestId('result')).toHaveTextContent('POS-123');
        expect(screen.getByTestId('step')).toHaveTextContent('pos_activation');
      });

      it('should show error if registration key is missing', async () => {
        render(
          <TestWrapper
            role="merchant"
            step="pos_activation"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(screen.getByTestId('error')).toHaveTextContent('Registration key is required');
        });
      });
    });

    describe('Cash Register Creation Step', () => {
      it('should create cash register successfully', async () => {
        const mockCashRegister = {
          id: 'cash-reg-123',
          mtls_certificate: 'cert-data'
        };
        (createCashRegister as jest.Mock).mockResolvedValue(mockCashRegister);
        
        // Mock the POS serial number that should be retrieved from storage
        (SecureTokenStorage.getItem as jest.Mock)
          .mockResolvedValueOnce(null) // ONBOARDING_STEP - no persisted state
          .mockResolvedValueOnce(null) // MERCHANT_UUID - no persisted state  
          .mockResolvedValueOnce('POS-123'); // CURRENT_POS_SERIAL - for cash register creation

        render(
          <TestWrapper
            role="merchant"
            step="cash_register_creation"
          />
        );

        const computeButton = screen.getByTestId('compute');
        fireEvent.click(computeButton);

        await waitFor(() => {
          expect(createCashRegister).toHaveBeenCalledWith({
            pem_serial_number: 'POS-123',
            name: 'Cash Register - POS-123'
          });
        });

        expect(screen.getByTestId('result')).toHaveTextContent('cash-reg-123');
        expect(screen.getByTestId('step')).toHaveTextContent('cash_register_creation');
      });
    });
  });

  describe('Utility Functions', () => {
    it('should reset state correctly', async () => {
      render(
        <TestWrapper
          role="provider"
          step="authentication"
          credentials={providerCredentials}
        />
      );

      const resetButton = screen.getByTestId('reset');
      fireEvent.click(resetButton);

      expect(screen.getByTestId('error')).toHaveTextContent('');
      expect(screen.getByTestId('result')).toHaveTextContent('{}');
      expect(screen.getByTestId('step')).toHaveTextContent('authentication');
    });

    it('should clear error correctly', async () => {
      (loginProvider as jest.Mock).mockRejectedValue(new Error('Login failed'));

      render(
        <TestWrapper
          role="provider"
          step="authentication"
          credentials={providerCredentials}
        />
      );

      const computeButton = screen.getByTestId('compute');
      fireEvent.click(computeButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });

      const clearErrorButton = screen.getByTestId('clear-error');
      fireEvent.click(clearErrorButton);

      expect(screen.getByTestId('error')).toHaveTextContent('');
    });

    it('should handle network connectivity check', async () => {
      (isConnected as jest.Mock).mockResolvedValue(false);

      render(
        <TestWrapper
          role="provider"
          step="authentication"
          credentials={providerCredentials}
        />
      );

      const computeButton = screen.getByTestId('compute');
      fireEvent.click(computeButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No internet connection available');
      });
    });
  });

  describe('Step Validation', () => {
    it('should reject invalid steps', async () => {
      render(
        <TestWrapper
          role="provider"
          step="invalid_step"
        />
      );

      const computeButton = screen.getByTestId('compute');
      fireEvent.click(computeButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Unsupported step: invalid_step');
      });
    });

    it('should reject merchant steps for provider role', async () => {
      render(
        <TestWrapper
          role="provider"
          step="pos_activation"
        />
      );

      const computeButton = screen.getByTestId('compute');
      fireEvent.click(computeButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('POS activation step is only available for merchant role');
      });
    });

    it('should reject provider steps for merchant role', async () => {
      render(
        <TestWrapper
          role="merchant"
          step="merchant_creation"
        />
      );

      const computeButton = screen.getByTestId('compute');
      fireEvent.click(computeButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Merchant creation step is only available for provider role');
      });
    });
  });
});