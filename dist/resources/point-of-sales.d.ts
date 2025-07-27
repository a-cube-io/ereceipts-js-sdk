import { B as BaseOpenAPIResource, H as HttpClient, c as components, S as SerialNumber } from '../generated-CJUuxFn-.js';
import 'eventemitter3';

/**
 * Point of Sales Resource - OpenAPI Implementation
 * Type-safe implementation for PEM device management
 *
 * Features:
 * - Complete PEM device lifecycle management
 * - Activation and certificate management
 * - Status monitoring and control
 * - Journal closing operations
 * - Inactivity period management
 */

type PointOfSaleOutput = components['schemas']['E-Receipt_IT_API_PointOfSaleOutput'];
type PointOfSalePage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_'];
type ActivationRequest = components['schemas']['E-Receipt_IT_API_ActivationRequest'];
type InactivityRequest = components['schemas']['E-Receipt_IT_API_PEMStatusOfflineRequest'];
type ActivationOutput = Record<string, never>;
type CloseJournalRequest = void;
type CloseJournalOutput = Record<string, never>;
interface PointOfSaleValidationOptions {
    validateSerialNumber?: boolean;
    checkActivationStatus?: boolean;
    enforceStatusTransitions?: boolean;
}
interface DeviceStatus {
    serialNumber: SerialNumber;
    status: PEMStatus;
    lastSeen: string;
    certificateExpiry?: string | undefined;
    firmwareVersion?: string | undefined;
    batteryLevel?: number | undefined;
    connectivity: ConnectivityStatus;
}
interface JournalSummary {
    date: string;
    transactionCount: number;
    totalAmount: string;
    vatAmount: string;
    firstTransaction?: string;
    lastTransaction?: string;
    status: 'open' | 'closed' | 'pending';
}
type PEMStatus = components['schemas']['E-Receipt_IT_API_PEMStatus'];
type ConnectivityStatus = 'online' | 'offline' | 'intermittent' | 'unknown';
type ActivationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
/**
 * Point of Sales Resource Class - OpenAPI Based
 * Manages PEM devices with full Italian fiscal compliance
 */
declare class PointOfSalesResource extends BaseOpenAPIResource {
    constructor(client: HttpClient);
    /**
     * Get a list of Point of Sales devices
     *
     * @returns Promise resolving to paginated PEM list
     */
    list(): Promise<PointOfSalePage>;
    /**
     * Get a specific Point of Sale by serial number
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving to PEM details
     */
    retrieve(serialNumber: SerialNumber | string): Promise<PointOfSaleOutput>;
    /**
     * Close the daily journal for a Point of Sale
     *
     * @returns Promise resolving to close confirmation
     */
    closeJournal(): Promise<CloseJournalOutput>;
    /**
     * Trigger activation process for a Point of Sale
     *
     * @param serialNumber - Device serial number
     * @param activationData - Activation request data
     * @param options - Validation options
     * @returns Promise resolving to activation status
     */
    activate(serialNumber: SerialNumber | string, activationData: ActivationRequest, options?: PointOfSaleValidationOptions): Promise<ActivationOutput>;
    /**
     * Create an inactivity period for a Point of Sale
     *
     * @param serialNumber - Device serial number
     * @param inactivityData - Inactivity period request data
     * @returns Promise resolving when inactivity period is created
     */
    createInactivityPeriod(serialNumber: SerialNumber | string, inactivityData: InactivityRequest): Promise<void>;
    /**
     * Set Point of Sale status to offline
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving when status is updated
     */
    setOffline(serialNumber: SerialNumber | string): Promise<void>;
    /**
     * Get device status summary
     *
     * @param serialNumber - Device serial number
     * @returns Promise resolving to device status
     */
    getDeviceStatus(serialNumber: SerialNumber | string): Promise<DeviceStatus>;
    /**
     * Get journal summary for a specific date
     *
     * @param serialNumber - Device serial number
     * @param date - Date in YYYY-MM-DD format
     * @returns Promise resolving to journal summary
     */
    getJournalSummary(_serialNumber: SerialNumber | string, date?: string): Promise<JournalSummary>;
    /**
     * Validate activation request
     */
    private validateActivationRequest;
    /**
     * Validate registration key format
     */
    private validateRegistrationKey;
    /**
     * Validate serial number format
     */
    static validateSerialNumber(serialNumber: SerialNumber | string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Analyze device status from device data
     */
    static analyzeDeviceStatus(device: PointOfSaleOutput): DeviceStatus;
    /**
     * Determine connectivity status from device data
     */
    private static determineConnectivityStatus;
    /**
     * Format device for display
     */
    static formatDeviceForDisplay(device: PointOfSaleOutput): {
        displayName: string;
        statusBadge: string;
        location: string;
        lastActivity: string;
        certificateStatus: string;
    };
    /**
     * Calculate device uptime
     */
    static calculateUptime(_device: PointOfSaleOutput): {
        uptimeHours: number;
        uptimePercentage: number;
        availabilityStatus: 'excellent' | 'good' | 'poor' | 'critical';
    };
    /**
     * Generate device health report
     */
    static generateHealthReport(devices: PointOfSaleOutput[]): {
        totalDevices: number;
        activeDevices: number;
        offlineDevices: number;
        devicesRequiringAttention: number;
        avgUptimePercentage: number;
        certificateExpiringCount: number;
        statusBreakdown: Record<PEMStatus, number>;
    };
    /**
     * Validate journal closing eligibility
     */
    static validateJournalClosingEligibility(device: PointOfSaleOutput, _date: string): {
        canClose: boolean;
        reasons: string[];
        requirements: string[];
    };
    /**
     * Get recommended maintenance schedule
     */
    static getMaintenanceSchedule(_device: PointOfSaleOutput): {
        nextMaintenance: string;
        maintenanceType: 'routine' | 'certificate' | 'firmware' | 'urgent';
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        estimatedDuration: string;
    };
    /**
     * Check if firmware version is outdated
     * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
     */
    /**
     * Generate activation code for new devices
     */
    static generateActivationCode(): string;
}

export { type ActivationOutput, type ActivationRequest, type ActivationStatus, type CloseJournalOutput, type CloseJournalRequest, type ConnectivityStatus, type DeviceStatus, type InactivityRequest, type JournalSummary, type PEMStatus, type PointOfSaleOutput, type PointOfSalePage, type PointOfSaleValidationOptions, PointOfSalesResource as PointOfSales, PointOfSalesResource };
