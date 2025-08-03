import { useState, useCallback, useEffect } from 'react';
import { useACube } from '../context';
import { 
  ReceiptInput, 
  ReceiptOutput, 
  ReceiptDetailsOutput,
  ReceiptReturnOrVoidViaPEMInput,
  Page,
  ACubeSDKError 
} from '../../';

/**
 * Receipts hook return type
 */
export interface UseReceiptsReturn {
  receipts: ReceiptOutput[];
  isLoading: boolean;
  error: ACubeSDKError | null;
  createReceipt: (receiptData: ReceiptInput) => Promise<ReceiptOutput | null>;
  voidReceipt: (voidData: ReceiptReturnOrVoidViaPEMInput) => Promise<boolean>;
  returnReceipt: (returnData: ReceiptReturnOrVoidViaPEMInput) => Promise<ReceiptOutput | null>;
  getReceipt: (receiptUuid: string) => Promise<ReceiptOutput | null>;
  getReceiptDetails: (receiptUuid: string, format?: 'json' | 'pdf') => Promise<ReceiptDetailsOutput | Blob | null>;
  refreshReceipts: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for receipt operations
 */
export function useReceipts(): UseReceiptsReturn {
  const { sdk, isOnline } = useACube();
  const [receipts, setReceipts] = useState<ReceiptOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ACubeSDKError | null>(null);

  const createReceipt = useCallback(async (receiptData: ReceiptInput): Promise<ReceiptOutput | null> => {
    if (!sdk) {
      const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(receiptError);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isOnline) {
        // Online: create immediately
        const receipt = await sdk.api!.receipts.create(receiptData);
        
        // Add to local list
        setReceipts(prev => [receipt, ...prev]);
        
        return receipt;
      } else {
        // Offline: queue for later
        const operationId = await sdk.getOfflineManager().queueReceiptCreation(receiptData);
        
        // Create a temporary receipt object for optimistic UI
        const tempReceipt: ReceiptOutput = {
          uuid: operationId,
          type: 'sale',
          created_at: new Date().toISOString(),
          total_amount: receiptData.items.reduce((sum, item) => {
            const itemTotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
            const discount = parseFloat(item.discount || '0');
            return sum + itemTotal - discount;
          }, 0).toFixed(2),
        };
        
        setReceipts(prev => [tempReceipt, ...prev]);
        
        return tempReceipt;
      }
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to create receipt', err);
      setError(receiptError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isOnline]);

  const voidReceipt = useCallback(async (voidData: ReceiptReturnOrVoidViaPEMInput): Promise<boolean> => {
    if (!sdk) {
      const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(receiptError);
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isOnline) {
        // Online: void immediately
        await sdk.api!.receipts.void(voidData);
        return true;
      } else {
        // Offline: queue for later
        await sdk.getOfflineManager().queueReceiptVoid(voidData);
        return true;
      }
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to void receipt', err);
      setError(receiptError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isOnline]);

  const returnReceipt = useCallback(async (returnData: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput | null> => {
    if (!sdk) {
      const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(receiptError);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isOnline) {
        // Online: return immediately
        const receipt = await sdk.api!.receipts.return(returnData);
        
        // Add to local list
        setReceipts(prev => [receipt, ...prev]);
        
        return receipt;
      } else {
        // Offline: queue for later
        const operationId = await sdk.getOfflineManager().queueReceiptReturn(returnData);
        
        // Create a temporary receipt object for optimistic UI
        const tempReceipt: ReceiptOutput = {
          uuid: operationId,
          type: 'return',
          created_at: new Date().toISOString(),
          total_amount: returnData.items.reduce((sum, item) => {
            const itemTotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
            const discount = parseFloat(item.discount || '0');
            return sum + itemTotal - discount;
          }, 0).toFixed(2),
        };
        
        setReceipts(prev => [tempReceipt, ...prev]);
        
        return tempReceipt;
      }
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to return receipt', err);
      setError(receiptError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isOnline]);

  const getReceipt = useCallback(async (receiptUuid: string): Promise<ReceiptOutput | null> => {
    if (!sdk || !isOnline) {
      return null;
    }

    try {
      setError(null);
      return await sdk.api!.receipts.get(receiptUuid);
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to get receipt', err);
      setError(receiptError);
      return null;
    }
  }, [sdk, isOnline]);

  const getReceiptDetails = useCallback(async (
    receiptUuid: string, 
    format: 'json' | 'pdf' = 'json'
  ): Promise<ReceiptDetailsOutput | Blob | null> => {
    if (!sdk || !isOnline) {
      return null;
    }

    try {
      setError(null);
      return await sdk.api!.receipts.getDetails(receiptUuid, format);
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to get receipt details', err);
      setError(receiptError);
      return null;
    }
  }, [sdk, isOnline]);

  const refreshReceipts = useCallback(async (): Promise<void> => {
    if (!sdk || !isOnline) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const page: Page<ReceiptOutput> = await sdk.api!.receipts.list({ page: 1, size: 50 });
      setReceipts(page.members || []);
    } catch (err) {
      const receiptError = err instanceof ACubeSDKError 
        ? err 
        : new ACubeSDKError('UNKNOWN_ERROR', 'Failed to refresh receipts', err);
      setError(receiptError);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, isOnline]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load receipts on mount if online
  useEffect(() => {
    if (sdk && isOnline) {
      refreshReceipts();
    }
  }, [sdk, isOnline, refreshReceipts]);

  return {
    receipts,
    isLoading,
    error,
    createReceipt,
    voidReceipt,
    returnReceipt,
    getReceipt,
    getReceiptDetails,
    refreshReceipts,
    clearError,
  };
}