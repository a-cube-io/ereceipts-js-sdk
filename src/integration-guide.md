# A-Cube E-Receipt SDK - mTLS Integration Guide

## Overview

This guide demonstrates how to integrate the enhanced A-Cube E-Receipt SDK with mTLS support using the `@a-cube-io/expo-mutual-tls` module.

## Prerequisites

1. **Install the Expo mTLS module**:
   ```bash
   npm install @a-cube-io/expo-mutual-tls
   ```

2. **Expo Environment**: Ensure you're running in an Expo environment (iOS/Android)

3. **A-Cube API Access**: Valid API credentials and certificate access

## Basic Integration

### 1. Initialize Enhanced SDK

```typescript
import { ConfigManager } from './src/core/config';
import { EnhancedHttpClient } from './src/core/api/enhanced-http-client';
import { CertificateManager } from './src/core/certificate-manager';
import { EnhancedReceiptsAPI } from './src/core/api/enhanced-receipts';
import { EnhancedCashRegistersAPI } from './src/core/api/enhanced-cash-registers';

// Initialize configuration
const config = new ConfigManager({
  apiUrl: 'https://api.acube.com:444', // Port 444 used dynamically for web browser certificates
  timeout: 30000,
  debug: true // Enable debug logging
});

// Initialize enhanced HTTP client with mTLS support
const httpClient = new EnhancedHttpClient(config);

// Initialize APIs
const certificateManager = new CertificateManager(
  httpClient,
  new CashRegistersAPI(httpClient as any),
  new PemsAPI(httpClient as any),
  true // Enable debug logging
);

const receiptsAPI = new EnhancedReceiptsAPI(httpClient, true);
const cashRegistersAPI = new EnhancedCashRegistersAPI(
  httpClient, 
  certificateManager, 
  true
);
```

### 2. Set User Context for Role-Based Authentication

```typescript
// Set user context for role-based authentication
receiptsAPI.setUserContext({
  roles: ['ROLE_MERCHANT'], // or ['ROLE_CASHIER'] for mTLS-only
  userId: 'user123',
  merchantId: 'merchant456'
});
```

## Cash Register Operations with Auto-mTLS

### Creating Cash Registers

```typescript
async function createCashRegister() {
  try {
    console.log('🔄 Creating cash register...');
    
    // Create cash register - certificates are auto-configured
    const cashRegister = await cashRegistersAPI.create({
      name: 'Point of Sale 1',
      pem_id: 'PEM123456',
      // other properties...
    });
    
    console.log('✅ Cash register created:', cashRegister.id);
    
    // Check certificate status
    const certStatus = await cashRegistersAPI.getCertificateStatus(cashRegister.id);
    console.log('📄 Certificate status:', certStatus);
    
    return cashRegister;
  } catch (error) {
    console.error('❌ Failed to create cash register:', error);
    throw error;
  }
}
```

### Retrieving Cash Registers with Certificates

```typescript
async function getCashRegisterWithCertificate(id: string) {
  try {
    console.log('🔄 Getting cash register with certificate...');
    
    // Get detailed cash register - certificate auto-configured
    const cashRegister = await cashRegistersAPI.getDetailed(id);
    
    console.log('✅ Cash register retrieved:', cashRegister.id);
    
    // Verify mTLS connectivity
    const connectivity = await receiptsAPI.testMTLSConnectivity();
    console.log('🔗 mTLS connectivity:', connectivity);
    
    return cashRegister;
  } catch (error) {
    console.error('❌ Failed to get cash register:', error);
    throw error;
  }
}
```

## Receipt Operations with mTLS

### Creating Receipts (mTLS Required)

```typescript
async function createReceipt(receiptData) {
  try {
    console.log('🔄 Creating receipt with mTLS...');
    
    // Authentication determined by role/platform/method
    const receipt = await receiptsAPI.create(receiptData);
    
    console.log('✅ Receipt created with mTLS:', receipt.uuid);
    return receipt;
  } catch (error) {
    console.error('❌ Receipt creation failed:', error);
    throw error;
  }
}
```

### Listing Receipts (Role-Based Auth)

```typescript
async function listReceipts() {
  try {
    console.log('🔄 Listing receipts with role-based auth...');
    
    // ROLE_MERCHANT: Uses JWT
    // Other roles: Uses mTLS
    const receipts = await receiptsAPI.list({ size: 10 });
    
    console.log('✅ Receipts retrieved:', receipts.content.length);
    return receipts;
  } catch (error) {
    console.error('❌ Failed to list receipts:', error);
    throw error;
  }
}
```

### Getting Receipt Details (mTLS Required)

```typescript
async function getReceiptPDF(receiptUuid: string) {
  try {
    console.log('🔄 Getting receipt PDF with mTLS...');
    
    // Automatically uses mTLS for PDF download
    const pdfBlob = await receiptsAPI.getDetails(receiptUuid, 'pdf');
    
    console.log('✅ Receipt PDF retrieved');
    return pdfBlob;
  } catch (error) {
    console.error('❌ Failed to get receipt PDF:', error);
    throw error;
  }
}
```

## Certificate Management

### Manual Certificate Configuration

```typescript
async function configureCertificateManually(cashRegisterId: string) {
  try {
    console.log('🔄 Manually configuring certificate...');
    
    // Force refresh certificate from API
    await certificateManager.configureCashRegisterCertificate(
      cashRegisterId,
      true // forceRefresh
    );
    
    console.log('✅ Certificate configured manually');
    
    // Test connection
    const canConnect = await certificateManager.testConnection();
    console.log('🔗 Connection test:', canConnect ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Manual certificate configuration failed:', error);
    throw error;
  }
}
```

### Bulk Certificate Configuration

```typescript
async function configureBulkCertificates(cashRegisterIds: string[]) {
  try {
    console.log('🔄 Bulk configuring certificates...');
    
    const result = await cashRegistersAPI.bulkConfigureCertificates(cashRegisterIds);
    
    console.log('✅ Bulk configuration result:', {
      successful: result.successful.length,
      failed: result.failed.length
    });
    
    // Log failures
    result.failed.forEach(failure => {
      console.error('❌ Failed to configure:', failure.id, failure.error);
    });
    
    return result;
  } catch (error) {
    console.error('❌ Bulk certificate configuration failed:', error);
    throw error;
  }
}
```

## Status and Diagnostics

### Check mTLS Status

```typescript
async function checkMTLSStatus() {
  try {
    console.log('🔄 Checking mTLS status...');
    
    // Check HTTP client mTLS status
    const httpStatus = await httpClient.getMTLSStatus();
    console.log('🔧 HTTP Client mTLS Status:', httpStatus);
    
    // Check receipts authentication status
    const authStatus = await receiptsAPI.getAuthenticationStatus();
    console.log('🔐 Authentication Status:', authStatus);
    
    // Get certificate statistics
    const certStats = certificateManager.getStatistics();
    console.log('📊 Certificate Statistics:', certStats);
    
    return {
      httpStatus,
      authStatus,
      certStats
    };
  } catch (error) {
    console.error('❌ Status check failed:', error);
    throw error;
  }
}
```

### Test Full Integration

```typescript
async function testFullIntegration() {
  try {
    console.log('🧪 Testing full mTLS integration...');
    
    // 1. Create cash register with auto-certificate config
    const cashRegister = await createCashRegister();
    
    // 2. Test mTLS connectivity
    const connectivity = await receiptsAPI.testMTLSConnectivity();
    if (!connectivity.isConnected) {
      throw new Error(`mTLS connectivity failed: ${connectivity.error}`);
    }
    
    // 3. Create a test receipt
    const testReceipt = await createReceipt({
      // Your receipt data here
      items: [{ name: 'Test Item', price: 10.00, quantity: 1 }],
      cashRegisterId: cashRegister.id
    });
    
    // 4. Retrieve receipt details
    const receiptDetails = await receiptsAPI.getDetails(testReceipt.uuid, 'json');
    
    console.log('✅ Full integration test passed!');
    
    return {
      cashRegister,
      receipt: testReceipt,
      details: receiptDetails
    };
  } catch (error) {
    console.error('❌ Full integration test failed:', error);
    throw error;
  }
}
```

## Error Handling

### mTLS-Specific Error Handling

```typescript
import { MTLSError, MTLSErrorType } from './src/adapters/mtls';

async function handleMTLSErrors() {
  try {
    await receiptsAPI.create(receiptData);
  } catch (error) {
    if (error instanceof MTLSError) {
      switch (error.type) {
        case MTLSErrorType.NOT_SUPPORTED:
          console.log('📱 mTLS not supported, using JWT fallback');
          break;
          
        case MTLSErrorType.CERTIFICATE_NOT_FOUND:
          console.log('📄 Certificate not configured, configuring...');
          await certificateManager.configureCashRegisterCertificate(cashRegisterId);
          break;
          
        case MTLSErrorType.CONNECTION_FAILED:
          console.log('🔗 mTLS connection failed, checking configuration...');
          const status = await checkMTLSStatus();
          break;
          
        default:
          console.error('❌ Unknown mTLS error:', error);
      }
    } else {
      console.error('❌ General error:', error);
    }
  }
}
```

## Best Practices

### 1. Initialize Once, Use Everywhere

```typescript
// Create a singleton service
export class ACubeService {
  private static instance: ACubeService;
  
  private httpClient: EnhancedHttpClient;
  private receiptsAPI: EnhancedReceiptsAPI;
  private cashRegistersAPI: EnhancedCashRegistersAPI;
  private certificateManager: CertificateManager;
  
  static getInstance(): ACubeService {
    if (!ACubeService.instance) {
      ACubeService.instance = new ACubeService();
    }
    return ACubeService.instance;
  }
  
  private constructor() {
    // Initialize all components
    // ... (initialization code as shown above)
  }
  
  // Expose APIs
  get receipts() { return this.receiptsAPI; }
  get cashRegisters() { return this.cashRegistersAPI; }
  get certificates() { return this.certificateManager; }
}
```

### 2. Enable Debug Logging in Development

```typescript
// Enable comprehensive debug logging
const isDebugMode = __DEV__ || process.env.NODE_ENV === 'development';

// All components support debug logging
const httpClient = new EnhancedHttpClient(config);
const receiptsAPI = new EnhancedReceiptsAPI(httpClient, isDebugMode);
const cashRegistersAPI = new EnhancedCashRegistersAPI(
  httpClient, 
  certificateManager, 
  isDebugMode
);
```

### 3. Handle Platform Differences

```typescript
async function initializeWithPlatformCheck() {
  const httpClient = new EnhancedHttpClient(config);
  
  // Check mTLS availability
  const status = await httpClient.getMTLSStatus();
  
  if (!status.adapterAvailable) {
    console.log('📱 Running on platform without mTLS support');
    console.log('🔐 All operations will use JWT authentication');
  } else if (!status.isReady) {
    console.log('📄 mTLS available but no certificate configured');
    console.log('🔧 Certificates will be auto-configured when needed');
  } else {
    console.log('✅ mTLS ready and operational');
  }
}
```

## Troubleshooting

### Common Issues

1. **Module Not Found**: Ensure `@a-cube-io/expo-mutual-tls` is installed
2. **Certificate Not Found**: Call `configureCashRegisterCertificate()` manually
3. **Connection Timeout**: Check network connectivity and certificate validity
4. **Authentication Failed**: Verify user roles and certificate configuration

### Debug Information

Enable debug logging to see detailed information:

```typescript
// All components log with prefixes:
// [MTLS-ADAPTER] - mTLS adapter operations
// [ENHANCED-HTTP] - HTTP client operations  
// [CERT-MANAGER] - Certificate management
// [ENHANCED-RECEIPTS] - Receipt operations
// [ENHANCED-CASH-REGISTERS] - Cash register operations
```

This comprehensive integration provides:
- ✅ Automatic mTLS certificate configuration
- ✅ Role-based authentication (JWT for ROLE_MERCHANT, mTLS for others)
- ✅ Intelligent fallback strategies
- ✅ Comprehensive debug logging
- ✅ Cross-platform compatibility
- ✅ Production-ready error handling