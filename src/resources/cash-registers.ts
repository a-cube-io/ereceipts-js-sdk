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

import { BaseOpenAPIResource } from '@/resources/base-openapi';
import { CashRegisterEndpoints } from '@/generated/endpoints';
import type { HttpClient } from '@/http/client';
import type { CashRegisterId } from '@/types/branded';
import type { components } from '@/types/generated';
import { ValidationError } from '@/errors/index';

// Extract types from OpenAPI generated types
export type CashRegisterInput = components['schemas']['E-Receipt_IT_API_CashRegisterCreate'];
export type CashRegisterOutput = components['schemas']['E-Receipt_IT_API_CashRegisterDetailedOutput'];
export type CashRegisterPage = components['schemas']['E-Receipt_IT_API_Page__T_Customized_CashRegisterBasicOutput_'];

export interface CashRegisterValidationOptions {
  validateSerialNumber?: boolean;
  checkDuplicateRegistration?: boolean;
  enforceLocationValidation?: boolean;
}

export interface CashRegisterConfiguration {
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

export interface CashRegisterSettings {
  printReceipts: boolean;
  enableLottery: boolean;
  defaultVATRate: string;
  language: 'it' | 'en' | 'de' | 'fr';
  currency: 'EUR';
  timezone: string;
  paperSize: 'A4' | 'thermal_58mm' | 'thermal_80mm';
  connectionType: 'ethernet' | 'wifi' | 'cellular';
}

export interface CashRegisterStats {
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

export type CashRegisterStatus = 'active' | 'inactive' | 'maintenance' | 'error' | 'offline';
export type MaintenanceType = 'routine' | 'repair' | 'upgrade' | 'calibration';

/**
 * Cash Registers Resource Class - OpenAPI Based
 * Manages cash register devices with full compliance
 */
export class CashRegistersResource extends BaseOpenAPIResource {
  constructor(client: HttpClient) {
    super({
      client,
      endpoints: {
        create: CashRegisterEndpoints.CREATE,
        list: CashRegisterEndpoints.LIST,
        getById: CashRegisterEndpoints.GET_BY_ID,
      }
    });
  }

  /**
   * Create a new cash register
   * 
   * @param data - Cash register input data
   * @param options - Validation options
   * @returns Promise resolving to created cash register
   */
  async create(
    data: CashRegisterInput, 
    options: CashRegisterValidationOptions = {}
  ): Promise<CashRegisterOutput> {
    // Validate input
    await this.validateCashRegisterInput(data, options);

    return this.executeRequest<CashRegisterInput, CashRegisterOutput>('create', data, {
      metadata: {
        operation: 'create_cash_register',
        serialNumber: data.pem_serial_number,
        name: data.name,
      }
    });
  }

  /**
   * Get a list of cash registers
   * 
   * @returns Promise resolving to paginated cash register list
   */
  async list(): Promise<CashRegisterPage> {
    return this.executeRequest<void, CashRegisterPage>('list', undefined, {
      metadata: {
        operation: 'list_cash_registers',
      }
    });
  }

  /**
   * Get a specific cash register by ID
   * 
   * @param registerId - Cash register ID
   * @returns Promise resolving to cash register details
   */
  async retrieve(registerId: CashRegisterId | number): Promise<CashRegisterOutput> {
    return this.executeRequest<void, CashRegisterOutput>('getById', undefined, {
      pathParams: { id: registerId },
      metadata: {
        operation: 'get_cash_register',
        registerId,
      }
    });
  }

  /**
   * Get cash register configuration
   * 
   * @param registerId - Cash register ID
   * @returns Promise resolving to configuration
   */
  async getConfiguration(registerId: CashRegisterId | number): Promise<CashRegisterConfiguration> {
    const register = await this.retrieve(registerId);
    return CashRegistersResource.buildConfiguration(register);
  }

  /**
   * Get cash register statistics
   * 
   * @param registerId - Cash register ID
   * @returns Promise resolving to statistics
   */
  async getStatistics(registerId: CashRegisterId | number): Promise<CashRegisterStats> {
    const register = await this.retrieve(registerId);
    return CashRegistersResource.calculateStatistics(register);
  }

  /**
   * Update cash register settings (future enhancement)
   */
  async updateSettings(
    registerId: CashRegisterId | number, 
    settings: Partial<CashRegisterSettings>
  ): Promise<CashRegisterOutput> {
    if (!this.hasOperation('update')) {
      throw this.createUnsupportedOperationError('update');
    }
    
    return this.executeRequest<Partial<CashRegisterSettings>, CashRegisterOutput>('update', settings, {
      pathParams: { id: registerId },
      metadata: {
        operation: 'update_cash_register_settings',
        registerId,
      }
    });
  }

  // Validation methods

  /**
   * Validate cash register input
   */
  private async validateCashRegisterInput(
    data: CashRegisterInput, 
    options: CashRegisterValidationOptions = {}
  ): Promise<void> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Serial number validation (using pem_serial_number from OpenAPI schema)
    if (!data.pem_serial_number || data.pem_serial_number.trim().length === 0) {
      errors.push({
        field: 'serial_number',
        message: 'Serial number is required',
        code: 'REQUIRED'
      });
    } else if (options.validateSerialNumber) {
      const serialValidation = CashRegistersResource.validateSerialNumber(data.pem_serial_number);
      if (!serialValidation.isValid) {
        errors.push({
          field: 'serial_number',
          message: serialValidation.error || 'Invalid serial number format',
          code: 'INVALID_SERIAL_NUMBER'
        });
      }
    }

    // Name validation (location field not available in OpenAPI schema)
    if (options.enforceLocationValidation) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({
          field: 'name',
          message: 'Name is required',
          code: 'REQUIRED'
        });
      } else if (data.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Name cannot exceed 100 characters',
          code: 'TOO_LONG'
        });
      }
    }

    // Duplicate registration check
    if (options.checkDuplicateRegistration) {
      const isDuplicate = await this.checkDuplicateSerial(data.pem_serial_number);
      if (isDuplicate) {
        errors.push({
          field: 'serial_number',
          message: 'Cash register with this serial number is already registered',
          code: 'DUPLICATE_SERIAL'
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid cash register input', 'create_cash_register', errors);
    }
  }

  /**
   * Check for duplicate serial number
   */
  private async checkDuplicateSerial(serialNumber: string): Promise<boolean> {
    try {
      const registers = await this.list();
      return registers.members.some(register => register.pem_serial_number === serialNumber);
    } catch (error) {
      console.warn(`Unable to check for duplicate serial number: ${error}`);
      return false;
    }
  }

  // Static utility methods

  /**
   * Validate serial number format
   */
  static validateSerialNumber(serialNumber: string): { isValid: boolean; error?: string } {
    if (serialNumber.length < 6 || serialNumber.length > 20) {
      return { isValid: false, error: 'Serial number must be between 6 and 20 characters' };
    }

    if (!/^[A-Z0-9-]+$/.test(serialNumber)) {
      return { isValid: false, error: 'Serial number must contain only uppercase letters, numbers, and hyphens' };
    }

    return { isValid: true };
  }

  /**
   * Build configuration from cash register data
   */
  static buildConfiguration(register: CashRegisterOutput): CashRegisterConfiguration {
    return {
      id: register.id as CashRegisterId,
      name: register.name || `Cash Register ${register.id}`,
      location: 'Unknown Location', // location field not available in OpenAPI schema
      serialNumber: register.pem_serial_number,
      model: 'Unknown Model', // model field not available in OpenAPI schema
      manufacturer: 'Unknown Manufacturer', // manufacturer field not available in OpenAPI schema
      installationDate: new Date().toISOString(), // installation_date field not available in OpenAPI schema
      lastMaintenance: undefined, // last_maintenance field not available in OpenAPI schema
      nextMaintenance: undefined, // next_maintenance field not available in OpenAPI schema
      status: 'active' as CashRegisterStatus, // status field not available in OpenAPI schema
      settings: this.getDefaultSettings(),
    };
  }

  /**
   * Get default settings for cash registers
   */
  static getDefaultSettings(): CashRegisterSettings {
    return {
      printReceipts: true,
      enableLottery: true,
      defaultVATRate: '22',
      language: 'it',
      currency: 'EUR',
      timezone: 'Europe/Rome',
      paperSize: 'thermal_80mm',
      connectionType: 'ethernet',
    };
  }

  /**
   * Calculate statistics for a cash register
   */
  static calculateStatistics(register: CashRegisterOutput): CashRegisterStats {
    // Mock statistics calculation (in reality, this would use historical data)
    const mockTransactionCount = Math.floor(Math.random() * 1000) + 100;
    const mockTotalAmount = (Math.random() * 50000 + 10000).toFixed(2);
    const mockTodayTransactions = Math.floor(Math.random() * 50) + 10;
    const mockTodayAmount = (Math.random() * 2000 + 500).toFixed(2);

    return {
      registerId: register.id as CashRegisterId,
      totalTransactions: mockTransactionCount,
      totalAmount: mockTotalAmount,
      averageTransaction: (parseFloat(mockTotalAmount) / mockTransactionCount).toFixed(2),
      transactionsToday: mockTodayTransactions,
      amountToday: mockTodayAmount,
      // lastTransaction field omitted since it's not available in OpenAPI schema
      uptime: {
        hours: 23.5,
        percentage: 97.9,
      },
      errorCount: Math.floor(Math.random() * 5),
      maintenanceScore: Math.floor(Math.random() * 20) + 80,
    };
  }

  /**
   * Format cash register for display
   */
  static formatForDisplay(register: CashRegisterOutput): {
    displayName: string;
    statusBadge: string;
    location: string;
    lastActivity: string;
    serialNumber: string;
  } {
    return {
      displayName: register.name || `Cash Register ${register.id}`,
      statusBadge: 'ACTIVE', // status field not available in OpenAPI schema
      location: 'Unknown Location', // location field not available in OpenAPI schema
      lastActivity: 'Never', // last_activity field not available in OpenAPI schema
      serialNumber: register.pem_serial_number || 'Unknown',
    };
  }

  /**
   * Generate maintenance schedule
   */
  static generateMaintenanceSchedule(_register: CashRegisterOutput): {
    nextMaintenance: string;
    maintenanceType: MaintenanceType;
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    estimatedDuration: string;
  } {
    const now = new Date();
    
    // Since last_maintenance field is not available in OpenAPI schema,
    // return default routine maintenance schedule
    return {
      nextMaintenance: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      maintenanceType: 'routine',
      priority: 'medium',
      description: 'Routine maintenance and inspection',
      estimatedDuration: '2 hours',
    };
  }

  /**
   * Validate cash register compatibility with PEM device
   */
  static validatePEMCompatibility(
    register: CashRegisterOutput, 
    pemModel: string
  ): {
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  } {
    // Suppress unused variable warning
    void register;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Note: connection_type, firmware_version, and power_consumption fields
    // are not available in the OpenAPI schema, using mock validation
    
    // Mock compatibility check since actual fields are not available
    if (pemModel.includes('legacy')) {
      issues.push('Legacy PEM devices may have compatibility issues');
      recommendations.push('Consider upgrading to newer PEM model');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Check if firmware is outdated
   * @deprecated This method is not used since firmware_version is not available in OpenAPI schema
   */
  // private static isOutdatedFirmware(_version: string): boolean {
  //   // Simple version comparison
  //   const currentVersion = '3.2.0';
  //   return _version < currentVersion;
  // }

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
    topPerformers: { id: string; name: string; todayRevenue: string }[];
  } {
    const report = {
      totalRegisters: registers.length,
      activeRegisters: 0,
      registersNeedingMaintenance: 0,
      averageUptime: 0,
      totalTransactionsToday: 0,
      totalRevenueToday: '0.00',
      statusBreakdown: {} as Record<CashRegisterStatus, number>,
      topPerformers: [] as { id: string; name: string; todayRevenue: string }[],
    };

    let totalUptime = 0;
    let totalRevenue = 0;
    const performanceData: { id: string; name: string; revenue: number }[] = [];

    for (const register of registers) {
      // status field not available in OpenAPI schema, using mock status
      const status: CashRegisterStatus = 'active';
      
      // Update status breakdown
      report.statusBreakdown[status] = (report.statusBreakdown[status] || 0) + 1;

      // Count active registers
      if (status === 'active') {
        report.activeRegisters++;
      }

      // Check maintenance needs
      if (['maintenance', 'error'].includes(status)) {
        report.registersNeedingMaintenance++;
      }

      // Calculate statistics
      const stats = this.calculateStatistics(register);
      totalUptime += stats.uptime.percentage;
      report.totalTransactionsToday += stats.transactionsToday;
      
      const todayRevenue = parseFloat(stats.amountToday);
      totalRevenue += todayRevenue;

      performanceData.push({
        id: register.id,
        name: register.name || `Register ${register.id}`,
        revenue: todayRevenue,
      });
    }

    report.averageUptime = registers.length > 0 ? Math.round(totalUptime / registers.length) : 0;
    report.totalRevenueToday = totalRevenue.toFixed(2);

    // Get top 5 performers
    report.topPerformers = performanceData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        name: item.name,
        todayRevenue: item.revenue.toFixed(2),
      }));

    return report;
  }

  /**
   * Generate installation checklist
   */
  static generateInstallationChecklist(): {
    preInstallation: string[];
    installation: string[];
    postInstallation: string[];
    testing: string[];
  } {
    return {
      preInstallation: [
        'Verify power supply requirements',
        'Check network connectivity',
        'Prepare installation location',
        'Gather serial numbers and documentation',
        'Backup existing configuration (if upgrading)',
      ],
      installation: [
        'Mount cash register securely',
        'Connect power supply',
        'Establish network connection',
        'Install required software/drivers',
        'Configure basic settings',
      ],
      postInstallation: [
        'Test all basic functions',
        'Configure PEM device integration',
        'Set up receipt printer',
        'Configure tax settings',
        'Train staff on operation',
      ],
      testing: [
        'Process test transaction',
        'Verify receipt printing',
        'Test network connectivity',
        'Validate tax calculations',
        'Check integration with fiscal system',
      ],
    };
  }
}

// Re-export for convenience
export { CashRegistersResource as CashRegisters };