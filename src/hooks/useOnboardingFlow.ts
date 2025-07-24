import { useCallback, useEffect, useState } from 'react';
import { 
  OnboardingState,
  OnboardingStep, 
  UseOnboardingFlowInput, 
  UseOnboardingFlowReturn
} from '../types/entities';
// API imports
import { isAuthenticated, loginMerchant, loginProvider } from '../api/auth';
import { createMerchant, getMerchants } from '../api/mf2';
import { activatePointOfSale, createCashRegister, getPointOfSales } from '../api/mf1';
// Storage and utilities
import { SecureTokenStorage } from '../storage/token';
import { isConnected } from '../utils/network';
import { apiLogger } from '../utils/logger';
// Context integration
import { useEReceipts } from '../providers/EReceiptsProvider';
// Constants
import { STORAGE_KEYS } from '../constants/keys';

/**
 * Custom hook for managing the onboarding flow step-by-step
 * 
 * This hook allows manual execution of individual onboarding steps with full control
 * over the flow progression. Each step can be executed independently and the hook
 * handles state management, error handling, and persistence.
 * 
 * **Provider Flow Steps:**
 * 1. authentication - Login provider (skips if already authenticated)
 * 2. merchant_check - Check existing merchants (skips creation if merchant exists)
 * 3. merchant_creation - Create new merchant (skips if merchant already exists)
 * 4. pos_creation - Create/register POS system (uses NEW or REGISTERED devices)
 * 5. completed - Onboarding complete
 * 
 * **Merchant Flow Steps:**
 * 1. authentication - Login merchant (skips if already authenticated)
 * 2. pos_activation - Activate POS with registration key (skips if POS already active)
 * 3. cash_register_creation - Create cash register (verifies POS is active)
 * 4. completed - Onboarding complete
 * 
 * **Smart Flow Logic:**
 * - Each step intelligently skips if already completed
 * - Handles existing resources gracefully
 * - Provides detailed error messages for troubleshooting
 * - Validates prerequisites before executing steps
 * 
 * @example
 * ```tsx
 * import { useOnboardingFlow } from '@a-cube-io/ereceipts-js-sdk';
 * 
 * function OnboardingComponent() {
 *   const { state, compute, reset, clearError } = useOnboardingFlow({
 *     role: 'provider',
 *     step: 'merchant_creation',
 *     credentials: { email: 'provider@example.com', password: 'password123' },
 *     merchantInfo: {
 *       fiscalId: '12345678901',
 *       name: 'My Store',
 *       email: 'store@example.com',
 *       address: {
 *         streetAddress: 'Via Roma 1',
 *         zipCode: '00100',
 *         city: 'Roma',
 *         province: 'RM'
 *       }
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       <p>Step: {state.step}</p>
 *       <p>Progress: {state.progress}%</p>
 *       {state.error && <p>Error: {state.error}</p>}
 *       
 *       <button onClick={compute} disabled={state.loading}>
 *         {state.loading ? 'Processing...' : 'Execute Step'}
 *       </button>
 *       
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useOnboardingFlow = (input: UseOnboardingFlowInput): UseOnboardingFlowReturn => {
  // Initialize state with default values
  const [state, setState] = useState<OnboardingState>({
    loading: false,
    step: input.step,
    error: null,
    progress: 0,
    result: {}
  });

  // Get EReceipts context for auth state integration
  const { refreshAuthStatus } = useEReceipts();

  // Calculate progress percentage based on current step and role
  const calculateProgress = useCallback((step: OnboardingStep, role: string): number => {
    const progressMap: Record<string, Record<OnboardingStep, number>> = {
      provider: {
        'authentication': 20,
        'merchant_check': 40,
        'merchant_creation': 60,
        'pos_creation': 80,
        'pos_activation': 0, // Not used in provider flow
        'cash_register_creation': 0, // Not used in provider flow
        'completed': 100,
        'error': 0
      },
      merchant: {
        'authentication': 25,
        'merchant_check': 0, // Not used in merchant flow
        'merchant_creation': 0, // Not used in merchant flow
        'pos_creation': 0, // Not used in merchant flow
        'pos_activation': 50,
        'cash_register_creation': 75,
        'completed': 100,
        'error': 0
      }
    };

    return progressMap[role]?.[step] ?? 0;
  }, []);

  // Update state helper function
  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Auto-calculate progress if step changed
      if (updates.step && updates.step !== prev.step) {
        newState.progress = calculateProgress(updates.step, input.role);
      }
      return newState;
    });
  }, [calculateProgress, input.role]);

  // Step execution functions
  const executeAuthenticationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing authentication step', { 
      role: input.role, 
      email: input.credentials?.email 
    });

    if (!input.credentials) {
      throw new Error('Credentials are required for authentication step');
    }

    const isAuth = await isAuthenticated();
    if (isAuth) {
      apiLogger.info('User already authenticated, skipping login');
      return;
    }

    apiLogger.info('User not authenticated, attempting login');
    
    if (input.role === 'provider') {
      await loginProvider(input.credentials.email, input.credentials.password);
    } else if (input.role === 'merchant') {
      await loginMerchant(input.credentials.email, input.credentials.password);
    } else {
      throw new Error(`Unsupported role for authentication: ${input.role}`);
    }

    await refreshAuthStatus(); // Update provider context
    apiLogger.info('Authentication successful', { role: input.role });
  }, [input.role, input.credentials, refreshAuthStatus]);

  const executeMerchantCheckStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing merchant check step');

    if (input.role !== 'provider') {
      throw new Error('Merchant check step is only available for provider role');
    }

    const existingMerchants = await getMerchants(1);
    
    if (existingMerchants && existingMerchants.length > 0) {
      apiLogger.info('Existing merchants found', { 
        merchantCount: existingMerchants.length,
        firstMerchantUuid: existingMerchants[0].uuid
      });
      
      const firstMerchant = existingMerchants[0];
      updateState({ 
        result: { 
          ...state.result, 
          merchantUuid: firstMerchant.uuid 
        } 
      });
      
      // Store merchant UUID for persistence
      await SecureTokenStorage.setItem(STORAGE_KEYS.MERCHANT_UUID, firstMerchant.uuid);
      
      // Skip to POS creation since merchant already exists
      apiLogger.info('Merchant already exists, proceeding to POS creation');
    } else {
      apiLogger.info('No existing merchants found, merchant creation will be required');
      // Don't update state here - let the merchant creation step handle it
    }
  }, [input.role, state.result, updateState]);

  const executeMerchantCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing merchant creation step');

    if (input.role !== 'provider') {
      throw new Error('Merchant creation step is only available for provider role');
    }

    if (!input.credentials || !input.merchantInfo) {
      throw new Error('Credentials and merchant info are required for merchant creation step');
    }

    // Check if merchant already exists before creating
    const existingMerchants = await getMerchants(1);
    if (existingMerchants && existingMerchants.length > 0) {
      const existingMerchant = existingMerchants[0];
      apiLogger.info('Merchant already exists, skipping creation', { 
        merchantUuid: existingMerchant.uuid 
      });
      
      updateState({ 
        result: { 
          ...state.result, 
          merchantUuid: existingMerchant.uuid 
        } 
      });

      await SecureTokenStorage.setItem(STORAGE_KEYS.MERCHANT_UUID, existingMerchant.uuid);
      return;
    }

    try {
      const newMerchant = await createMerchant({
        fiscal_id: input.merchantInfo.fiscalId,
        name: input.merchantInfo.name,
        email: input.merchantInfo.email,
        password: input.credentials.password, // Password is required for merchant creation
        address: {
          street_address: input.merchantInfo.address.streetAddress,
          zip_code: input.merchantInfo.address.zipCode,
          city: input.merchantInfo.address.city,
          province: input.merchantInfo.address.province
        }
      });

      apiLogger.info('Merchant created successfully', { merchantUuid: newMerchant.uuid });
      
      updateState({ 
        result: { 
          ...state.result, 
          merchantUuid: newMerchant.uuid 
        } 
      });

      // Store merchant UUID for persistence
      await SecureTokenStorage.setItem(STORAGE_KEYS.MERCHANT_UUID, newMerchant.uuid);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new Error(
          `A merchant with fiscal ID ${input.merchantInfo.fiscalId} already exists. ` +
          'Please use a different fiscal ID or contact support if you believe this is an error.'
        );
      }
      throw error;
    }
  }, [input.role, input.credentials, input.merchantInfo, state.result, updateState]);

  const executePOSCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing POS creation step');

    if (input.role !== 'provider') {
      throw new Error('POS creation step is only available for provider role');
    }

    // Check if there are existing POS devices
    const existingPOS = await getPointOfSales('NEW', 1, 10);
    
    if (existingPOS.members && existingPOS.members.length > 0) {
      // Use the first available NEW POS device
      const availablePOS = existingPOS.members[0];
      apiLogger.info('Using existing available POS device', { 
        serialNumber: availablePOS.serial_number 
      });
      
      updateState({ 
        result: { 
          ...state.result, 
          posSerialNumber: availablePOS.serial_number,
          registrationKey: 'generated-registration-key' // This would come from POS creation
        } 
      });

      // Store POS information for persistence
      await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, availablePOS.serial_number);
      
    } else {
      // Check for REGISTERED POS devices that might be available
      const registeredPOS = await getPointOfSales('REGISTERED', 1, 10);
      
      if (registeredPOS.members && registeredPOS.members.length > 0) {
        const registeredDevice = registeredPOS.members[0];
        apiLogger.info('Using existing registered POS device', { 
          serialNumber: registeredDevice.serial_number 
        });
        
        updateState({ 
          result: { 
            ...state.result, 
            posSerialNumber: registeredDevice.serial_number,
            registrationKey: 'existing-registration-key'
          } 
        });

        await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, registeredDevice.serial_number);
      } else {
        // No POS devices available - this is a business logic error
        throw new Error(
          'No POS devices available for registration. ' +
          'Please contact your system administrator to provision a new POS device ' +
          'or check if there are any pending device registrations.'
        );
      }
    }
  }, [input.role, state.result, updateState]);

  const executePOSActivationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing POS activation step');

    if (input.role !== 'merchant') {
      throw new Error('POS activation step is only available for merchant role');
    }

    if (!input.registrationKey) {
      throw new Error('Registration key is required for POS activation step');
    }

    // First, check if we have a POS serial number from storage or input
    let posSerialNumber: string | null = await SecureTokenStorage.getItem(STORAGE_KEYS.CURRENT_POS_SERIAL);
    
    if (!posSerialNumber) {
      // Check for existing ACTIVE POS devices first
      const activePOS = await getPointOfSales('ACTIVE', 1, 1);
      if (activePOS.members && activePOS.members.length > 0) {
        posSerialNumber = activePOS.members[0].serial_number;
        apiLogger.info('Found existing active POS device', { serialNumber: posSerialNumber });
        
        // POS is already active, no need to activate
        updateState({ 
          result: { 
            ...state.result, 
            posSerialNumber,
            registrationKey: input.registrationKey 
          } 
        });

        await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, posSerialNumber);
        return;
      }

      // Check for REGISTERED POS devices
      const registeredPOS = await getPointOfSales('REGISTERED', 1, 1);
      if (registeredPOS.members && registeredPOS.members.length > 0) {
        posSerialNumber = registeredPOS.members[0].serial_number;
        apiLogger.info('Found registered POS device for activation', { serialNumber: posSerialNumber });
      } else {
        // Try to find an available NEW POS device to activate
        const availablePOS = await getPointOfSales('NEW', 1, 1);
        if (availablePOS.members && availablePOS.members.length > 0) {
          posSerialNumber = availablePOS.members[0].serial_number;
          apiLogger.info('Found available NEW POS device for activation', { serialNumber: posSerialNumber });
        } else {
          throw new Error(
            'No POS device available for activation. ' +
            'Please ensure a POS device has been provisioned and is in NEW or REGISTERED status. ' +
            'Contact your system administrator if no devices are available.'
          );
        }
      }
    }

    // Activate the POS device
    if (!posSerialNumber) {
      throw new Error('No POS serial number available for activation');
    }

    try {
      await activatePointOfSale(posSerialNumber, input.registrationKey);
      apiLogger.info('POS activation successful', { serialNumber: posSerialNumber });
      
      updateState({ 
        result: { 
          ...state.result, 
          posSerialNumber,
          registrationKey: input.registrationKey 
        } 
      });

      // Store activated POS information
      await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, posSerialNumber);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already activated')) {
        apiLogger.info('POS device already activated', { serialNumber: posSerialNumber });
        
        updateState({ 
          result: { 
            ...state.result, 
            posSerialNumber,
            registrationKey: input.registrationKey 
          } 
        });

        await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, posSerialNumber);
      } else {
        throw new Error(
          `Failed to activate POS device ${posSerialNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }, [input.role, input.registrationKey, state.result, updateState]);

  const executeCashRegisterCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing cash register creation step');

    if (input.role !== 'merchant') {
      throw new Error('Cash register creation step is only available for merchant role');
    }

    // Get POS serial number from state or storage
    let posSerialNumber = state.result.posSerialNumber;
    if (!posSerialNumber) {
      const storedPosSerial = await SecureTokenStorage.getItem(STORAGE_KEYS.CURRENT_POS_SERIAL);
      posSerialNumber = storedPosSerial ? storedPosSerial : undefined;
    }

    if (!posSerialNumber) {
      throw new Error(
        'POS serial number is required for cash register creation. ' +
        'Please ensure POS activation step has been completed successfully.'
      );
    }

    // Verify POS is active before creating cash register
    try {
      const posDevices = await getPointOfSales('ACTIVE', 1, 10);
      const isPOSActive = posDevices.members?.some(pos => pos.serial_number === posSerialNumber);
      
      if (!isPOSActive) {
        throw new Error(
          `POS device ${posSerialNumber} is not active. ` +
          'Please ensure POS activation step has been completed successfully before creating cash register.'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not active')) {
        throw error;
      }
      // If we can't verify POS status, continue with creation but log warning
      apiLogger.warn('Could not verify POS status, proceeding with cash register creation', { 
        posSerialNumber 
      });
    }

    try {
      const cashRegister = await createCashRegister({
        pem_serial_number: posSerialNumber,
        name: `Cash Register - ${posSerialNumber}`
      });

      apiLogger.info('Cash register created successfully', { 
        cashRegisterId: cashRegister.id,
        mtlsCertificate: !!cashRegister.mtls_certificate 
      });
      
      updateState({ 
        result: { 
          ...state.result, 
          cashRegisterId: cashRegister.id,
          mtlsCertificate: cashRegister.mtls_certificate 
        } 
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new Error(
          `A cash register for POS ${posSerialNumber} already exists. ` +
          'Please use a different POS device or contact support if you believe this is an error.'
        );
      }
      throw new Error(
        `Failed to create cash register for POS ${posSerialNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [input.role, state.result, updateState]);

  const executeCompletedStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing completed step');
    
    // Mark onboarding as completed
    await SecureTokenStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, 'completed');
    
    apiLogger.info('Onboarding completed successfully', {
      role: input.role,
      result: state.result
    });
  }, [input.role, state.result]);

  // Main compute function that executes the current step
  const compute = useCallback(async (): Promise<void> => {
    // Check network connectivity before starting
    if (!await isConnected()) {
      const errorMessage = 'No internet connection available. Please check your network connection and try again.';
      apiLogger.error(errorMessage);
      updateState({ error: errorMessage, step: 'error', loading: false });
      return;
    }

    try {
      updateState({ loading: true, error: null });

      // Execute the appropriate step based on current step
      switch (input.step) {
        case 'authentication':
          await executeAuthenticationStep();
          break;
          
        case 'merchant_check':
          await executeMerchantCheckStep();
          break;
          
        case 'merchant_creation':
          await executeMerchantCreationStep();
          break;
          
        case 'pos_creation':
          await executePOSCreationStep();
          break;
          
        case 'pos_activation':
          await executePOSActivationStep();
          break;
          
        case 'cash_register_creation':
          await executeCashRegisterCreationStep();
          break;
          
        case 'completed':
          await executeCompletedStep();
          break;
          
        case 'error':
          // Error step doesn't execute anything
          break;
          
        default:
          throw new Error(`Unsupported step: ${input.step}. Valid steps are: authentication, merchant_check, merchant_creation, pos_creation, pos_activation, cash_register_creation, completed`);
      }

      // Persist current step
      await SecureTokenStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, input.step);
      
      updateState({ loading: false });
      
    } catch (error) {
      let errorMessage: string;
      
      if (error instanceof Error) {
        // Provide more specific error messages based on step
        switch (input.step) {
          case 'authentication':
            if (error.message.includes('credentials')) {
              errorMessage = 'Authentication failed: Invalid credentials. Please check your email and password.';
            } else if (error.message.includes('network')) {
              errorMessage = 'Authentication failed: Network error. Please check your internet connection.';
            } else {
              errorMessage = `Authentication failed: ${error.message}`;
            }
            break;
            
          case 'merchant_creation':
            if (error.message.includes('already exists')) {
              errorMessage = error.message; // Already specific
            } else if (error.message.includes('fiscal')) {
              errorMessage = 'Merchant creation failed: Invalid fiscal ID format. Please check the fiscal ID and try again.';
            } else {
              errorMessage = `Merchant creation failed: ${error.message}`;
            }
            break;
            
          case 'pos_creation':
            if (error.message.includes('No POS devices available')) {
              errorMessage = error.message; // Already specific
            } else {
              errorMessage = `POS creation failed: ${error.message}`;
            }
            break;
            
          case 'pos_activation':
            if (error.message.includes('No POS device available')) {
              errorMessage = error.message; // Already specific
            } else if (error.message.includes('registration key')) {
              errorMessage = 'POS activation failed: Invalid registration key. Please check the key and try again.';
            } else {
              errorMessage = `POS activation failed: ${error.message}`;
            }
            break;
            
          case 'cash_register_creation':
            if (error.message.includes('not active')) {
              errorMessage = error.message; // Already specific
            } else if (error.message.includes('already exists')) {
              errorMessage = error.message; // Already specific
            } else {
              errorMessage = `Cash register creation failed: ${error.message}`;
            }
            break;
            
          default:
            errorMessage = error.message;
        }
      } else {
        errorMessage = `Step execution failed: ${String(error)}`;
      }
      
      apiLogger.error(`Failed to execute step: ${input.step}`, error);
      updateState({ error: errorMessage, step: 'error', loading: false });
    }
  }, [
    input.step,
    executeAuthenticationStep,
    executeMerchantCheckStep,
    executeMerchantCreationStep,
    executePOSCreationStep,
    executePOSActivationStep,
    executeCashRegisterCreationStep,
    executeCompletedStep,
    updateState
  ]);

  // Reset function to clear state and start over
  const reset = useCallback((): void => {
    apiLogger.info('Resetting onboarding flow');
    setState({
      loading: false,
      step: input.step,
      error: null,
      progress: calculateProgress(input.step, input.role),
      result: {}
    });
  }, [input.step, input.role, calculateProgress]);

  // Clear error function
  const clearError = useCallback((): void => {
    updateState({ error: null });
  }, [updateState]);

  // Auto-load persisted state on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        // Check if there's an existing onboarding in progress
        const savedStep = await SecureTokenStorage.getItem(STORAGE_KEYS.ONBOARDING_STEP);
        const merchantUuid = await SecureTokenStorage.getItem(STORAGE_KEYS.MERCHANT_UUID);
        const posSerial = await SecureTokenStorage.getItem(STORAGE_KEYS.CURRENT_POS_SERIAL);

        if (savedStep && savedStep !== 'completed') {
          apiLogger.info('Restoring onboarding state from storage', { 
            step: savedStep,
            hasMerchant: !!merchantUuid,
            hasPOS: !!posSerial
          });

          updateState({
            step: savedStep as OnboardingStep,
            result: {
              merchantUuid: merchantUuid ? merchantUuid : undefined,
              posSerialNumber: posSerial ? posSerial : undefined
            }
          });
        }
      } catch (error) {
        apiLogger.error('Failed to load persisted onboarding state', error);
      }
    };

    void loadPersistedState();
  }, [updateState]);

  // Update step when input.step changes
  useEffect(() => {
    updateState({ step: input.step });
  }, [input.step, updateState]);

  return {
    state,
    compute,
    reset,
    clearError
  };
};