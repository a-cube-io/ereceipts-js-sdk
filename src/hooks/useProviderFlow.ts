import { useCallback, useState } from 'react';
import { createMerchant } from '../api/mf2';
import { MerchantCreateInput, MerchantOutput } from '../api/types.generated';
import { ValidationResult, validateAddress, validateEmail, validateFiscalId } from '../utils/validation';

export interface ProviderFlowState {
  isLoading: boolean;
  currentStep: number;
  merchantData: Partial<MerchantCreateInput>;
  createdMerchant: MerchantOutput | null;
}

export interface UseProviderFlowReturn extends ProviderFlowState {
  error: string | null;
  setMerchantData: (data: Partial<MerchantCreateInput>) => void;
  validateCurrentStep: () => ValidationResult;
  createMerchantFlow: (data: MerchantCreateInput) => Promise<MerchantOutput>;
  nextStep: () => void;
  previousStep: () => void;
  resetFlow: () => void;
  clearError: () => void;
}

const TOTAL_STEPS = 3; // Account info, Business info, Address

export const useProviderFlow = (): UseProviderFlowReturn => {
  const [state, setState] = useState<ProviderFlowState>({
    isLoading: false,
    currentStep: 1,
    merchantData: {},
    createdMerchant: null,
  });
  
  const [error, setError] = useState<string | null>(null);

  const setMerchantData = useCallback((data: Partial<MerchantCreateInput>) => {
    setState(prev => ({
      ...prev,
      merchantData: { ...prev.merchantData, ...data },
    }));
  }, []);

  const validateCurrentStep = useCallback((): ValidationResult => {
    const { merchantData, currentStep } = state;
    
    switch (currentStep) {
      case 1: { // Account info
        const emailValidation = validateEmail(merchantData.email ?? '');
        const fiscalIdValidation = validateFiscalId(merchantData.fiscal_id ?? '');

        return {
          isValid: emailValidation.isValid && fiscalIdValidation.isValid,
          errors: [...emailValidation.errors, ...fiscalIdValidation.errors],
        };
      }
        
      case 2: // Business info
        if (!merchantData.name || merchantData.name.trim() === '') {
          return {
            isValid: false,
            errors: [{
              field: 'name',
              message: 'Business name is required',
              code: 'NAME_REQUIRED',
            }],
          };
        }
        return { isValid: true, errors: [] };
        
      case 3: // Address
        if (merchantData.address) {
          return validateAddress(merchantData.address);
        }
        return { isValid: true, errors: [] }; // Address is optional
        
      default:
        return { isValid: true, errors: [] };
    }
  }, [state]);

  const createMerchantFlow = useCallback(async (data: MerchantCreateInput): Promise<MerchantOutput> => {
    try {
      setError(null);
      setState(prev => ({ ...prev, isLoading: true }));
      
      const merchant = await createMerchant(data);
      
      setState(prev => ({
        ...prev,
        createdMerchant: merchant,
        isLoading: false,
      }));
      
      return merchant;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to create merchant';
      setError(errorMessage);
      
      setState(prev => ({ ...prev, isLoading: false }));
      throw err;
    }
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, TOTAL_STEPS),
    }));
  }, []);

  const previousStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const resetFlow = useCallback(() => {
    setState({
      isLoading: false,
      currentStep: 1,
      merchantData: {},
      createdMerchant: null,
    });
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    ...state,
    error,
    setMerchantData,
    validateCurrentStep,
    createMerchantFlow,
    nextStep,
    previousStep,
    resetFlow,
    clearError,
  };
};