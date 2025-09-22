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
  createReceipt: (receiptData: ReceiptInput, optimistic?: boolean) => Promise<ReceiptOutput | null>;
  voidReceipt: (voidData: ReceiptReturnOrVoidViaPEMInput, optimistic?: boolean) => Promise<boolean>;
  returnReceipt: (returnData: ReceiptReturnOrVoidViaPEMInput, optimistic?: boolean) => Promise<ReceiptOutput | null>;
  getReceipt: (receiptUuid: string) => Promise<ReceiptOutput | null>;
  getReceiptDetails: (receiptUuid: string, format?: 'json' | 'pdf') => Promise<ReceiptDetailsOutput | Blob | null>;
  refreshReceipts: () => Promise<void>;
  clearError: () => void;
  /** Current count of pending optimistic operations */
  pendingOptimisticCount: number;
  /** Check if a receipt has pending optimistic updates */
  hasOptimisticUpdates: (receiptUuid: string) => boolean;
  /** Manually rollback optimistic operation */
  rollbackOptimistic: (operationId: string, reason?: string) => Promise<void>;
  /** Rollback all optimistic operations for receipt resource */
  rollbackReceiptOptimistics: (receiptUuid?: string) => Promise<void>;
  /** Get performance metrics for optimistic operations */
  getOptimisticPerformanceMetrics: () => any;
  /** Get performance summary for optimistic operations */
  getOptimisticPerformanceSummary: () => any;
}

/**
 * Hook for receipt operations
 */
export function useReceipts(): UseReceiptsReturn {
  const { sdk, isOnline } = useACube();
  const [receipts, setReceipts] = useState<ReceiptOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ACubeSDKError | null>(null);
  const [pendingOptimisticCount, setPendingOptimisticCount] = useState(0);

  const createReceipt = useCallback(async (receiptData: ReceiptInput, optimistic: boolean = true): Promise<ReceiptOutput | null> => {
    if (!sdk) {
      const receiptError = new ACubeSDKError('UNKNOWN_ERROR', 'SDK not initialized');
      setError(receiptError);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate optimistic receipt data
      const tempReceiptUuid = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const optimisticReceipt: ReceiptOutput = {
        uuid: tempReceiptUuid,
        type: 'sale',
        created_at: new Date().toISOString(),
        document_number: `TEMP-${tempReceiptUuid}`,
        total_amount: receiptData.items.reduce((sum, item) => {
          const itemTotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
          const discount = parseFloat(item.discount || '0');
          return sum + itemTotal - discount;
        }, 0).toFixed(2),
      };

      const cacheKey = `receipt:${tempReceiptUuid}`;

      if (optimistic && sdk.getOfflineManager().isOptimisticEnabled()) {
        // Use optimistic updates (works online and offline)
        const optimisticOperationId = await sdk.getOfflineManager().queueReceiptCreationWithOptimistic(
          receiptData,
          optimisticReceipt,
          cacheKey
        );

        if (optimisticOperationId) {
          // Add optimistic receipt to UI immediately
          setReceipts(prev => [optimisticReceipt, ...prev]);
          setPendingOptimisticCount(prev => prev + 1);
          
          return optimisticReceipt;
        }
      }

      if (isOnline) {
        // Online fallback: create immediately
        const receipt = await sdk.api!.receipts.create(receiptData);
        
        // Add to local list
        setReceipts(prev => [receipt, ...prev]);
        
        return receipt;
      } else {
        // Offline fallback: queue for later
        const operationId = await sdk.getOfflineManager().queueReceiptCreation(receiptData);
        
        // Use operation ID for temporary receipt
        const tempReceipt = { ...optimisticReceipt, uuid: operationId };
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

  const voidReceipt = useCallback(async (voidData: ReceiptReturnOrVoidViaPEMInput, _optimistic: boolean = true): Promise<boolean> => {
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

  const returnReceipt = useCallback(async (returnData: ReceiptReturnOrVoidViaPEMInput, _optimistic: boolean = true): Promise<ReceiptOutput | null> => {
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
          document_number: `TEMP-RETURN-${operationId}`,
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

  // Check if receipt has optimistic updates
  const hasOptimisticUpdates = useCallback((receiptUuid: string): boolean => {
    if (!sdk || !sdk.getOfflineManager().isOptimisticEnabled()) {
      return false;
    }
    return sdk.getOfflineManager().hasPendingOptimisticUpdates('receipt', receiptUuid);
  }, [sdk]);

  // Rollback specific optimistic operation
  const rollbackOptimistic = useCallback(async (operationId: string, reason?: string): Promise<void> => {
    if (!sdk) return;
    
    await sdk.getOfflineManager().rollbackOptimisticOperation(operationId, reason);
    
    // Update optimistic count
    if (sdk.getOfflineManager().isOptimisticEnabled()) {
      setPendingOptimisticCount(sdk.getOfflineManager().getOptimisticPendingCount());
    }
  }, [sdk]);

  // Rollback all optimistic operations for receipts
  const rollbackReceiptOptimistics = useCallback(async (receiptUuid?: string): Promise<void> => {
    if (!sdk) return;
    
    await sdk.getOfflineManager().rollbackOptimisticOperationsByResource('receipt', receiptUuid);
    
    // Update optimistic count
    if (sdk.getOfflineManager().isOptimisticEnabled()) {
      setPendingOptimisticCount(sdk.getOfflineManager().getOptimisticPendingCount());
    }
  }, [sdk]);

  // Get performance metrics
  const getOptimisticPerformanceMetrics = useCallback(() => {
    if (!sdk || !sdk.getOfflineManager().isOptimisticEnabled()) {
      return null;
    }
    
    return sdk.getOfflineManager().getOptimisticManager()?.getPerformanceMetrics() || null;
  }, [sdk]);

  // Get performance summary
  const getOptimisticPerformanceSummary = useCallback(() => {
    if (!sdk || !sdk.getOfflineManager().isOptimisticEnabled()) {
      return null;
    }
    
    return sdk.getOfflineManager().getOptimisticManager()?.getPerformanceSummary() || null;
  }, [sdk]);

  // Update optimistic count when SDK changes
  useEffect(() => {
    if (sdk && sdk.getOfflineManager().isOptimisticEnabled()) {
      const updateOptimisticCount = () => {
        setPendingOptimisticCount(sdk.getOfflineManager().getOptimisticPendingCount());
      };

      // Update immediately
      updateOptimisticCount();

      // Set up periodic updates (you might want to use events instead)
      const interval = setInterval(updateOptimisticCount, 1000);
      return () => clearInterval(interval);
    }
    
    return undefined;
  }, [sdk]);

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
    pendingOptimisticCount,
    hasOptimisticUpdates,
    rollbackOptimistic,
    rollbackReceiptOptimistics,
    getOptimisticPerformanceMetrics,
    getOptimisticPerformanceSummary,
  };
}