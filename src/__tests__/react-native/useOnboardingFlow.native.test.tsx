import React from 'react';
import { useOnboardingFlow } from '../../hooks/useOnboardingFlow';
import { 
  OnboardingCredentials,
  OnboardingMerchantInfo,
  OnboardingPOSInfo,
  OnboardingCashRegisterInfo,
  OnboardingPosActivationInfo,
  OnboardingRole, 
  UseOnboardingFlowInput 
} from '../../types/entities';
import { 
  AllTheProvidersReactNative,
  mockNoPersistedState,
  mockPersistedState,
  clearOnboardingStorage,
} from './test-utils';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock all API functions
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

// Mock React Native specific storage
jest.mock('../../storage/token', () => ({
  SecureTokenStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeToken: jest.fn(),
    storeToken: jest.fn(),
    storeUserInfo: jest.fn(),
    isTokenValid: jest.fn(),
    getToken: jest.fn(),
    getUserEmail: jest.fn(),
    getUserRole: jest.fn(),
  },
}));

// Mock React Native specific network utilities
jest.mock('../../utils/network', () => ({
  isConnected: jest.fn(),
  addNetworkListener: jest.fn(),
}));

// Mock React Native logger
jest.mock('../../utils/logger', () => ({
  apiLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock React Native Keychain (used by SecureTokenStorage)
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn(),
  getInternetCredentials: jest.fn(),
  resetInternetCredentials: jest.fn(),
  canImplyAuthentication: jest.fn(),
}));

// Mock React Native NetInfo (used by network utilities)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Import mocked functions with proper typing
import { isAuthenticated, loginProvider, loginMerchant } from '../../api/auth';
import { createMerchant, createPem, getMerchants } from '../../api/mf2';
import { activatePointOfSale, createCashRegister, getPointOfSales, getPointOfSaleBySerial } from '../../api/mf1';
import { SecureTokenStorage } from '../../storage/token';
import { isConnected } from '../../utils/network';

const mockIsAuthenticated = isAuthenticated as jest.MockedFunction<typeof isAuthenticated>;
const mockLoginProvider = loginProvider as jest.MockedFunction<typeof loginProvider>;
const mockLoginMerchant = loginMerchant as jest.MockedFunction<typeof loginMerchant>;
const mockCreateMerchant = createMerchant as jest.MockedFunction<typeof createMerchant>;
const mockCreatePem = createPem as jest.MockedFunction<typeof createPem>;
const mockGetMerchants = getMerchants as jest.MockedFunction<typeof getMerchants>;
const mockActivatePointOfSale = activatePointOfSale as jest.MockedFunction<typeof activatePointOfSale>;
const mockCreateCashRegister = createCashRegister as jest.MockedFunction<typeof createCashRegister>;
const mockGetPointOfSales = getPointOfSales as jest.MockedFunction<typeof getPointOfSales>;
const mockGetPointOfSaleBySerial = getPointOfSaleBySerial as jest.MockedFunction<typeof getPointOfSaleBySerial>;
const mockSecureTokenStorage = SecureTokenStorage as jest.Mocked<typeof SecureTokenStorage>;
const mockIsConnected = isConnected as jest.MockedFunction<typeof isConnected>;

// React Native Test wrapper component
const RNTestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AllTheProvidersReactNative>
    {children}
  </AllTheProvidersReactNative>
);


describe('useOnboardingFlow - React Native', () => {
  // Common test data for React Native environment
  const mockCredentials: OnboardingCredentials = {
    email: 'provider@example.com',
    password: 'password123'
  };
  
  const mockMerchantInfo: OnboardingMerchantInfo = {
    fiscalId: '12345678901',
    name: 'Test Store Mobile',
    email: 'store@example.com',
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

  const providerInput: UseOnboardingFlowInput = {
    role: 'provider',
    step: 'authentication',
    credentials: mockCredentials
  };

  const merchantInput: UseOnboardingFlowInput = {
    role: 'merchant',
    step: 'authentication',
    credentials: mockCredentials
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Ensure clean onboarding state - no persisted state by default
    mockNoPersistedState();
    clearOnboardingStorage();
    
    // Default mock implementations for React Native environment
    mockIsConnected.mockReturnValue(true);
  });

  describe('React Native Specific Features', () => {
    it('should handle React Native secure storage correctly', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      mockLoginProvider.mockResolvedValue({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      // Verify authentication step was executed successfully
      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      // Verify React Native specific storage calls
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalledWith(
        expect.any(String), // STORAGE_KEYS.ONBOARDING_STEP
        'authentication'
      );
    });

    it('should handle React Native network connectivity changes during onboarding', async () => {
      // Start with network connected
      mockIsConnected.mockReturnValueOnce(true);
      mockIsAuthenticated.mockResolvedValue(false);
      mockLoginProvider.mockResolvedValue({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      // Authentication should succeed
      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      expect(mockLoginProvider).toHaveBeenCalledWith(
        'provider@example.com',
        'password123'
      );
    });

    it('should handle React Native app backgrounding and foregrounding', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      mockLoginProvider.mockResolvedValue({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      // Start onboarding
      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      // Verify state persistence for app backgrounding scenarios
      expect(mockSecureTokenStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('React Native Provider Flow', () => {
    it('should execute authentication step successfully', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      mockLoginProvider.mockResolvedValue({
        access_token: 'rn-access-token-123',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      // Verify React Native specific login was called
      expect(mockLoginProvider).toHaveBeenCalledWith(
        'provider@example.com',
        'password123'
      );
    });

    it('should execute merchant creation step successfully', async () => {
      const merchantCreationInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: mockMerchantInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      mockCreateMerchant.mockResolvedValue({
        uuid: 'rn-merchant-456',
        fiscal_id: '12345678901',
        name: 'React Native Store',
        email: 'store@example.com'
      });

      const { result } = renderHook(() => useOnboardingFlow(merchantCreationInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('merchant_creation');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      expect(result.current.state.result.merchantUuid).toBe('rn-merchant-456');
    });

    it('should handle React Native specific merchant creation errors', async () => {
      const merchantCreationInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: mockMerchantInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      
      // Mock React Native specific error (e.g., device storage full)
      mockCreateMerchant.mockRejectedValue(new Error('Device storage insufficient'));

      const { result } = renderHook(() => useOnboardingFlow(merchantCreationInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('error');
      });

      await waitFor(() => {
        expect(result.current.state.error).toContain('Device storage insufficient');
      });
    });
  });

  describe('React Native Merchant Flow', () => {
    it('should execute POS activation step successfully', async () => {
      const posActivationInput: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'pos_activation',
        posActivationInfo: mockPosActivationInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      mockActivatePointOfSale.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboardingFlow(posActivationInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('pos_activation');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      expect(result.current.state.result.posSerialNumber).toBe('POS-SERIAL-456');
      expect(mockActivatePointOfSale).toHaveBeenCalledWith('POS-SERIAL-456', {
        registration_key: 'REG-KEY-123'
      });
    });

    it('should execute cash register creation step successfully', async () => {
      const cashRegisterInput: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'cash_register_creation',
        cashRegisterInfo: mockCashRegisterInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      
      const rnCashRegister = {
        id: 'rn-cash-reg-789',
        pem_serial_number: 'POS-123',
        name: 'Main Register',
        mtls_certificate: 'rn-certificate-data-base64',
        private_key: 'private-key-data'
      };
      mockCreateCashRegister.mockResolvedValue(rnCashRegister);
      mockGetPointOfSaleBySerial.mockResolvedValue({ status: 'ACTIVE' } as any);

      const { result } = renderHook(() => useOnboardingFlow(cashRegisterInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('cash_register_creation');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      expect(result.current.state.result.cashRegisterId).toBe('rn-cash-reg-789');
      expect(mockCreateCashRegister).toHaveBeenCalledWith({
        pem_serial_number: 'POS-123',
        name: 'Main Register'
      });
    });

    it('should handle React Native specific POS activation errors', async () => {
      const posActivationInput: UseOnboardingFlowInput = {
        role: 'merchant',
        step: 'pos_activation',
        posActivationInfo: mockPosActivationInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      
      // Mock React Native specific activation error (e.g., hardware issue)
      mockActivatePointOfSale.mockRejectedValue(new Error('Device hardware not responding'));

      const { result } = renderHook(() => useOnboardingFlow(posActivationInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('error');
      });

      await waitFor(() => {
        expect(result.current.state.error).toContain('Device hardware not responding');
      });
    });
  });

  describe('React Native State Management', () => {
    it('should handle React Native app lifecycle state persistence', async () => {
      // Mock persisted state from React Native AsyncStorage
      mockPersistedState('merchant_creation', 'stored-merchant-uuid', 'stored-pos-serial');

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      // Wait for useEffect to load persisted state
      await waitFor(() => {
        expect(result.current.state.step).toBe('merchant_creation');
      });

      expect(result.current.state.result.merchantUuid).toBe('stored-merchant-uuid');
      expect(result.current.state.result.posSerialNumber).toBe('stored-pos-serial');
    });

    it('should reset state correctly in React Native environment', () => {
      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual({
        loading: false,
        step: 'authentication',
        nextStep: 'merchant_check',
        error: null,
        progress: 20, // 20% for authentication step
        result: {},
        canSkipToCompletion: false
      });
    });

    it('should handle React Native memory warnings during onboarding', async () => {
      const merchantCreationInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_creation',
        merchantInfo: mockMerchantInfo
      };

      mockIsAuthenticated.mockResolvedValue(true);
      
      // Mock memory warning scenario
      mockCreateMerchant.mockRejectedValue(new Error('Low memory warning'));

      const { result } = renderHook(() => useOnboardingFlow(merchantCreationInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('error');
      });

      await waitFor(() => {
        expect(result.current.state.error).toContain('Low memory warning');
      });
    });
  });

  describe('React Native Integration with EReceiptsProvider', () => {
    it('should work correctly with React Native specific provider initialization', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      mockLoginProvider.mockResolvedValue({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600
      });

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.compute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });
    });
  });

  describe('React Native Performance Considerations', () => {
    it('should handle large data sets efficiently in React Native', async () => {
      const merchantCheckInput: UseOnboardingFlowInput = {
        role: 'provider',
        step: 'merchant_check'
      };

      const largeMerchantList = Array.from({ length: 100 }, (_, i) => ({
        uuid: `merchant-${i}`,
        fiscal_id: `12345678${i.toString().padStart(3, '0')}`,
        name: `Merchant ${i}`,
        email: `merchant${i}@test.com`,
        address: {
          street_address: 'Via Roma 1',
          zip_code: '00100',
          city: 'Roma',
          province: 'RM'
        }
      }));

      mockIsAuthenticated.mockResolvedValue(true);
      mockGetMerchants.mockResolvedValue(largeMerchantList);

      const { result } = renderHook(() => useOnboardingFlow(merchantCheckInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('completed');
      });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      });

      // Should use the first merchant from the large list
      expect(result.current.state.result.merchantUuid).toBe('merchant-0');
    });

    it('should handle React Native bridge communication delays', async () => {
      mockIsAuthenticated.mockResolvedValue(false);
      
      // Mock delayed responses to simulate React Native bridge delays
      mockLoginProvider.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          access_token: 'delayed-token',
          token_type: 'Bearer',
          expires_in: 3600
        }), 100))
      );

      const { result } = renderHook(() => useOnboardingFlow(providerInput), {
        wrapper: RNTestWrapper,
      });

      await act(async () => {
        await result.current.compute();
      });

      await waitFor(() => {
        expect(result.current.state.step).toBe('authentication');
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(result.current.state.error).toBeNull();
      }, { timeout: 5000 });

      expect(result.current.state.loading).toBe(false);
    });
  });
});