import { B as BaseOpenAPIResource, H as HttpClient, c as components, a as CashRegisterId } from '../generated-CJUuxFn-.js';
import 'eventemitter3';

/**
 * Cash Registers Resource - OpenAPI Implementation
 * Type-safe implementation for cash register management
 *
 * Features:
 * - Cash register lifecycle management
 * - Registration and configuration
 * - Status monitoring and reporting
 * - Integration with Point of Sales devices
 */

type CashRegisterInput = components['schemas']['E-Receipt_IT_API_CashRegisterCreate'];
type CashRegisterOutput = components['schemas']['E-Receipt_IT_API_CashRegisterDetailedOutput'];
type CashRegisterPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_'];
interface CashRegisterValidationOptions {
    validateSerialNumber?: boolean;
    checkDuplicateRegistration?: boolean;
    enforceLocationValidation?: boolean;
}
interface CashRegisterConfiguration {
    id: CashRegisterId;
    name: string;
    location: string;
    serialNumber: string;
    model: string;
    manufacturer: string;
    installationDate: string;
    lastMaintenance?: string | undefined;
    nextMaintenance?: string | undefined;
    status: CashRegisterStatus;
    settings: CashRegisterSettings;
}
interface CashRegisterSettings {
    printReceipts: boolean;
    enableLottery: boolean;
    defaultVATRate: string;
    language: 'it' | 'en' | 'de' | 'fr';
    currency: 'EUR';
    timezone: string;
    paperSize: 'A4' | 'thermal_58mm' | 'thermal_80mm';
    connectionType: 'ethernet' | 'wifi' | 'cellular';
}
interface CashRegisterStats {
    registerId: CashRegisterId;
    totalTransactions: number;
    totalAmount: string;
    averageTransaction: string;
    transactionsToday: number;
    amountToday: string;
    lastTransaction?: string;
    uptime: {
        hours: number;
        percentage: number;
    };
    errorCount: number;
    maintenanceScore: number;
}
type CashRegisterStatus = 'active' | 'inactive' | 'maintenance' | 'error' | 'offline';
type MaintenanceType = 'routine' | 'repair' | 'upgrade' | 'calibration';
/**
 * Cash Registers Resource Class - OpenAPI Based
 * Manages cash register devices with full compliance
 */
declare class CashRegistersResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Create a new cash register
     *
     * @param data - Cash register input data
     * @param options - Validation options
     * @returns Promise resolving to created cash register
     */
    create(data: CashRegisterInput, options?: CashRegisterValidationOptions): Promise<CashRegisterOutput>;
    /**
     * Get a list of cash registers
     *
     * @returns Promise resolving to paginated cash register list
     */
    list(): Promise<CashRegisterPage>;
    /**
     * Get a specific cash register by ID
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to cash register details
     */
    retrieve(registerId: CashRegisterId | number): Promise<CashRegisterOutput>;
    /**
     * Get cash register configuration
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to configuration
     */
    getConfiguration(registerId: CashRegisterId | number): Promise<CashRegisterConfiguration>;
    /**
     * Get cash register statistics
     *
     * @param registerId - Cash register ID
     * @returns Promise resolving to statistics
     */
    getStatistics(registerId: CashRegisterId | number): Promise<CashRegisterStats>;
    /**
     * Update cash register settings (future enhancement)
     */
    updateSettings(registerId: CashRegisterId | number, settings: Partial<CashRegisterSettings>): Promise<CashRegisterOutput>;
    /**
     * Validate cash register input
     */
    private validateCashRegisterInput;
    /**
     * Check for duplicate serial number
     */
    private checkDuplicateSerial;
    /**
     * Validate serial number format
     */
    static validateSerialNumber(serialNumber: string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Build configuration from cash register data
     */
    static buildConfiguration(register: CashRegisterOutput): CashRegisterConfiguration;
    /**
     * Get default settings for cash registers
     */
    static getDefaultSettings(): CashRegisterSettings;
    /**
     * Calculate statistics for a cash register
     */
    static calculateStatistics(register: CashRegisterOutput): CashRegisterStats;
    /**
     * Format cash register for display
     */
    static formatForDisplay(register: CashRegisterOutput): {
        displayName: string;
        statusBadge: string;
        location: string;
        lastActivity: string;
        serialNumber: string;
    };
    /**
     * Generate maintenance schedule
     */
    static generateMaintenanceSchedule(_register: CashRegisterOutput): {
        nextMaintenance: string;
        maintenanceType: MaintenanceType;
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        estimatedDuration: string;
    };
    /**
     * Validate cash register compatibility with PEM device
     */
    static validatePEMCompatibility(register: CashRegisterOutput, pemModel: string): {
        compatible: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Check if firmware is outdated
     * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
     */
    /**
     * Generate health report for multiple cash registers
     */
    static generateFleetHealthReport(registers: CashRegisterOutput[]): {
        totalRegisters: number;
        activeRegisters: number;
        registersNeedingMaintenance: number;
        averageUptime: number;
        totalTransactionsToday: number;
        totalRevenueToday: string;
        statusBreakdown: Record<CashRegisterStatus, number>;
        topPerformers: {
            id: string;
            name: string;
            todayRevenue: string;
        }[];
    };
    /**
     * Generate installation checklist
     */
    static generateInstallationChecklist(): {
        preInstallation: string[];
        installation: string[];
        postInstallation: string[];
        testing: string[];
    };
}

export { type CashRegisterConfiguration, type CashRegisterSettings, type CashRegisterStats, type CashRegisterStatus, type CashRegisterValidationOptions, CashRegistersResource as CashRegisters, CashRegistersResource, type MaintenanceType };
