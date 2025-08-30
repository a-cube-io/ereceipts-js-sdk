import { HttpClient } from './http-client';
import { 
  CashRegisterCreate, 
  CashRegisterBasicOutput, 
  CashRegisterDetailedOutput,
  Page, 
  CashRegisterListParams
} from './types';

/**
 * Certificate source information
 */
export interface CertificateSource {
  type: 'cash-register' | 'pem';
  id: string;
  certificate: string;
  privateKey: string;
  retrievedAt: Date;
}

/**
 * Cash Registers API manager with mTLS certificate management
 */
export class CashRegistersAPI {
  private debugEnabled: boolean = false;

  constructor(private httpClient: HttpClient) {
    this.debugEnabled = (httpClient as any).isDebugEnabled || false;

    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Cash Registers API initialized with mTLS support');
    }
  }

  /**
   * Create a new cash register with automatic mTLS certificate configuration
   */
  async create(cashRegisterData: CashRegisterCreate): Promise<CashRegisterDetailedOutput> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Creating cash register:', {
        name: cashRegisterData.name,
        pemId: (cashRegisterData as any).pem_id
      });
    }

    try {
      // Create cash register using standard JWT authentication
      const cashRegister = await this.httpClient.post<CashRegisterDetailedOutput>(
        '/mf1/cash-registers', 
        cashRegisterData,
        { authMode: 'jwt' } // Use JWT for creation
      );

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Cash register created successfully:', {
          id: cashRegister.id,
          name: cashRegister.name,
          hasCertificate: !!cashRegister.mtls_certificate,
          hasPrivateKey: !!cashRegister.private_key
        });
      }

      // Auto-configure mTLS certificate if available
      if (cashRegister.mtls_certificate && cashRegister.private_key) {
        try {
          await this.httpClient.configureCashRegisterCertificate(
            cashRegister.id,
            cashRegister.mtls_certificate,
            cashRegister.private_key
          );
          
          if (this.debugEnabled) {
            console.log('[CASH-REGISTERS-API] mTLS certificate auto-configured for:', cashRegister.id);
          }
        } catch (certError) {
          if (this.debugEnabled) {
            console.warn('[CASH-REGISTERS-API] Certificate auto-configuration failed:', certError);
          }
          // Don't fail the creation if certificate config fails
        }
      } else {
        if (this.debugEnabled) {
          console.log('[CASH-REGISTERS-API] Cash register created without mTLS certificates');
        }
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
  async list(params: CashRegisterListParams = {}): Promise<Page<CashRegisterBasicOutput>> {
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
    if (params.pem_id) {
      searchParams.append('pem_id', params.pem_id);
    }

    const query = searchParams.toString();
    const url = query ? `/mf1/cash-registers?${query}` : '/mf1/cash-registers';
    
    return this.httpClient.get<Page<CashRegisterBasicOutput>>(
      url, 
      { authMode: 'jwt' }
    );
  }

  /**
   * Get a cash register by ID with automatic certificate configuration
   */
  async get(id: string, configureCertificate = true): Promise<CashRegisterBasicOutput> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Getting cash register:', {
        id,
        configureCertificate
      });
    }

    try {
      // Get cash register using JWT
      const cashRegister = await this.httpClient.get<CashRegisterBasicOutput>(
        `/mf1/cash-registers/${id}`,
        { authMode: 'jwt' }
      );

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Cash register retrieved:', {
          id: cashRegister.id,
          name: cashRegister.name
        });
      }

      // Try to configure certificate if requested and cash register is detailed
      if (configureCertificate && this.isCashRegisterDetailed(cashRegister)) {
        try {
          if (cashRegister.mtls_certificate && cashRegister.private_key) {
            await this.httpClient.configureCashRegisterCertificate(
              id,
              cashRegister.mtls_certificate,
              cashRegister.private_key
            );
            
            if (this.debugEnabled) {
              console.log('[CASH-REGISTERS-API] Certificate configured for cash register:', id);
            }
          }
        } catch (certError) {
          if (this.debugEnabled) {
            console.warn('[CASH-REGISTERS-API] Certificate configuration failed:', certError);
          }
          // Don't fail the get operation if certificate config fails
        }
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
   * Get detailed cash register information with automatic certificate configuration
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
          id: cashRegister.id,
          name: cashRegister.name,
          hasCertificate: !!cashRegister.mtls_certificate,
          hasPrivateKey: !!cashRegister.private_key
        });
      }

      // Auto-configure certificate if available
      if (cashRegister.mtls_certificate && cashRegister.private_key) {
        try {
          await this.httpClient.configureCashRegisterCertificate(
            id,
            cashRegister.mtls_certificate,
            cashRegister.private_key
          );
          
          if (this.debugEnabled) {
            console.log('[CASH-REGISTERS-API] Certificate auto-configured for detailed cash register:', id);
          }
        } catch (certError) {
          if (this.debugEnabled) {
            console.warn('[CASH-REGISTERS-API] Detailed certificate configuration failed:', certError);
          }
          // Don't fail the operation if certificate config fails
        }
      } else {
        if (this.debugEnabled) {
          console.log('[CASH-REGISTERS-API] Detailed cash register without mTLS certificates:', id);
        }
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

    const mtlsStatus = await this.httpClient.getMTLSStatus();
    const hasCertificate = mtlsStatus.certificateCount > 0;
    let canConnect = false;

    if (hasCertificate) {
      // Test connection if certificate is configured
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
        configuredAt: new Date(),
        source: 'cash-register'
      } : undefined
    };

    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Certificate status:', status);
    }

    return status;
  }

  /**
   * Remove certificate configuration for a cash register
   */
  async removeCertificate(cashRegisterId: string): Promise<void> {
    if (this.debugEnabled) {
      console.log('[CASH-REGISTERS-API] Removing certificate for:', cashRegisterId);
    }

    try {
      await this.httpClient.removeCertificate(cashRegisterId);

      if (this.debugEnabled) {
        console.log('[CASH-REGISTERS-API] Certificate removed successfully for:', cashRegisterId);
      }
    } catch (error) {
      if (this.debugEnabled) {
        console.error('[CASH-REGISTERS-API] Certificate removal failed:', error);
      }
      throw error;
    }
  }

  /**
   * Type guard to check if cash register is detailed
   */
  private isCashRegisterDetailed(
    cashRegister: CashRegisterBasicOutput
  ): cashRegister is CashRegisterDetailedOutput {
    return 'mtls_certificate' in cashRegister && 'private_key' in cashRegister;
  }
}