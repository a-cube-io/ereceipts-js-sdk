import { B as BaseOpenAPIResource, H as HttpClient, c as components, R as ReceiptId, A as Amount } from '../generated-CJUuxFn-.cjs';
import 'eventemitter3';

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

type ReceiptInput = components['schemas']['E-Receipt_IT_API_ReceiptInput'];
type ReceiptOutput = components['schemas']['E-Receipt_IT_API_ReceiptOutput'];
type ReceiptPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_'];
type VoidReceiptRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type VoidReceiptOutput = ReceiptOutput;
type VoidReceiptWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];
type ReturnRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidViaPEMInput'];
type ReturnWithProofRequest = components['schemas']['E-Receipt_IT_API_ReceiptReturnOrVoidWithProofInput'];
interface ReceiptListParams {
    page?: number | undefined;
    size?: number | undefined;
    start_date?: string | undefined;
    end_date?: string | undefined;
    serial_number?: string | undefined;
}
interface ReceiptValidationOptions {
    validateVATRates?: boolean;
    checkTotalCalculations?: boolean;
    enforceItalianFiscalRules?: boolean;
    maxReceiptItems?: number;
}
interface ReceiptCalculationResult {
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
type ReceiptItemType = 'good' | 'service' | 'mixed';
type PaymentMethod = 'cash' | 'electronic' | 'ticket_restaurant' | 'mixed';
/**
 * Receipts Resource Class - OpenAPI Based
 * Manages electronic receipts with full Italian fiscal compliance
 */
declare class ReceiptsResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of receipts with filtering and pagination
     *
     * @param params - List parameters including filters and pagination
     * @returns Promise resolving to paginated receipt list
     */
    list(params?: ReceiptListParams): Promise<ReceiptPage>;
    /**
     * Create a new electronic receipt
     *
     * @param data - Receipt input data with items and payment information
     * @param options - Validation options for fiscal compliance
     * @returns Promise resolving to created receipt
     */
    create(data: ReceiptInput, options?: ReceiptValidationOptions): Promise<ReceiptOutput>;
    /**
     * Void an electronic receipt
     *
     * @param voidData - Void request data
     * @returns Promise resolving to void confirmation
     */
    void(voidData: VoidReceiptRequest): Promise<VoidReceiptOutput>;
    /**
     * Get a specific receipt by UUID
     *
     * @param receiptId - Receipt UUID
     * @returns Promise resolving to receipt details
     */
    retrieve(receiptId: ReceiptId | string): Promise<ReceiptOutput>;
    /**
     * Void a receipt using proof of purchase
     *
     * @param voidData - Void request with proof data
     * @returns Promise resolving to void confirmation
     */
    voidWithProof(voidData: VoidReceiptWithProofRequest): Promise<VoidReceiptOutput>;
    /**
     * Get receipt details or PDF
     *
     * @param receiptId - Receipt UUID
     * @param format - Response format ('json' or 'pdf')
     * @returns Promise resolving to receipt details or PDF blob
     */
    getDetails(receiptId: ReceiptId | string, format?: 'json' | 'pdf'): Promise<components['schemas']['E-Receipt_IT_API_ReceiptDetailsOutput'] | Blob>;
    /**
     * Return items from a receipt
     *
     * @param returnData - Return request data
     * @returns Promise resolving to return receipt
     */
    returnItems(returnData: ReturnRequest): Promise<ReceiptOutput>;
    /**
     * Return items from a receipt using proof of purchase
     *
     * @param returnData - Return request with proof data
     * @returns Promise resolving to return receipt
     */
    returnItemsWithProof(returnData: ReturnWithProofRequest): Promise<ReceiptOutput>;
    /**
     * Comprehensive receipt input validation
     */
    private validateReceiptInput;
    /**
     * Validate individual receipt item
     */
    private validateReceiptItem;
    /**
     * Validate payment amounts
     */
    private validatePaymentAmounts;
    /**
     * Validate calculation accuracy
     */
    private validateCalculations;
    /**
     * Validate Italian fiscal compliance rules
     */
    private validateItalianFiscalRules;
    /**
     * Calculate total receipt amount with VAT breakdown
     */
    calculateTotalAmount(data: ReceiptInput): ReceiptCalculationResult;
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
    };
    /**
     * Determine primary payment method
     */
    private static determinePaymentMethod;
    /**
     * Generate receipt summary for reports
     */
    static generateReceiptSummary(receipts: ReceiptOutput[]): {
        totalCount: number;
        totalAmount: Amount;
        vatAmount: Amount;
        averageAmount: Amount;
        paymentMethodBreakdown: Record<PaymentMethod, {
            count: number;
            amount: Amount;
        }>;
        dateRange: {
            from: string;
            to: string;
        };
    };
    /**
     * Validate receipt return eligibility
     */
    static validateReturnEligibility(receipt: ReceiptOutput, returnDate?: Date): {
        eligible: boolean;
        reason?: string;
        daysRemaining?: number;
    };
    /**
     * Generate fiscal code for lottery participation
     */
    static generateLotteryCode(): string;
}

export { type PaymentMethod, type ReceiptCalculationResult, type ReceiptInput, type ReceiptItemType, type ReceiptListParams, type ReceiptOutput, type ReceiptPage, type ReceiptValidationOptions, ReceiptsResource as Receipts, ReceiptsResource, type ReturnRequest, type VoidReceiptOutput, type VoidReceiptRequest };
