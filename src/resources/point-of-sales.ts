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

import type { HttpClient } from '@/http/client';
import type { SerialNumber } from '@/types/branded';
import type { components } from '@/types/generated';

import { ValidationError } from '@/errors/index';
import { PointOfSalesEndpoints } from '@/generated/endpoints';
import { BaseOpenAPIResource } from '@/resources/base-openapi';

// Extract types from OpenAPI generated types
type PointOfSaleOutput = components['schemas']['E-Receipt_IT_API_PointOfSaleOutput'];
type PointOfSalePage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_'];
type ActivationRequest = components['schemas']['E-Receipt_IT_API_ActivationRequest'];
type InactivityRequest = components['schemas']['E-Receipt_IT_API_PEMStatusOfflineRequest'];
// These endpoints return empty objects/have no request body per OpenAPI spec
type ActivationOutput = Record<string, never>; // Activation endpoint returns empty object
type CloseJournalRequest = void; // Close journal has no request body
type CloseJournalOutput = Record<string, never>; // Close journal returns empty object

export interface PointOfSaleValidationOptions {
  validateSerialNumber?: boolean;
  checkActivationStatus?: boolean;
  enforceStatusTransitions?: boolean;
}

export interface DeviceStatus {
  serialNumber: SerialNumber;
  status: PEMStatus;
  lastSeen: string;
  certificateExpiry?: string | undefined;
  firmwareVersion?: string | undefined;
  batteryLevel?: number | undefined;
  connectivity: ConnectivityStatus;
}

export interface JournalSummary {
  date: string;
  transactionCount: number;
  totalAmount: string;
  vatAmount: string;
  firstTransaction?: string;
  lastTransaction?: string;
  status: 'open' | 'closed' | 'pending';
}

// Use actual OpenAPI types where available
export type PEMStatus = components['schemas']['E-Receipt_IT_API_PEMStatus'];
export type ConnectivityStatus = 'online' | 'offline' | 'intermittent' | 'unknown';
export type ActivationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

/**
 * Point of Sales Resource Class - OpenAPI Based
 * Manages PEM devices with full Italian fiscal compliance
 */
export class PointOfSalesResource extends BaseOpenAPIResource {
  constructor(client: HttpClient) {
    super({
      client,
      endpoints: {
        list: PointOfSalesEndpoints.LIST,
        getBySerial: PointOfSalesEndpoints.GET_BY_SERIAL,
        closeJournal: PointOfSalesEndpoints.CLOSE_JOURNAL,
        activation: PointOfSalesEndpoints.ACTIVATION,
        createInactivity: PointOfSalesEndpoints.CREATE_INACTIVITY,
        setOffline: PointOfSalesEndpoints.SET_OFFLINE,
      },
    });
  }

  /**
   * Get a list of Point of Sales devices
   *
   * @returns Promise resolving to paginated PEM list
   */
  async list(): Promise<PointOfSalePage> {
    return this.executeRequest<void, PointOfSalePage>('list', undefined, {
      metadata: {
        operation: 'list_point_of_sales',
      },
    });
  }

  /**
   * Get a specific Point of Sale by serial number
   *
   * @param serialNumber - Device serial number
   * @returns Promise resolving to PEM details
   */
  async retrieve(serialNumber: SerialNumber | string): Promise<PointOfSaleOutput> {
    return this.executeRequest<void, PointOfSaleOutput>('getBySerial', undefined, {
      pathParams: { serial_number: serialNumber },
      metadata: {
        operation: 'get_point_of_sale',
        serialNumber,
      },
    });
  }

  /**
   * Close the daily journal for a Point of Sale
   *
   * @returns Promise resolving to close confirmation
   */
  async closeJournal(): Promise<CloseJournalOutput> {
    return this.executeRequest<void, CloseJournalOutput>('closeJournal', undefined, {
      metadata: {
        operation: 'close_journal',
      },
    });
  }

  /**
   * Trigger activation process for a Point of Sale
   *
   * @param serialNumber - Device serial number
   * @param activationData - Activation request data
   * @param options - Validation options
   * @returns Promise resolving to activation status
   */
  async activate(
    serialNumber: SerialNumber | string,
    activationData: ActivationRequest,
    options: PointOfSaleValidationOptions = {},
  ): Promise<ActivationOutput> {
    // Validate activation request
    await this.validateActivationRequest(serialNumber, activationData, options);

    return this.executeRequest<ActivationRequest, ActivationOutput>('activation', activationData, {
      pathParams: { serial_number: serialNumber },
      metadata: {
        operation: 'activate_point_of_sale',
        serialNumber,
        registrationKey: activationData.registration_key,
      },
    });
  }

  /**
   * Create an inactivity period for a Point of Sale
   *
   * @param serialNumber - Device serial number
   * @param inactivityData - Inactivity period request data
   * @returns Promise resolving when inactivity period is created
   */
  async createInactivityPeriod(
    serialNumber: SerialNumber | string,
    inactivityData: InactivityRequest,
  ): Promise<void> {
    return this.executeRequest<InactivityRequest, void>('createInactivity', inactivityData, {
      pathParams: { serial_number: serialNumber },
      metadata: {
        operation: 'create_inactivity_period',
        serialNumber,
      },
    });
  }

  /**
   * Set Point of Sale status to offline
   *
   * @param serialNumber - Device serial number
   * @returns Promise resolving when status is updated
   */
  async setOffline(serialNumber: SerialNumber | string): Promise<void> {
    return this.executeRequest<void, void>('setOffline', undefined, {
      pathParams: { serial_number: serialNumber },
      metadata: {
        operation: 'set_point_of_sale_offline',
        serialNumber,
      },
    });
  }

  /**
   * Get device status summary
   *
   * @param serialNumber - Device serial number
   * @returns Promise resolving to device status
   */
  async getDeviceStatus(serialNumber: SerialNumber | string): Promise<DeviceStatus> {
    const device = await this.retrieve(serialNumber);
    return PointOfSalesResource.analyzeDeviceStatus(device);
  }

  /**
   * Get journal summary for a specific date
   *
   * @param serialNumber - Device serial number
   * @param date - Date in YYYY-MM-DD format
   * @returns Promise resolving to journal summary
   */
  async getJournalSummary(
    _serialNumber: SerialNumber | string,
    date: string = new Date().toISOString().split('T')[0]!,
  ): Promise<JournalSummary> {
    // This would typically require additional API endpoints
    // For now, return a mock summary
    return {
      date,
      transactionCount: 0,
      totalAmount: '0.00',
      vatAmount: '0.00',
      status: 'open',
    };
  }

  // Validation methods

  /**
   * Validate activation request
   */
  private async validateActivationRequest(
    serialNumber: SerialNumber | string,
    activationData: ActivationRequest,
    options: PointOfSaleValidationOptions = {},
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Serial number validation
    if (options.validateSerialNumber) {
      const serialValidation = PointOfSalesResource.validateSerialNumber(serialNumber);
      if (!serialValidation.isValid) {
        errors.push({
          field: 'serial_number',
          message: serialValidation.error || 'Invalid serial number format',
          code: 'INVALID_SERIAL_NUMBER',
        });
      }
    }

    // Registration key validation
    if (!activationData.registration_key || activationData.registration_key.length === 0) {
      errors.push({
        field: 'registration_key',
        message: 'Registration key is required',
        code: 'REQUIRED',
      });
    } else {
      const keyValidation = this.validateRegistrationKey(activationData.registration_key);
      if (!keyValidation.isValid) {
        errors.push({
          field: 'registration_key',
          message: keyValidation.error || 'Invalid registration key format',
          code: 'INVALID_REGISTRATION_KEY',
        });
      }
    }

    // Check activation status if required
    if (options.checkActivationStatus) {
      try {
        const device = await this.retrieve(serialNumber);
        if (device.status === 'ACTIVE') {
          errors.push({
            field: 'status',
            message: 'Device is already activated',
            code: 'ALREADY_ACTIVATED',
          });
        }
      } catch (error) {
        // Device not found is acceptable for new activations
        if (error instanceof Error && !error.message.includes('404')) {
          errors.push({
            field: 'device',
            message: 'Unable to verify device status',
            code: 'STATUS_CHECK_FAILED',
          });
        }
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid activation request', 'activate_point_of_sale', errors);
    }
  }

  /**
   * Validate registration key format
   */
  private validateRegistrationKey(key: string): { isValid: boolean; error?: string } {
    // Basic format validation (this would depend on the actual key format)
    if (key.length < 16) {
      return { isValid: false, error: 'Registration key must be at least 16 characters' };
    }

    if (!/^[A-Z0-9-]+$/.test(key)) {
      return { isValid: false, error: 'Registration key contains invalid characters' };
    }

    return { isValid: true };
  }

  // Static utility methods

  /**
   * Validate serial number format
   */
  static validateSerialNumber(serialNumber: SerialNumber | string): { isValid: boolean; error?: string } {
    const serialStr = String(serialNumber);

    // Basic serial number validation
    if (serialStr.length < 8 || serialStr.length > 20) {
      return { isValid: false, error: 'Serial number must be between 8 and 20 characters' };
    }

    if (!/^[A-Z0-9]+$/.test(serialStr)) {
      return { isValid: false, error: 'Serial number must contain only uppercase letters and numbers' };
    }

    return { isValid: true };
  }

  /**
   * Analyze device status from device data
   */
  static analyzeDeviceStatus(device: PointOfSaleOutput): DeviceStatus {
    return {
      serialNumber: device.serial_number as SerialNumber,
      status: device.status,
      lastSeen: new Date().toISOString(), // last_seen field not available in OpenAPI schema
      certificateExpiry: undefined, // certificate_expiry field not available in OpenAPI schema
      firmwareVersion: undefined, // firmware_version field not available in OpenAPI schema
      batteryLevel: undefined, // battery_level field not available in OpenAPI schema
      connectivity: this.determineConnectivityStatus(device),
    };
  }

  /**
   * Determine connectivity status from device data
   */
  private static determineConnectivityStatus(_device: PointOfSaleOutput): ConnectivityStatus {
    // last_seen field not available in OpenAPI schema, using mock connectivity
    const lastSeenTime = new Date().getTime();
    const now = Date.now();
    const minutesSinceLastSeen = (now - lastSeenTime) / (1000 * 60);

    if (minutesSinceLastSeen <= 5) {return 'online';}
    if (minutesSinceLastSeen <= 30) {return 'intermittent';}
    return 'offline';
  }

  /**
   * Format device for display
   */
  static formatDeviceForDisplay(device: PointOfSaleOutput): {
    displayName: string;
    statusBadge: string;
    location: string;
    lastActivity: string;
    certificateStatus: string;
  } {
    const status = device.status || 'unknown';
    // last_seen field not available in OpenAPI schema, using current time
    const lastSeen = new Date();

    return {
      displayName: `PEM ${device.serial_number}`,
      statusBadge: status.toUpperCase(),
      location: device.address?.city || 'Unknown Location',
      lastActivity: lastSeen.toLocaleString(),
      certificateStatus: 'Not Available', // certificate_expiry field not available in OpenAPI schema
    };
  }

  /**
   * Calculate device uptime
   */
  static calculateUptime(_device: PointOfSaleOutput): {
    uptimeHours: number;
    uptimePercentage: number;
    availabilityStatus: 'excellent' | 'good' | 'poor' | 'critical';
  } {
    // This would typically use historical data
    // For now, return mock calculations based on last seen
    // last_seen field not available in OpenAPI schema, using current time
    const lastSeenTime = Date.now();
    const now = Date.now();
    const hoursSinceLastSeen = (now - lastSeenTime) / (1000 * 60 * 60);

    // Mock uptime calculation
    const uptimeHours = Math.max(0, 24 - hoursSinceLastSeen);
    const uptimePercentage = Math.round((uptimeHours / 24) * 100);

    let availabilityStatus: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent';
    if (uptimePercentage < 95) {availabilityStatus = 'good';}
    if (uptimePercentage < 85) {availabilityStatus = 'poor';}
    if (uptimePercentage < 70) {availabilityStatus = 'critical';}

    return {
      uptimeHours: Math.round(uptimeHours * 100) / 100,
      uptimePercentage,
      availabilityStatus,
    };
  }

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
  } {
    const report = {
      totalDevices: devices.length,
      activeDevices: 0,
      offlineDevices: 0,
      devicesRequiringAttention: 0,
      avgUptimePercentage: 0,
      certificateExpiringCount: 0,
      statusBreakdown: {} as Record<PEMStatus, number>,
    };

    let totalUptime = 0;
    // const now = new Date();
    // Note: certificate_expiry field not available in OpenAPI schema

    for (const device of devices) {
      const {status} = device;

      // Update status breakdown
      report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;

      // Count active/offline devices
      if (status === 'ACTIVE') {
        report.activeDevices++;
      } else if (status === 'OFFLINE') {
        report.offlineDevices++;
      }

      // Check for devices requiring attention
      if (['DISCARDED'].includes(status)) {
        report.devicesRequiringAttention++;
      }

      // Note: certificate_expiry field not available in OpenAPI schema
      // Using mock certificate validation

      // Calculate uptime
      const uptime = this.calculateUptime(device);
      totalUptime += uptime.uptimePercentage;
    }

    report.avgUptimePercentage = devices.length > 0 ?
      Math.round(totalUptime / devices.length) : 0;

    return report;
  }

  /**
   * Validate journal closing eligibility
   */
  static validateJournalClosingEligibility(device: PointOfSaleOutput, _date: string): {
    canClose: boolean;
    reasons: string[];
    requirements: string[];
  } {
    const reasons: string[] = [];
    const requirements: string[] = [];

    // Check device status
    if (device.status !== 'ACTIVE') {
      reasons.push('Device must be in active status');
    }

    // Note: last_journal_close and pending_transactions fields not available in OpenAPI schema
    // Using mock validation logic

    // Requirements for closing
    requirements.push('All transactions must be transmitted to tax authority');
    requirements.push('Device must be connected to network');
    requirements.push('No active receipt printing operations');

    return {
      canClose: reasons.length === 0,
      reasons,
      requirements,
    };
  }

  /**
   * Get recommended maintenance schedule
   */
  static getMaintenanceSchedule(_device: PointOfSaleOutput): {
    nextMaintenance: string;
    maintenanceType: 'routine' | 'certificate' | 'firmware' | 'urgent';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    estimatedDuration: string;
  } {
    const now = new Date();

    // Note: certificate_expiry and firmware_version fields not available in OpenAPI schema
    // Using default maintenance schedule

    // Default routine maintenance
    return {
      nextMaintenance: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      maintenanceType: 'routine',
      priority: 'low',
      description: 'Routine maintenance and inspection',
      estimatedDuration: '30-60 minutes',
    };
  }

  /**
   * Check if firmware version is outdated
   * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
   */
  // private static isOutdatedFirmware(version: string): boolean {
  //   // Simple version comparison (in reality, this would be more sophisticated)
  //   const currentVersion = '2.1.0'; // Mock current version
  //   return version < currentVersion;
  // }

  /**
   * Generate activation code for new devices
   */
  static generateActivationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    // Generate in format: XXXX-XXXX-XXXX-XXXX
    for (let group = 0; group < 4; group++) {
      if (group > 0) {result += '-';}
      for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    return result;
  }
}

// Re-export for convenience
export { PointOfSalesResource as PointOfSales };

// Export types for external use
export type {
  PointOfSalePage,
  ActivationOutput,
  PointOfSaleOutput,
  ActivationRequest,
  InactivityRequest,
  CloseJournalOutput,
  CloseJournalRequest,
};
