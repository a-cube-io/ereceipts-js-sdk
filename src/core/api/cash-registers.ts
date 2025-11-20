import { HttpClient } from '../http';
import { 
  CashRegisterCreate, 
  CashRegisterBasicOutput, 
  CashRegisterDetailedOutput,
  Page, 
  CashRegisterListParams
} from './types';

/**
 * Cash Registers API manager
 */
export class CashRegistersAPI {
  private debugEnabled: boolean = false;

  constructor(private httpClient: HttpClient) {
    this.debugEnabled = httpClient.isDebugEnabled || false;

    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Cash Registers API initialized');
    }
  }

  /**
   * Create a new cash register
   */
  async create(cashRegisterData: CashRegisterCreate): Promise<CashRegisterDetailedOutput> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Creating cash register:', {
        name: cashRegisterData.name,
        pemId: (cashRegisterData as any).pem_id
      });
    }

    try {
      // Create a cash register using standard JWT authentication
      const cashRegister = await this.httpClient.post<CashRegisterDetailedOutput>(
        '/mf1/cash-registers', 
        cashRegisterData,
        { authMode: 'jwt' } // Use JWT for creation
      );

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Cash register created successfully:', {
          id: cashRegister.uuid,
          name: cashRegister.name,
          hasCertificate: !!cashRegister.mtls_certificate,
          hasPrivateKey: !!cashRegister.private_key
        });
      }

      return cashRegister;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[CASH-REGISTERS-API] Cash register creation failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get all cash registers for the current merchant
   */
  async list(params: CashRegisterListParams): Promise<Page<CashRegisterBasicOutput>> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Listing cash registers:', params);
    }

    // Use JWT for listing (standard operation)
    const searchParams = new URLSearchParams();
    
    if (params.page) {
      searchParams.append('page', params.page.toString());
    }
    if (params.size) {
      searchParams.append('size', params.size.toString());
    }

    const query = searchParams.toString();
    const  serialNumber = params.serial_number;
    let url = `/mf1/point-of-sales/${serialNumber}/cash-registers`;
    
    if (query) {
      url += `?${query}`;
    }
    
    return this.httpClient.get<Page<CashRegisterBasicOutput>>(
      url, 
      { authMode: 'jwt' }
    );
  }

  /**
   * Get a cash register by ID
   */
  async get(id: string): Promise<CashRegisterBasicOutput> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Getting cash register:', { id });
    }

    try {
      // Get cash register using JWT
      const cashRegister = await this.httpClient.get<CashRegisterBasicOutput>(
        `/mf1/cash-registers/${id}`,
        { authMode: 'jwt' }
      );

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Cash register retrieved:', {
          id: cashRegister.uuid,
          name: cashRegister.name
        });
      }

      return cashRegister;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[CASH-REGISTERS-API] Failed to get cash register:', error);
      }
      throw error;
    }
  }

  /**
   * Get detailed cash register information
   */
  async getDetailed(id: string): Promise<CashRegisterDetailedOutput> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Getting detailed cash register:', id);
    }

    try {
      // Get detailed cash register data using JWT
      const cashRegister = await this.httpClient.get<CashRegisterDetailedOutput>(
        `/mf1/cash-registers/${id}/detailed`,
        { authMode: 'jwt' }
      );

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Detailed cash register retrieved:', {
          id: cashRegister.uuid,
          name: cashRegister.name,
          hasCertificate: !!cashRegister.mtls_certificate,
          hasPrivateKey: !!cashRegister.private_key
        });
      }

      return cashRegister;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[CASH-REGISTERS-API] Failed to get detailed cash register:', error);
      }
      throw error;
    }
  }


  /**
   * Get certificate status for a cash register
   */
  async getCertificateStatus(cashRegisterId: string): Promise<{
    hasCertificate: boolean;
    isConfigured: boolean;
    canConnect: boolean;
    certificateInfo?: {
      configuredAt: Date;
      source: string;
    };
  }> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Getting certificate status for:', cashRegisterId);
    }

    const certificateManager = this.httpClient.getCertificateManager();
    if (!certificateManager) {
      return {
        hasCertificate: false,
        isConfigured: false,
        canConnect: false
      };
    }

    try {
      const hasCertificate = await certificateManager.hasCertificate();
      let canConnect = false;

      if (hasCertificate) {
        // Test connection if the certificate is configured
        try {
          canConnect = await this.httpClient.testMTLSConnection();
        } catch (error) {
          if (this.debugEnabled) {
            console.warn('[CASH-REGISTERS-API] Connection test failed:', error);
          }
        }
      }

      const status = {
        hasCertificate,
        isConfigured: hasCertificate,
        canConnect,
        certificateInfo: hasCertificate ? {
          configuredAt: new Date(), // Since we don't have specific metadata anymore
          source: 'device'
        } : undefined
      };

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Certificate status:', status);
      }

      return status;
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[CASH-REGISTERS-API] Certificate status check failed:', error);
      }
      return {
        hasCertificate: false,
        isConfigured: false,
        canConnect: false
      };
    }
  }

}