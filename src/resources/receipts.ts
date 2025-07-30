/**
 * Receipts Resource - OpenAPI Implementation
 * Type-safe implementation for electronic receipt management
 *
 * Features:
 * - Complete electronic receipt lifecycle management
 * - Type-safe input/output with branded types
 * - Advanced validation for Italian fiscal requirements
 * - Receipt item calculations and VAT handling
 * - PDF generation and details retrieval
 * - Return and void operations
 */

import type { HttpClient } from '@/http/client';
import type { components } from '@/types/generated';
import type { Amount, ReceiptId } from '@/types/branded';
import type { RequestOptions } from '@/resources/base-openapi';
import type { UnifiedStorage } from '@/storage/unified-storage';
import type { EnterpriseQueueManager } from '@/storage/queue/queue-manager';

import { ValidationError } from '@/errors/index';
import { ReceiptEndpoints } from '@/generated/endpoints';
import { BaseOpenAPIResource } from '@/resources/base-openapi';

// Extract types from OpenAPI generated types
type ReceiptInput = components['schemas']['E-Receipt_IT_API_ReceiptInput'];
type ReceiptOutput = components['schemas']['E-Receipt_IT_API_ReceiptOutput'];
type ReceiptPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_'];
type VoidReceiptRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type VoidReceiptOutput = ReceiptOutput; // Returns standard receipt output
type VoidReceiptWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];
type ReturnRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type ReturnWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];

export interface ReceiptListParams {
  page?: number | undefined;
  size?: number | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
  serial_number?: string | undefined;
}

export interface ReceiptValidationOptions {
  validateVATRates?: boolean;
  checkTotalCalculations?: boolean;
  enforceItalianFiscalRules?: boolean;
  maxReceiptItems?: number;
}

export interface ReceiptCalculationResult {
  subtotal: Amount;
  vatAmount: Amount;
  totalAmount: Amount;
  discountAmount: Amount;
  itemCount: number;
  breakdown: {
    vatRate: string;
    netAmount: Amount;
    vatAmount: Amount;
    grossAmount: Amount;
  }[];
}

export type ReceiptItemType = 'good' | 'service' | 'mixed';
export type PaymentMethod = 'cash' | 'electronic' | 'ticket_restaurant' | 'mixed';

/**
 * Receipts Resource Class - OpenAPI Based
 * Manages electronic receipts with full Italian fiscal compliance
 * Enhanced with offline-first capabilities
 */
export class ReceiptsResource extends BaseOpenAPIResource {
  constructor(client: HttpClient, storage?: UnifiedStorage | undefined, queueManager?: EnterpriseQueueManager | undefined) {
    super({
      client,
      storage: storage || undefined,
      queueManager: queueManager || undefined,
      offlineEnabled: Boolean(storage || queueManager),
      endpoints: {
        list: ReceiptEndpoints.LIST,
        create: ReceiptEndpoints.CREATE,
        void: ReceiptEndpoints.VOID,
        getByUuid: ReceiptEndpoints.GET_BY_UUID,
        voidWithProof: ReceiptEndpoints.VOID_WITH_PROOF,
        getDetails: ReceiptEndpoints.GET_DETAILS,
        returnItems: ReceiptEndpoints.RETURN_ITEMS,
        returnItemsWithProof: ReceiptEndpoints.RETURN_ITEMS_WITH_PROOF,
      },
    });
  }

  /**
   * Get a list of receipts with filtering and pagination
   * Enhanced with offline-first capabilities
   *
   * @param params - List parameters including filters and pagination
   * @param options - Request options including offline preferences
   * @returns Promise resolving to paginated receipt list
   */
  async list(params?: ReceiptListParams, options: Partial<RequestOptions> = {}): Promise<ReceiptPage> {
    return this.executeRequest<void, ReceiptPage>('list', undefined, {
      ...(params && { queryParams: params as Record<string, unknown> }),
      cacheTTL: 300, // Cache for 5 minutes
      queueIfOffline: false, // Read operations don't need queuing
      ...options,
      metadata: {
        operation: 'list_receipts',
        dateRange: params?.start_date && params?.end_date ? `${params.start_date} to ${params.end_date}` : undefined,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a new electronic receipt
   * Enhanced with offline queuing and optimistic updates
   *
   * @param data - Receipt input data with items and payment information
   * @param validationOptions - Validation options for fiscal compliance
   * @param requestOptions - Request options including offline preferences
   * @returns Promise resolving to created receipt
   */
  async create(
    data: ReceiptInput,
    validationOptions: ReceiptValidationOptions = {},
    requestOptions: Partial<RequestOptions> = {},
  ): Promise<ReceiptOutput> {
    // Validate input with Italian fiscal rules
    await this.validateReceiptInput(data, validationOptions);

    return this.executeRequest<ReceiptInput, ReceiptOutput>('create', data, {
      queueIfOffline: true, // Queue receipts when offline
      optimistic: true, // Provide immediate feedback
      ...requestOptions,
      metadata: {
        operation: 'create_receipt',
        itemCount: data.items.length,
        totalAmount: this.calculateTotalAmount(data).totalAmount,
      },
    });
  }

  /**
   * Void an electronic receipt
   * Enhanced with offline queuing for critical operations
   *
   * @param voidData - Void request data
   * @param options - Request options including offline preferences
   * @returns Promise resolving to void confirmation
   */
  async void(voidData: VoidReceiptRequest, options: Partial<RequestOptions> = {}): Promise<VoidReceiptOutput> {
    return this.executeRequest<VoidReceiptRequest, VoidReceiptOutput>('void', voidData, {
      queueIfOffline: true, // Critical operation - queue when offline
      optimistic: false, // Don't provide optimistic response for fiscal operations
      ...options,
      metadata: {
        operation: 'void_receipt',
        ...options.metadata,
      },
    });
  }

  /**
   * Get a specific receipt by UUID
   * Enhanced with intelligent caching for frequent lookups
   *
   * @param receiptId - Receipt UUID
   * @param options - Request options including offline preferences
   * @returns Promise resolving to receipt details
   */
  async retrieve(receiptId: ReceiptId | string, options: Partial<RequestOptions> = {}): Promise<ReceiptOutput> {
    return this.executeRequest<void, ReceiptOutput>('getByUuid', undefined, {
      pathParams: { receipt_uuid: receiptId },
      cacheTTL: 600, // Cache individual receipts for 10 minutes
      queueIfOffline: false, // Read operations don't need queuing
      ...options,
      metadata: {
        operation: 'get_receipt',
        receiptId,
        ...options.metadata,
      },
    });
  }

  /**
   * Void a receipt using proof of purchase
   *
   * @param voidData - Void request with proof data
   * @returns Promise resolving to void confirmation
   */
  async voidWithProof(voidData: VoidReceiptWithProofRequest): Promise<VoidReceiptOutput> {
    return this.executeRequest<VoidReceiptWithProofRequest, VoidReceiptOutput>('voidWithProof', voidData, {
      metadata: {
        operation: 'void_receipt_with_proof',
      },
    });
  }

  /**
   * Get receipt details or PDF
   *
   * @param receiptId - Receipt UUID
   * @param format - Response format ('json' or 'pdf')
   * @returns Promise resolving to receipt details or PDF blob
   */
  async getDetails(receiptId: ReceiptId | string, format: 'json' | 'pdf' = 'json'): Promise<components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'] | Blob> {
    const acceptHeader = format === 'pdf' ? 'application/pdf' : 'application/json';

    return this.executeRequest<void, components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'] | Blob>('getDetails', undefined, {
      pathParams: { receipt_uuid: receiptId },
      headers: { Accept: acceptHeader },
      metadata: {
        operation: 'get_receipt_details',
        receiptId,
        format,
      },
    });
  }

  /**
   * Return items from a receipt
   *
   * @param returnData - Return request data
   * @returns Promise resolving to return receipt
   */
  async returnItems(returnData: ReturnRequest): Promise<ReceiptOutput> {
    return this.executeRequest<ReturnRequest, ReceiptOutput>('returnItems', returnData, {
      metadata: {
        operation: 'return_receipt_items',
      },
    });
  }

  /**
   * Return items from a receipt using proof of purchase
   *
   * @param returnData - Return request with proof data
   * @returns Promise resolving to return receipt
   */
  async returnItemsWithProof(returnData: ReturnWithProofRequest): Promise<ReceiptOutput> {
    return this.executeRequest<ReturnWithProofRequest, ReceiptOutput>('returnItemsWithProof', returnData, {
      metadata: {
        operation: 'return_receipt_items_with_proof',
      },
    });
  }

  /**
   * Update an existing receipt
   *
   * @param receiptId - The receipt ID to update
   * @param updateData - Update data for the receipt
   * @returns Promise resolving to updated receipt
   */
  async update(receiptId: ReceiptId | string, updateData: Partial<ReceiptInput>): Promise<ReceiptOutput> {
    if (!this.hasOperation('updateReceipt')) {
      throw this.createUnsupportedOperationError('updateReceipt');
    }
    return this.executeRequest<{id: string} & Partial<ReceiptInput>, ReceiptOutput>('updateReceipt', {
      id: String(receiptId),
      ...updateData,
    }, {
      metadata: {
        operation: 'update_receipt',
        receiptId: String(receiptId),
      },
    });
  }

  /**
   * Delete a receipt
   *
   * @param receiptId - The receipt ID to delete
   * @returns Promise resolving to deletion confirmation
   */
  async delete(receiptId: ReceiptId | string): Promise<{ success: boolean; message?: string }> {
    if (!this.hasOperation('deleteReceipt')) {
      throw this.createUnsupportedOperationError('deleteReceipt');
    }
    return this.executeRequest<{id: string}, { success: boolean; message?: string }>('deleteReceipt', {
      id: String(receiptId),
    }, {
      metadata: {
        operation: 'delete_receipt',
        receiptId: String(receiptId),
      },
    });
  }

  // Validation methods

  /**
   * Comprehensive receipt input validation
   */
  private async validateReceiptInput(
    data: ReceiptInput,
    options: ReceiptValidationOptions = {},
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Basic validation
    if (!data.items || data.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Receipt must contain at least one item',
        code: 'NO_ITEMS',
      });
    }

    // Item count validation
    if (options.maxReceiptItems && data.items.length > options.maxReceiptItems) {
      errors.push({
        field: 'items',
        message: `Receipt cannot contain more than ${options.maxReceiptItems} items`,
        code: 'TOO_MANY_ITEMS',
      });
    }

    // Validate each item
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (!item) {continue;}
      const itemErrors = this.validateReceiptItem(item, i, options);
      errors.push(...itemErrors);
    }

    // Payment validation
    const paymentErrors = this.validatePaymentAmounts(data);
    errors.push(...paymentErrors);

    // Total calculation validation
    if (options.checkTotalCalculations) {
      const calculationErrors = this.validateCalculations(data);
      errors.push(...calculationErrors);
    }

    // Italian fiscal rules validation
    if (options.enforceItalianFiscalRules) {
      const fiscalErrors = this.validateItalianFiscalRules(data);
      errors.push(...fiscalErrors);
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid receipt input', 'create_receipt', errors);
    }
  }

  /**
   * Validate individual receipt item
   */
  private validateReceiptItem(
    item: components['schemas']['E-Receipt_IT_API_ReceiptItem'],
    index: number,
    options: ReceiptValidationOptions,
  ): Array<{ field: string; message: string; code: string }> {
    const errors: Array<{ field: string; message: string; code: string }> = [];
    const prefix = `items[${index}]`;

    // Required fields
    if (!item.description || item.description.trim().length === 0) {
      errors.push({
        field: `${prefix}.description`,
        message: 'Item description is required',
        code: 'REQUIRED',
      });
    }

    if (!item.quantity || parseFloat(item.quantity) <= 0) {
      errors.push({
        field: `${prefix}.quantity`,
        message: 'Item quantity must be greater than 0',
        code: 'INVALID_QUANTITY',
      });
    }

    if (!item.unit_price || parseFloat(item.unit_price) < 0) {
      errors.push({
        field: `${prefix}.unit_price`,
        message: 'Item unit price cannot be negative',
        code: 'INVALID_PRICE',
      });
    }

    // VAT rate validation
    if (options.validateVATRates && item.vat_rate_code) {
      const validVATRates = ['0', '4', '5', '10', '22']; // Italian VAT rates
      if (!validVATRates.includes(item.vat_rate_code)) {
        errors.push({
          field: `${prefix}.vat_rate_code`,
          message: `Invalid VAT rate. Valid rates: ${validVATRates.join(', ')}`,
          code: 'INVALID_VAT_RATE',
        });
      }
    }

    // Description length validation
    if (item.description && item.description.length > 200) {
      errors.push({
        field: `${prefix}.description`,
        message: 'Item description cannot exceed 200 characters',
        code: 'DESCRIPTION_TOO_LONG',
      });
    }

    return errors;
  }

  /**
   * Validate payment amounts
   */
  private validatePaymentAmounts(data: ReceiptInput): Array<{ field: string; message: string; code: string }> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    const cashAmount = parseFloat(data.cash_payment_amount || '0');
    const electronicAmount = parseFloat(data.electronic_payment_amount || '0');
    const ticketAmount = parseFloat(data.ticket_restaurant_payment_amount || '0');

    // At least one payment method must be used
    if (cashAmount <= 0 && electronicAmount <= 0 && ticketAmount <= 0) {
      errors.push({
        field: 'payment',
        message: 'At least one payment method must have a positive amount',
        code: 'NO_PAYMENT',
      });
    }

    // Negative amounts validation
    if (cashAmount < 0) {
      errors.push({
        field: 'cash_payment_amount',
        message: 'Cash payment amount cannot be negative',
        code: 'NEGATIVE_AMOUNT',
      });
    }

    if (electronicAmount < 0) {
      errors.push({
        field: 'electronic_payment_amount',
        message: 'Electronic payment amount cannot be negative',
        code: 'NEGATIVE_AMOUNT',
      });
    }

    if (ticketAmount < 0) {
      errors.push({
        field: 'ticket_restaurant_payment_amount',
        message: 'Ticket restaurant payment amount cannot be negative',
        code: 'NEGATIVE_AMOUNT',
      });
    }

    return errors;
  }

  /**
   * Validate calculation accuracy
   */
  private validateCalculations(data: ReceiptInput): Array<{ field: string; message: string; code: string }> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    try {
      const calculated = this.calculateTotalAmount(data);
      const totalPayments = parseFloat(data.cash_payment_amount || '0') +
                           parseFloat(data.electronic_payment_amount || '0') +
                           parseFloat(data.ticket_restaurant_payment_amount || '0');

      // Check if total payments match calculated total (with small tolerance for rounding)
      const tolerance = 0.01;
      if (Math.abs(totalPayments - parseFloat(calculated.totalAmount)) > tolerance) {
        errors.push({
          field: 'payment_total',
          message: `Payment total (${totalPayments.toFixed(2)}) does not match calculated total (${calculated.totalAmount})`,
          code: 'PAYMENT_MISMATCH',
        });
      }
    } catch (error) {
      errors.push({
        field: 'calculation',
        message: 'Failed to validate receipt calculations',
        code: 'CALCULATION_ERROR',
      });
    }

    return errors;
  }

  /**
   * Validate Italian fiscal compliance rules
   */
  private validateItalianFiscalRules(data: ReceiptInput): Array<{ field: string; message: string; code: string }> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Check for fiscal compliance requirements
    const totalAmount = parseFloat(this.calculateTotalAmount(data).totalAmount);

    // High-value transaction reporting (example threshold)
    if (totalAmount > 3000) {
      const cashAmount = parseFloat(data.cash_payment_amount || '0');
      if (cashAmount > 1000) {
        errors.push({
          field: 'cash_payment_amount',
          message: 'Cash payments over €1000 require additional documentation for transactions above €3000',
          code: 'HIGH_VALUE_CASH_LIMIT',
        });
      }
    }

    // Validate lottery code if provided (simplified check)
    if (data.customer_lottery_code && !/^[A-Z0-9]{16}$/.test(data.customer_lottery_code)) {
      errors.push({
        field: 'customer_lottery_code',
        message: 'Lottery code must be 16 alphanumeric characters',
        code: 'INVALID_LOTTERY_CODE',
      });
    }

    return errors;
  }

  // Calculation methods

  /**
   * Calculate total receipt amount with VAT breakdown
   */
  public calculateTotalAmount(data: ReceiptInput): ReceiptCalculationResult {
    let subtotal = 0;
    let totalVAT = 0;
    const totalDiscount = parseFloat(data.discount || '0');

    const vatBreakdown = new Map<string, { net: number; vat: number; gross: number }>();

    // Calculate item totals
    for (const item of data.items) {
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const itemDiscount = parseFloat(item.discount || '0');
      const vatRate = parseFloat(item.vat_rate_code || '0') / 100;

      // Calculate item total before VAT
      const itemNetTotal = (quantity * unitPrice) - itemDiscount;
      const itemVAT = itemNetTotal * vatRate;
      const itemGrossTotal = itemNetTotal + itemVAT;

      subtotal += itemNetTotal;
      totalVAT += itemVAT;

      // Track VAT breakdown
      const vatKey = item.vat_rate_code || '0';
      if (!vatBreakdown.has(vatKey)) {
        vatBreakdown.set(vatKey, { net: 0, vat: 0, gross: 0 });
      }
      const breakdown = vatBreakdown.get(vatKey)!;
      breakdown.net += itemNetTotal;
      breakdown.vat += itemVAT;
      breakdown.gross += itemGrossTotal;
    }

    // Apply global discount
    const finalSubtotal = subtotal - totalDiscount;
    const finalTotal = finalSubtotal + totalVAT;

    return {
      subtotal: finalSubtotal.toFixed(2) as Amount,
      vatAmount: totalVAT.toFixed(2) as Amount,
      totalAmount: finalTotal.toFixed(2) as Amount,
      discountAmount: (totalDiscount + data.items.reduce((sum, item) => sum + parseFloat(item.discount || '0'), 0)).toFixed(2) as Amount,
      itemCount: data.items.length,
      breakdown: Array.from(vatBreakdown.entries()).map(([vatRate, amounts]) => ({
        vatRate,
        netAmount: amounts.net.toFixed(2) as Amount,
        vatAmount: amounts.vat.toFixed(2) as Amount,
        grossAmount: amounts.gross.toFixed(2) as Amount,
      })),
    };
  }

  // Static utility methods

  /**
   * Format receipt for display
   */
  static formatReceiptForDisplay(receipt: ReceiptOutput): {
    receiptNumber: string;
    date: string;
    time: string;
    formattedTotal: string;
    paymentMethod: PaymentMethod;
    itemSummary: string;
  } {
    const date = new Date(receipt.created_at);

    return {
      receiptNumber: receipt.uuid.split('-')[0]?.toUpperCase() || 'UNKNOWN',
      date: date.toLocaleDateString('it-IT'),
      time: date.toLocaleTimeString('it-IT'),
      formattedTotal: `€ ${receipt.total_amount}`,
      paymentMethod: this.determinePaymentMethod(receipt),
      itemSummary: `0 items`, // items field not available in OpenAPI schema
    };
  }

  /**
   * Determine primary payment method
   */
  private static determinePaymentMethod(_receipt: ReceiptOutput): PaymentMethod {
    // Note: payment amount fields not available in OpenAPI schema
    // Using default payment method
    return 'cash'; // Default
  }

  /**
   * Generate receipt summary for reports
   */
  static generateReceiptSummary(receipts: ReceiptOutput[]): {
    totalCount: number;
    totalAmount: Amount;
    vatAmount: Amount;
    averageAmount: Amount;
    paymentMethodBreakdown: Record<PaymentMethod, { count: number; amount: Amount }>;
    dateRange: { from: string; to: string };
  } {
    const summary = {
      totalCount: receipts.length,
      totalAmount: '0.00' as Amount,
      vatAmount: '0.00' as Amount,
      averageAmount: '0.00' as Amount,
      paymentMethodBreakdown: {
        cash: { count: 0, amount: '0.00' as Amount },
        electronic: { count: 0, amount: '0.00' as Amount },
        ticket_restaurant: { count: 0, amount: '0.00' as Amount },
        mixed: { count: 0, amount: '0.00' as Amount },
      } as Record<PaymentMethod, { count: number; amount: Amount }>,
      dateRange: { from: '', to: '' },
    };

    if (receipts.length === 0) {return summary;}

    let totalAmount = 0;
    let totalVAT = 0;
    const dates = receipts.map(r => new Date(r.created_at)).sort((a, b) => a.getTime() - b.getTime());

    for (const receipt of receipts) {
      const amount = parseFloat(receipt.total_amount);
      totalAmount += amount;

      // Estimate VAT (simplified calculation)
      totalVAT += amount * 0.15; // Rough estimate

      const paymentMethod = this.determinePaymentMethod(receipt);
      summary.paymentMethodBreakdown[paymentMethod].count++;
      summary.paymentMethodBreakdown[paymentMethod].amount =
        (parseFloat(summary.paymentMethodBreakdown[paymentMethod].amount) + amount).toFixed(2) as Amount;
    }

    summary.totalAmount = totalAmount.toFixed(2) as Amount;
    summary.vatAmount = totalVAT.toFixed(2) as Amount;
    summary.averageAmount = (totalAmount / receipts.length).toFixed(2) as Amount;
    summary.dateRange.from = dates[0]?.toISOString().split('T')[0] || '';
    summary.dateRange.to = dates[dates.length - 1]?.toISOString().split('T')[0] || '';

    return summary;
  }

  /**
   * Validate receipt return eligibility
   */
  static validateReturnEligibility(receipt: ReceiptOutput, returnDate: Date = new Date()): {
    eligible: boolean;
    reason?: string;
    daysRemaining?: number;
  } {
    const receiptDate = new Date(receipt.created_at);
    const daysSinceReceipt = Math.floor((returnDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
    const returnPeriodDays = 30; // Example return period

    if (daysSinceReceipt > returnPeriodDays) {
      return {
        eligible: false,
        reason: `Return period expired. Returns allowed within ${returnPeriodDays} days.`,
      };
    }

    if (receipt.document_number?.includes('VOID')) {
      return {
        eligible: false,
        reason: 'Receipt has already been voided',
      };
    }

    return {
      eligible: true,
      daysRemaining: returnPeriodDays - daysSinceReceipt,
    };
  }

  /**
   * Generate fiscal code for lottery participation
   */
  static generateLotteryCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Offline-specific convenience methods

  /**
   * Get offline receipt statistics
   */
  async getOfflineReceiptStats() {
    const baseStats = await this.getOfflineStats();
    return {
      ...baseStats,
      resourceType: 'receipts',
      capabilities: {
        canCreateOffline: this.isQueueEnabled(),
        canReadOffline: this.isOfflineEnabled(),
        canCacheReceipts: this.isOfflineEnabled(),
      },
    };
  }

  /**
   * Sync all queued receipt operations
   */
  async syncQueuedReceipts(): Promise<void> {
    if (!this.isQueueEnabled()) {
      throw new ValidationError('Queue not enabled', 'sync_error', [
        { field: 'queue', message: 'Offline queue is not configured', code: 'QUEUE_NOT_ENABLED' },
      ]);
    }

    await this.syncQueuedOperations();
  }

  /**
   * Clear receipt cache (useful for data refresh)
   */
  async clearReceiptCache(): Promise<void> {
    await this.clearCache('receipts');
  }

  /**
   * Store receipt for offline access
   */
  async storeReceiptOffline(receiptId: string, receipt: ReceiptOutput): Promise<void> {
    const cacheKey = `GET:/receipts/{receipt_uuid}?path=receipt_uuid=${receiptId}`;
    await this.storeOfflineData(cacheKey, receipt);
  }
}

// Re-export for convenience
export { ReceiptsResource as Receipts };

// Export types for external use
export type {
  ReceiptPage,
  ReceiptInput,
  ReceiptOutput,
  ReturnRequest,
  VoidReceiptOutput,
  VoidReceiptRequest,
};
