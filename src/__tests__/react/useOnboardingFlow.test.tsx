import React from 'react';
import '@testing-library/jest-dom';
import { 
  renderReact,
  renderHookReact,
  screenReact as screen,
  waitForReact as waitFor,
  actReact as act,
  mockNoPersistedState,
  clearOnboardingStorage,
  mockPersistedState,
  AllTheProvidersReact
} from './test-utils';
import userEvent from '@testing-library/user-event';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import {
  OnboardingCredentials,
  OnboardingMerchantInfo,
  OnboardingPOSInfo,
  OnboardingCashRegisterInfo,
  OnboardingPosActivationInfo,
  UseOnboardingFlowInput
} from '../../types/entities';

// Mock API functions
jest.mock('../../api/auth', () => ({
  isAuthenticated: jest.fn(),
  loginProvider: jest.fn(),
  loginMerchant: jest.fn(),
}));

jest.mock('../../api/mf2', () => ({
  createMerchant: jest.fn(),
  createPem: jest.fn(),
  getMerchants: jest.fn(),
}));

jest.mock('../../api/mf1', () => ({
  activatePointOfSale: jest.fn(),
  createCashRegister: jest.fn(),
  getPointOfSales: jest.fn(),
  getPointOfSaleBySerial: jest.fn(),
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

// Import mocked functions with proper typing
import { isAuthenticated, loginProvider, loginMerchant } from '../../api/auth';
import { createMerchant, createPem, getMerchants } from '../../api/mf2';
import { activatePointOfSale, createCashRegister, getPointOfSales, getPointOfSaleBySerial } from '../../api/mf1';
import { SecureTokenStorage } from '../../storage/token';
import { isConnected } from '../../utils/network';

// Mock functions with proper typing
const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockLoginProvider = loginProvider as jest.MockedFunction<typeof loginProvider>;
const mockCreateMerchant = createMerchant as jest.MockedFunction<typeof createMerchant>;
const mockCreatePem = createPem as jest.MockedFunction<typeof createPem>;
const mockGetMerchants = getMerchants as jest.MockedFunction<typeof getMerchants>;
const mockActivatePointOfSale = activatePointOfSale as jest.MockedFunction<typeof activatePointOfSale>;
const mockCreateCashRegister = createCashRegister as jest.MockedFunction<typeof createCashRegister>;
const mockGetPointOfSaleBySerial = getPointOfSaleBySerial as jest.MockedFunction<typeof getPointOfSaleBySerial>;
const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
const mockIsConnected = isConnected as jest.MockedFunction<typeof isConnected>;

// Test data with proper typing
const mockCredentials: OnboardingCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

const mockMerchantInfo: OnboardingMerchantInfo = {
  fiscalId: '12345678901',
  name: 'Test Merchant',
  email: 'merchant@example.com',
  password: 'merchantpass123',
  address: {
    streetAddress: 'Via Roma 1',
    zipCode: '00100',
    city: 'Roma',
    province: 'RM'
  }
};

const mockPosInfo: OnboardingPOSInfo = {
  address: {
    streetAddress: 'Via Milano 5',
    zipCode: '20100',
    city: 'Milano',
    province: 'MI'
  }
};

const mockCashRegisterInfo: OnboardingCashRegisterInfo = {
  pemSerialNumber: 'POS-123',
  name: 'Main Register'
};

const mockPosActivationInfo: OnboardingPosActivationInfo = {
  registrationKey: 'REG-KEY-123',
  posSerialNumber: 'POS-SERIAL-456'
};

// Test component for integration tests
interface TestComponentProps {
  hookInput: UseOnboardingFlowInput;
  onStateChange?: (state: any) => void;
}

const TestComponent: React.FC<TestComponentProps> = ({ hookInput, onStateChange }) => {
  const { state, compute, reset, clearError } = useOnboardingFlow(hookInput);

  React.useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  return (
    <div>
      <div data-testid="step">{state.step}</div>
      <div data-testid="next-step">{state.nextStep || 'null'}</div>
      <div data-testid="loading">{state.loading.toString()}</div>
      <div data-testid="error">{state.error || ''}</div>
      <div data-testid="progress">{state.progress}</div>
      <div data-testid="can-skip">{state.canSkipToCompletion?.toString() || 'false'}</div>
      <div data-testid="result">{JSON.stringify(state.result)}</div>
      
      <button data-testid="compute" onClick={compute}>
        Execute
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

describe('useOnboardingFlow Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoPersistedState();
    clearOnboardingStorage();
    
    // Default successful mocks
    mockIsConnected.mockReturnValue(true);
    mockIsAuthenticated.mockResolvedValue(false);
  });

  describe('Hook Initialization', () => {
    it('should initialize with correct default state for provider authentication', () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      expect(result.current.state.step).toBe('authentication');
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
      expect(result.current.state.progress).toBe(20);
      expect(result.current.state.canSkipToCompletion).toBe(false);
      expect(result.current.state.result).toEqual({});
    });

    it('should initialize with correct default state for merchant authentication', () => {
      const input: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'authentication',
        credentials: mockCredentials
      };

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      expect(result.current.state.step).toBe('authentication');
      expect(result.current.state.progress).toBe(25);
      expect(result.current.state.nextStep).toBe('pos_activation');
    });

    it('should calculate authentication -> merchant_check for provider', () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };
      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });
      expect(result.current.state.nextStep).toBe('merchant_check');
    });

    it('should calculate merchant_check -> merchant_creation for provider', () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_check'
      };
      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });
      expect(result.current.state.nextStep).toBe('merchant_creation');
    });

    it('should calculate pos_creation -> completed for provider', () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'pos_creation',
        posInfo: mockPosInfo
      };
      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });
      expect(result.current.state.nextStep).toBe('completed');
    });
  });

  describe('Provider Flow - Authentication Step', () => {
    it('should execute authentication successfully when not authenticated', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockLoginProvider.mockResolvedValue({
        access_token: 'mock-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockLoginProvider).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.state.loading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });

    it('should skip authentication when already authenticated', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockIsAuthenticated.mockResolvedValue(true);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockLoginProvider).not.toHaveBeenCalled();
      expect(result.current.state.error).toBeNull();
    });

    it('should handle authentication errors properly', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockLoginProvider.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.error).toContain('Authentication failed: Invalid credentials');
      expect(result.current.state.step).toBe('error');
    });
  });

  describe('Provider Flow - Merchant Check Step', () => {
    it('should complete onboarding immediately when existing merchants found', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_check'
      };

      const mockExistingMerchants = [
        {
          uuid: 'merchant-123',
          fiscal_id: '98765432109',
          name: 'Existing Merchant',
          email: 'existing@example.com',
          address: {
            street_address: 'Via Torino 1',
            zip_code: '10100',
            city: 'Torino',
            province: 'TO'
          }
        }
      ];

      mockGetMerchants.mockResolvedValue(mockExistingMerchants);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockGetMerchants).toHaveBeenCalledWith(1);
      expect(result.current.state.step).toBe('completed');
      expect(result.current.state.result.existingMerchants).toHaveLength(1);
      expect(result.current.state.result.flowCompleted).toBe(true);
      expect(result.current.state.result.skipReason).toBe('Provider already has existing merchants');
      expect(result.current.state.canSkipToCompletion).toBe(true);
      
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith('acube_merchant_uuid', 'merchant-123');
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith('acube_onboarding_step', 'completed');
    });

    it('should proceed to merchant creation when no existing merchants', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_check'
      };

      mockGetMerchants.mockResolvedValue([]);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.step).toBe('merchant_check');
      expect(result.current.state.result.existingMerchants).toEqual([]);
      expect(result.current.state.result.flowCompleted).toBe(false);
      expect(result.current.state.canSkipToCompletion).toBe(false);
    });
  });

  describe('Provider Flow - Merchant Creation Step', () => {
    it('should create merchant successfully', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: mockMerchantInfo
      };

      const mockNewMerchant = {
        uuid: 'new-merchant-456',
        fiscal_id: '12345678901',
        name: 'Test Merchant',
        email: 'merchant@example.com'
      };

      mockCreateMerchant.mockResolvedValue(mockNewMerchant);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockCreateMerchant).toHaveBeenCalledWith({
        fiscal_id: '12345678901',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password: 'merchantpass123',
        address: {
          street_address: 'Via Roma 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      });

      expect(result.current.state.result.merchantUuid).toBe('new-merchant-456');
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith('acube_merchant_uuid', 'new-merchant-456');
    });

    it('should throw error when merchant info is missing', async () => {
      // This test validates that the hook handles invalid inputs gracefully
      // We create a valid input but then modify the merchantInfo to be undefined
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: undefined as any // Simulate missing merchantInfo
      };

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.error).toContain('Merchant info is required');
      expect(result.current.state.step).toBe('error');
    });
  });

  describe('Provider Flow - POS Creation Step', () => {
    it('should create POS successfully', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'pos_creation',
        posInfo: mockPosInfo
      };

      const mockNewPem = {
        serial_number: 'POS-789',
        registration_key: 'REG-KEY-789'
      };

      mockCreatePem.mockResolvedValue(mockNewPem);
      // Mock merchant UUID from storage
      mockSecureTokenStorage.getItem.mockImplementation(async (key) => {
        if (key === 'acube_merchant_uuid') return 'merchant-123';
        return null;
      });

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockCreatePem).toHaveBeenCalledWith({
        merchant_uuid: 'merchant-123',
        address: {
          street_address: 'Via Milano 5',
          zip_code: '20100',
          city: 'Milano',
          province: 'MI'
        }
      });

      expect(result.current.state.result.posSerialNumber).toBe('POS-789');
      expect(result.current.state.result.registrationKey).toBe('REG-KEY-789');
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith('acube_current_pos_serial', 'POS-789');
    });

    it('should throw error when merchant UUID is missing', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'pos_creation',
        posInfo: mockPosInfo
      };

      // Mock no merchant UUID in storage
      mockSecureTokenStorage.getItem.mockResolvedValue(null);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.error).toContain('Merchant UUID is required for POS creation');
      expect(result.current.state.step).toBe('error');
    });
  });

  describe('Merchant Flow - POS Activation Step', () => {
    it('should activate POS successfully', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'pos_activation',
        posActivationInfo: mockPosActivationInfo
      };

      mockActivatePointOfSale.mockResolvedValue(undefined);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockActivatePointOfSale).toHaveBeenCalledWith('POS-SERIAL-456', {
        registration_key: 'REG-KEY-123'
      });

      expect(result.current.state.result.posSerialNumber).toBe('POS-SERIAL-456');
      expect(result.current.state.result.registrationKey).toBe('REG-KEY-123');
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith('acube_current_pos_serial', 'POS-SERIAL-456');
    });

    it('should handle already activated POS gracefully', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'pos_activation',
        posActivationInfo: mockPosActivationInfo
      };

      mockActivatePointOfSale.mockRejectedValue(new Error('POS already activated'));

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.result.posSerialNumber).toBe('POS-SERIAL-456');
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('Merchant Flow - Cash Register Creation Step', () => {
    it('should create cash register successfully', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'cash_register_creation',
        cashRegisterInfo: mockCashRegisterInfo
      };

      const mockCashRegister = {
        id: 'cash-reg-123',
        pem_serial_number: 'POS-123',
        name: 'Main Register',
        mtls_certificate: 'cert-data-123',
        private_key: 'private-key-data'
      };

      mockCreateCashRegister.mockResolvedValue(mockCashRegister);
      mockGetPointOfSaleBySerial.mockResolvedValue({ status: 'ACTIVE' } as any);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(mockCreateCashRegister).toHaveBeenCalledWith({
        pem_serial_number: 'POS-123',
        name: 'Main Register'
      });

      expect(result.current.state.result.cashRegisterId).toBe('cash-reg-123');
      expect(result.current.state.result.mtlsCertificate).toBe('cert-data-123');
    });

    it('should verify POS status before creating cash register', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'cash_register_creation',
        cashRegisterInfo: mockCashRegisterInfo
      };

      mockGetPointOfSaleBySerial.mockResolvedValue({ status: 'REGISTERED' } as any);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.error).toContain('POS device POS-123 is not active');
      expect(result.current.state.step).toBe('error');
    });
  });

  describe('Integration Tests with Test Component', () => {
    it('should handle complete provider flow integration', async () => {
      const stateChanges: any[] = [];
      const onStateChange = jest.fn((state) => stateChanges.push(state));

      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockLoginProvider.mockResolvedValue({
        access_token: 'token-123',
        token_type: 'Bearer',
        expires_in: 3600
      });

      renderReact(
        <TestComponent hookInput={input} onStateChange={onStateChange} />
      );

      expect(screen.getByTestId('step')).toHaveTextContent('authentication');
      expect(screen.getByTestId('next-step')).toHaveTextContent('merchant_check');
      expect(screen.getByTestId('progress')).toHaveTextContent('20');

      const user = userEvent.setup();
      await user.click(screen.getByTestId('compute'));

      await waitFor(() => {
        expect(mockLoginProvider).toHaveBeenCalled();
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('false');

      expect(screen.getByTestId('error')).toHaveTextContent('');
    });

    it('should handle error states correctly', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockLoginProvider.mockRejectedValue(new Error('Network error'));

      renderReact(<TestComponent hookInput={input} />);

      const user = userEvent.setup();
      await user.click(screen.getByTestId('compute'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent(/error/i);
      });

      expect(screen.getByTestId('step')).toHaveTextContent('error');

      // Test clear error
      await user.click(screen.getByTestId('clear-error'));

      expect(screen.getByTestId('error')).toHaveTextContent('');
    });

    it('should handle reset functionality', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      renderReact(<TestComponent hookInput={input} />);

      const user = userEvent.setup();
      await user.click(screen.getByTestId('reset'));

      expect(screen.getByTestId('step')).toHaveTextContent('authentication');
      expect(screen.getByTestId('error')).toHaveTextContent('');
      expect(screen.getByTestId('result')).toHaveTextContent('{}');
      expect(screen.getByTestId('can-skip')).toHaveTextContent('false');
    });
  });

  describe('Network Connectivity', () => {
    it('should handle network connectivity issues', async () => {
      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      mockIsConnected.mockReturnValue(false);

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      await act(async () => {
        await result.current.compute();
      });

      expect(result.current.state.error).toContain('No internet connection available');
      expect(result.current.state.step).toBe('error');
    });
  });

  describe('State Persistence', () => {
    it('should restore persisted state on initialization', async () => {
      mockPersistedState('merchant_creation', 'merchant-123', 'pos-456');

      const input: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      const { result } = renderHookReact(() => useOnboardingFlow(input), {
        wrapper: AllTheProvidersReact
      });

      // Wait for the effect to run
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.state.result.merchantUuid).toBe('merchant-123');
      expect(result.current.state.result.posSerialNumber).toBe('pos-456');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct input types for different steps', () => {
      // This test validates TypeScript compilation - if it compiles, types are correct
      
      const authInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'authentication',
        credentials: mockCredentials
      };

      const merchantCreationInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: mockMerchantInfo
      };

      const posCreationInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'pos_creation',
        posInfo: mockPosInfo
      };

      const merchantCheckInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_check'
      };

      const completedInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'completed'
      };

      const posActivationInput: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'pos_activation',
        posActivationInfo: mockPosActivationInfo
      };

      const cashRegisterInput: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'cash_register_creation',
        cashRegisterInfo: mockCashRegisterInfo
      };

      // If this compiles without errors, our types are working correctly
      expect(authInput.step).toBe('authentication');
      expect(merchantCreationInput.step).toBe('merchant_creation');
      expect(posCreationInput.step).toBe('pos_creation');
      expect(merchantCheckInput.step).toBe('merchant_check');
      expect(completedInput.step).toBe('completed');
      expect(posActivationInput.step).toBe('pos_activation');
      expect(cashRegisterInput.step).toBe('cash_register_creation');
    });

    it('should validate discriminated union types', () => {
      // Test that TypeScript prevents invalid combinations
      
      // Valid combinations should compile
      const validInputs: UseOnboardingFlowInput[] = [
        { role: 'provider', step: 'authentication', credentials: mockCredentials },
        { role: 'provider', step: 'merchant_creation', merchantInfo: mockMerchantInfo },
        { role: 'provider', step: 'pos_creation', posInfo: mockPosInfo },
        { role: 'provider', step: 'merchant_check' },
        { role: 'provider', step: 'completed' },
        { role: 'merchant', step: 'authentication', credentials: mockCredentials },
        { role: 'merchant', step: 'pos_activation', posActivationInfo: mockPosActivationInfo },
        { role: 'merchant', step: 'cash_register_creation', cashRegisterInfo: mockCashRegisterInfo },
        { role: 'merchant', step: 'completed' }
      ];

      expect(validInputs.length).toBe(9);
      validInputs.forEach(input => {
        expect(input.role).toBeDefined();
        expect(input.step).toBeDefined();
      });
    });
  });
});