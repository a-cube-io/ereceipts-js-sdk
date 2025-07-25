import { useCallback, useEffect, useState } from 'react';
import { 
  OnboardingResult,
  OnboardingRole,
  OnboardingState,
  OnboardingStep,
  UseOnboardingFlowInput, 
  UseOnboardingFlowReturn
} from '../types/entities';
// API imports
import { isAuthenticated, loginMerchant, loginProvider } from '../api/auth';
import { createMerchant, createPem, getMerchants } from '../api/mf2';
import { activatePointOfSale, createCashRegister, getPointOfSaleBySerial } from '../api/mf1';
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
  // Initialize state with default values - nextStep will be calculated after calculateNextStep is defined
  const [state, setState] = useState<OnboardingState>({
    loading: false,
    step: input.step,
    nextStep: null,
    error: null,
    progress: 0,
    result: {},
    canSkipToCompletion: false
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

  // Calculate next step based on current state and role
  const calculateNextStep = useCallback((currentStep: OnboardingStep, role: OnboardingRole, result: OnboardingResult): OnboardingStep | null => {
    if (role === 'provider') {
      switch (currentStep) {
        case 'authentication':
          return 'merchant_check';
        case 'merchant_check':
          // If existing merchants found, skip to completion
          if (result.existingMerchants && result.existingMerchants.length > 0) {
            return 'completed';
          }
          return 'merchant_creation';
        case 'merchant_creation':
          return 'pos_creation';
        case 'pos_creation':
          return 'completed';
        case 'completed':
          return null;
        default:
          return null;
      }
    } else if (role === 'merchant') {
      switch (currentStep) {
        case 'authentication':
          return 'pos_activation';
        case 'pos_activation':
          // If existing active POS found, skip to completion
          if (result.existingActivePOS && result.existingActivePOS.length > 0) {
            return 'completed';
          }
          return 'cash_register_creation';
        case 'cash_register_creation':
          return 'completed';
        case 'completed':
          return null;
        default:
          return null;
      }
    }
    return null;
  }, []);

  // Update state helper function
  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      // Auto-calculate progress if step changed
      if (updates.step && updates.step !== prev.step) {
        newState.progress = calculateProgress(updates.step, input.role);
      }
      // Auto-calculate next step if step or result changed
      if (updates.step ?? updates.result) {
        const currentStep = updates.step ?? prev.step;
        const currentResult = { ...prev.result, ...updates.result };
        newState.nextStep = calculateNextStep(currentStep, input.role, currentResult);
        
        // Check if we can skip to completion
        if (input.role === 'provider' && currentResult.existingMerchants && currentResult.existingMerchants.length > 0) {
          newState.canSkipToCompletion = true;
        }
        if (input.role === 'merchant' && currentResult.existingActivePOS && currentResult.existingActivePOS.length > 0) {
          newState.canSkipToCompletion = true;
        }
      }
      return newState;
    });
  }, [calculateProgress, calculateNextStep, input.role]);

  // Step execution functions
  const executeAuthenticationStep = useCallback(async (): Promise<void> => {
    if (input.step !== 'authentication') {
      apiLogger.error('Authentication step is only available for authentication step', { step: input.step });
      throw new Error(`Authentication step is only available for authentication step, got ${input.step} instead`);
    }

    if (!input.credentials) {
      apiLogger.error('Credentials are required for authentication step', { step: input.step });
      throw new Error(`Credentials are required for authentication step, got ${input.credentials} instead`);
    }

    apiLogger.info('Executing authentication step', { 
      role: input.role, 
      email: input.credentials.email 
    });

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
      apiLogger.error('Unsupported role for authentication', { role: input.role });
      throw new Error(`Unsupported role for authentication: ${input.role}`);
    }

    await refreshAuthStatus(); // Update provider context
    apiLogger.info('Authentication successful', { role: input.role });
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.role, refreshAuthStatus, input]);

  const executeMerchantCheckStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing merchant check step');

    if (input.role !== 'provider') {
      apiLogger.error('Merchant check step is only available for provider role', { role: input.role });
      throw new Error(`Merchant check step is only available for provider role, got ${input.role} instead`);
    }

    if (input.step !== 'merchant_check') {
      apiLogger.error('Merchant check step is only available for merchant check step', { step: input.step });
      throw new Error(`Merchant check step is only available for merchant check step, got ${input.step} instead`);
    }

    const existingMerchants = await getMerchants(1);
    
    if (existingMerchants && existingMerchants.length > 0) {
      apiLogger.info('Existing merchants found - provider onboarding complete', { 
        merchantCount: existingMerchants.length,
        firstMerchantUuid: existingMerchants[0].uuid
      });
      
      const firstMerchant = existingMerchants[0];
      
      // For providers, if merchants exist, onboarding is complete
      updateState({ 
        step: 'completed',
        result: { 
          ...state.result, 
          merchantUuid: firstMerchant.uuid,
          existingMerchants: existingMerchants.map(m => ({
            uuid: m.uuid ?? '',
            fiscalId: m.fiscal_id ?? '',
            name: m.name ?? '',
            email: m.email ?? '',
            address: m.address ? {
              streetAddress: m.address.street_address ?? '',
              zipCode: m.address.zip_code ?? '',
              city: m.address.city ?? '',
              province: m.address.province ?? ''
            } : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })),
          flowCompleted: true,
          skipReason: 'Provider already has existing merchants'
        }
      });
      
      // Store merchant UUID for persistence
      await SecureTokenStorage.setItem(STORAGE_KEYS.MERCHANT_UUID, firstMerchant.uuid ?? '');
      await SecureTokenStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, 'completed');
      
      apiLogger.info('Provider onboarding completed - existing merchants found');
    } else {
      apiLogger.info('No existing merchants found, merchant creation will be required');
      updateState({ 
        result: { 
          ...state.result, 
          existingMerchants: [],
          flowCompleted: false
        }
      });
    }
  }, [input.role, input.step, state.result, updateState]);

  const executeMerchantCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing merchant creation step');

    if (input.role !== 'provider') {
      apiLogger.error('Merchant creation step is only available for provider role', { role: input.role });
      throw new Error(`Merchant creation step is only available for provider role, got ${input.role} instead`);
    }

    if (input.step !== 'merchant_creation') {
      apiLogger.error('Merchant creation step is only available for merchant creation step', { step: input.step });
      throw new Error(`Merchant creation step is only available for merchant creation step, got ${input.step} instead`);
    }

    if (!input.merchantInfo) {
      apiLogger.error('Merchant info is required for merchant creation step', { step: input.step });
      throw new Error(`Merchant info is required for merchant creation step, got ${input.merchantInfo} instead`);
    }

    try {
      const newMerchant = await createMerchant({
        fiscal_id: input.merchantInfo.fiscalId,
        name: input.merchantInfo.name,
        email: input.merchantInfo.email,
        password: input.merchantInfo.password, // Password is required for merchant creation
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
      await SecureTokenStorage.setItem(STORAGE_KEYS.MERCHANT_UUID, newMerchant.uuid ?? '');
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        apiLogger.info('Merchant already exists, skipping creation', { 
          fiscalId: input.merchantInfo.fiscalId 
        });
        throw new Error(
          `A merchant with fiscal ID ${input.merchantInfo.fiscalId} already exists. ` +
          'Please use a different fiscal ID or contact support if you believe this is an error.'
        );
      }
      throw error;
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.result, updateState]);

  const executePOSCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing POS creation step');

    // provider and merchant can create a POS
    if (!['provider', 'merchant'].includes(input.role)) {
      apiLogger.error('POS creation step is only available for provider and merchant roles', { role: input.role });
      throw new Error(`POS creation step is only available for provider and merchant roles, got ${input.role} instead`);
    }

    if (input.step !== 'pos_creation') {
      apiLogger.error('POS creation step is only available for POS creation step', { step: input.step });
      throw new Error(`POS creation step is only available for POS creation step, got ${input.step} instead`);
    }

    if (!input.posInfo) {
      apiLogger.error('POS info is required for POS creation step', { step: input.step });
      throw new Error(`POS info is required for POS creation step, got ${input.posInfo} instead`);
    }

    
    try {
      // No POS devices available - this is a business logic error
      // LET'S CREATE A NEW POS
      apiLogger.error('No POS devices available for registration', { 
        step: input.step 
      });

      // get merchant uuid from state if not in storage
      const merchantUuid = state.result.merchantUuid ?? await SecureTokenStorage.getItem(STORAGE_KEYS.MERCHANT_UUID);
      if (!merchantUuid) {
        apiLogger.error('Merchant UUID is required for POS creation', { 
          step: input.step 
        });
        throw new Error('Merchant UUID is required for POS creation');
      }

      const newPem = await createPem({
        merchant_uuid: merchantUuid,
        address: {
          street_address: input.posInfo.address.streetAddress,
          zip_code: input.posInfo.address.zipCode,
          city: input.posInfo.address.city,
          province: input.posInfo.address.province
        }
      });

      apiLogger.info('New PEM created successfully', { 
        pemUuid: newPem.serial_number 
      });

      updateState({ 
        result: { 
          ...state.result, 
          posSerialNumber: newPem.serial_number,
          registrationKey: newPem.registration_key ?? undefined
        } 
      });

      await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, newPem.serial_number ?? '');
    } catch (error) {
      apiLogger.error('Failed to create POS', { error: error instanceof Error ? error.message : 'Unknown error' });
      updateState({
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'error',
        loading: false
      });
      throw error;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.role, input.step, state.result, updateState]);

  const executePOSActivationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing POS activation step');

    //merchant can activate a POS
    if (input.role !== 'merchant') {
      apiLogger.error('POS activation step is only available for merchant role', { role: input.role });
      throw new Error(`POS activation step is only available for merchant role, got ${input.role} instead`);
    }

    if (input.step !== 'pos_activation') {
      apiLogger.error('POS activation step is only available for POS activation step', { step: input.step });
      throw new Error(`POS activation step is only available for POS activation step, got ${input.step} instead`);
    }

    if (!input.posActivationInfo) {
      apiLogger.error('POS activation info is required for POS activation step', { step: input.step });
      throw new Error(`POS activation info is required for POS activation step, got ${input.posActivationInfo} instead`);
    }
        
    try {
      await activatePointOfSale(input.posActivationInfo.posSerialNumber, { registration_key: input.posActivationInfo.registrationKey });
      apiLogger.info('POS activation successful', { serialNumber: input.posActivationInfo.posSerialNumber });
      
      updateState({ 
        result: { 
          ...state.result, 
          posSerialNumber: input.posActivationInfo.posSerialNumber,
          registrationKey: input.posActivationInfo.registrationKey,
          existingActivePOS: []
        } 
      });

      // Store activated POS information
      await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, input.posActivationInfo.posSerialNumber);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already activated')) {
        apiLogger.info('POS device already activated', { 
          serialNumber: input.posActivationInfo.posSerialNumber,
          registrationKey: input.posActivationInfo.registrationKey
        });
        
        updateState({ 
          result: { 
            ...state.result, 
            posSerialNumber: input.posActivationInfo.posSerialNumber,
            registrationKey: input.posActivationInfo.registrationKey,
            existingActivePOS: []
          } 
        });

        await SecureTokenStorage.setItem(STORAGE_KEYS.CURRENT_POS_SERIAL, input.posActivationInfo.posSerialNumber);
      } else {
        apiLogger.error('Failed to activate POS device', { 
          serialNumber: input.posActivationInfo.posSerialNumber,
          registrationKey: input.posActivationInfo.registrationKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(
          `Failed to activate POS device ${input.posActivationInfo.posSerialNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.result, updateState]);

  const executeCashRegisterCreationStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing cash register creation step');

    if (input.role !== 'merchant') {
      apiLogger.error('Cash register creation step is only available for merchant role', { role: input.role });
      throw new Error(`Cash register creation step is only available for merchant role, got ${input.role} instead`);
    }

    if (input.step !== 'cash_register_creation') {
      apiLogger.error('Cash register creation step is only available for cash register creation step', { step: input.step });
      throw new Error(`Cash register creation step is only available for cash register creation step, got ${input.step} instead`);
    }

    if (!input.cashRegisterInfo) {
      apiLogger.error('Cash register info is required for cash register creation step', { step: input.step });
      throw new Error(`Cash register info is required for cash register creation step, got ${input.cashRegisterInfo} instead`);
    }


    // Verify POS is active before creating cash register
    try {
      const pos = await getPointOfSaleBySerial(input.cashRegisterInfo.pemSerialNumber);
      const isPOSActive = pos.status === 'ACTIVE';
      
      if (!isPOSActive) {
        apiLogger.error('POS device is not active', { 
          posSerialNumber: input.cashRegisterInfo.pemSerialNumber 
        });
        throw new Error(
          `POS device ${input.cashRegisterInfo.pemSerialNumber} is not active. ` +
          'Please ensure POS activation step has been completed successfully before creating cash register.'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not active')) {
        throw error;
      }
      // If we can't verify POS status, continue with creation but log warning
      apiLogger.warn('Could not verify POS status, proceeding with cash register creation', { 
        posSerialNumber: input.cashRegisterInfo.pemSerialNumber
      });
    }

    try {
      const cashRegister = await createCashRegister({
        pem_serial_number: input.cashRegisterInfo.pemSerialNumber,
        name: input.cashRegisterInfo.name
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
        apiLogger.error('Cash register already exists', { 
          pemSerialNumber: input.cashRegisterInfo.pemSerialNumber,
          name: input.cashRegisterInfo.name
        });
        throw new Error(
          `A cash register for POS ${input.cashRegisterInfo.pemSerialNumber} already exists. ` +
          'Please use a different POS device or contact support if you believe this is an error.'
        );
      }
      apiLogger.error('Failed to create cash register', { 
        pemSerialNumber: input.cashRegisterInfo.pemSerialNumber,
        name: input.cashRegisterInfo.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(
        `Failed to create cash register for POS ${input.cashRegisterInfo.pemSerialNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.result, updateState]);

  const executeCompletedStep = useCallback(async (): Promise<void> => {
    apiLogger.info('Executing completed step');
    
    // Mark onboarding as completed
    await SecureTokenStorage.setItem(STORAGE_KEYS.ONBOARDING_STEP, 'completed');
    
    apiLogger.info('Onboarding completed successfully', {
      role: input.role,
      result: state.result
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state.result]);

  // Main compute function that executes the current step
  const compute = useCallback(async (): Promise<void> => {
    // Check network connectivity before starting
    if (!isConnected()) {
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
          // TODO: handle error step
          // Error step doesn't execute anything
          break;
          
        default:
          apiLogger.error('Unsupported step', { step: input });
          throw new Error(`Unsupported step: ${input}. Valid steps are: authentication, merchant_check, merchant_creation, pos_creation, pos_activation, cash_register_creation, completed`);
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
  }, [updateState, input, executeAuthenticationStep, executeMerchantCheckStep, executeMerchantCreationStep, executePOSCreationStep, executePOSActivationStep, executeCashRegisterCreationStep, executeCompletedStep]);

  // Reset function to clear state and start over
  const reset = useCallback((): void => {
    apiLogger.info('Resetting onboarding flow');
    setState({
      loading: false,
      step: input.step,
      nextStep: calculateNextStep(input.step, input.role, {}),
      error: null,
      progress: calculateProgress(input.step, input.role),
      result: {},
      canSkipToCompletion: false
    });
  }, [input.step, input.role, calculateProgress, calculateNextStep]);

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

  // Calculate initial nextStep on mount
  useEffect(() => {
    const initialNextStep = calculateNextStep(input.step, input.role, {});
    setState(prev => ({
      ...prev,
      nextStep: initialNextStep,
      progress: calculateProgress(input.step, input.role)
    }));
  }, [calculateNextStep, calculateProgress, input.step, input.role]);

  return {
    state,
    compute,
    reset,
    clearError
  };
};