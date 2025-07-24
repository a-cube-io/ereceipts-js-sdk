# useOnboardingFlow - Esempi Completi

Questa documentazione fornisce esempi completi e pratici per l'utilizzo del hook `useOnboardingFlow` sia con che senza `EReceiptsProvider`.

## 📋 Indice

1. [Setup Iniziale](#setup-iniziale)
2. [Esempi con EReceiptsProvider](#esempi-con-ereceiptsprovider)
3. [Esempi senza EReceiptsProvider](#esempi-senza-ereceiptsprovider)
4. [Pattern Avanzati](#pattern-avanzati)
5. [Troubleshooting](#troubleshooting)

## 🚀 Setup Iniziale

### Installazione

```bash
npm install @a-cube-io/ereceipts-js-sdk
```

### Import Base

```typescript
import { useOnboardingFlow, EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';
```

## 🎯 Esempi con EReceiptsProvider

### 1. Provider Onboarding Completo

```tsx
import React, { useState } from 'react';
import { useOnboardingFlow, EReceiptsProvider, useEReceipts } from '@a-cube-io/ereceipts-js-sdk';

function ProviderOnboardingApp() {
  return (
    <EReceiptsProvider 
      config={{ 
        environment: 'sandbox',
        enableLogging: true,
        onInitialized: () => console.log('SDK Ready!'),
        onAuthChange: (isAuth) => console.log('Auth status:', isAuth)
      }}
    >
      <ProviderOnboarding />
    </EReceiptsProvider>
  );
}

function ProviderOnboarding() {
  const { isInitialized, isAuthenticated, currentUser } = useEReceipts();
  const [currentStep, setCurrentStep] = useState<'authentication' | 'merchant_check' | 'merchant_creation' | 'pos_creation'>('authentication');
  
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: currentStep,
    credentials: {
      email: 'provider@example.com',
      password: 'securePassword123'
    },
    merchantInfo: {
      fiscalId: '12345678901',
      name: 'My Store',
      email: 'store@example.com',
      address: {
        streetAddress: 'Via Roma 1',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM'
      }
    }
  });

  const handleStepExecution = async () => {
    try {
      await compute();
      
      // Smart progression logic
      if (state.step === 'authentication' && !state.error) {
        setCurrentStep('merchant_check');
      } else if (state.step === 'merchant_check' && !state.error) {
        if (state.result.merchantUuid) {
          // Merchant exists, skip to POS creation
          setCurrentStep('pos_creation');
        } else {
          // No merchant, create one
          setCurrentStep('merchant_creation');
        }
      } else if (state.step === 'merchant_creation' && !state.error) {
        setCurrentStep('pos_creation');
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  if (!isInitialized) {
    return <div>Initializing SDK...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Provider Onboarding</h1>
      
      {/* SDK Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <p><strong>SDK Status:</strong> {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</p>
        <p><strong>Current User:</strong> {currentUser?.email || 'None'}</p>
      </div>

      {/* Progress Indicator */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Progress</h3>
        <div>Current Step: <strong>{currentStep}</strong></div>
        <div>Progress: <strong>{state.progress}%</strong></div>
        <progress 
          value={state.progress} 
          max={100} 
          style={{ width: '100%', height: '20px' }}
        />
      </div>

      {/* Error Handling */}
      {state.error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#f44336', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Error</h4>
          <p>{state.error}</p>
          <button 
            onClick={clearError}
            style={{ 
              backgroundColor: 'white', 
              color: '#f44336', 
              border: 'none', 
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStepExecution} 
          disabled={state.loading || state.step === 'completed'}
          style={{
            backgroundColor: state.loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: state.loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
        </button>
        
        <button 
          onClick={reset}
          style={{
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Results */}
      {state.result.merchantUuid && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Results</h3>
          <p><strong>Merchant UUID:</strong> {state.result.merchantUuid}</p>
          {state.result.posSerialNumber && (
            <p><strong>POS Serial:</strong> {state.result.posSerialNumber}</p>
          )}
        </div>
      )}

      {/* Success State */}
      {state.step === 'completed' && (
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2>🎉 Onboarding Complete!</h2>
          <p>Your provider setup has been completed successfully.</p>
        </div>
      )}
    </div>
  );
}

export default ProviderOnboardingApp;
```

### 2. Merchant Onboarding Completo

```tsx
import React, { useState } from 'react';
import { useOnboardingFlow, EReceiptsProvider, useEReceipts } from '@a-cube-io/ereceipts-js-sdk';

function MerchantOnboardingApp() {
  return (
    <EReceiptsProvider 
      config={{ 
        environment: 'sandbox',
        enableLogging: true
      }}
    >
      <MerchantOnboarding />
    </EReceiptsProvider>
  );
}

function MerchantOnboarding() {
  const { isInitialized, isAuthenticated } = useEReceipts();
  const [currentStep, setCurrentStep] = useState<'pos_activation' | 'cash_register_creation'>('pos_activation');
  
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'merchant',
    step: currentStep,
    credentials: {
      email: 'merchant@example.com',
      password: 'securePassword123'
    },
    registrationKey: 'POS-REGISTRATION-KEY-123'
  });

  const handleStepExecution = async () => {
    try {
      await compute();
      
      // Smart progression logic
      if (state.step === 'pos_activation' && !state.error) {
        setCurrentStep('cash_register_creation');
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  if (!isInitialized) {
    return <div>Initializing SDK...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Merchant Onboarding</h1>
      
      {/* Progress Indicator */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Progress</h3>
        <div>Current Step: <strong>{currentStep}</strong></div>
        <div>Progress: <strong>{state.progress}%</strong></div>
        <progress 
          value={state.progress} 
          max={100} 
          style={{ width: '100%', height: '20px' }}
        />
      </div>

      {/* Error Handling */}
      {state.error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#f44336', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Error</h4>
          <p>{state.error}</p>
          <button 
            onClick={clearError}
            style={{ 
              backgroundColor: 'white', 
              color: '#f44336', 
              border: 'none', 
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStepExecution} 
          disabled={state.loading || state.step === 'completed'}
          style={{
            backgroundColor: state.loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: state.loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
        </button>
        
        <button 
          onClick={reset}
          style={{
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Results */}
      {state.result.cashRegisterId && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Results</h3>
          <p><strong>Cash Register ID:</strong> {state.result.cashRegisterId}</p>
          <p><strong>mTLS Certificate:</strong> {state.result.mtlsCertificate ? 'Installed' : 'Not available'}</p>
        </div>
      )}

      {/* Success State */}
      {state.step === 'completed' && (
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2>🎉 Setup Complete!</h2>
          <p>Your merchant setup has been completed successfully.</p>
        </div>
      )}
    </div>
  );
}

export default MerchantOnboardingApp;
```

## 🔧 Esempi senza EReceiptsProvider

### 1. Provider Onboarding Standalone

```tsx
import React, { useState, useEffect } from 'react';
import { useOnboardingFlow, initializeAPIClient } from '@a-cube-io/ereceipts-js-sdk';

function StandaloneProviderOnboarding() {
  const [isSDKInitialized, setIsSDKInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState<'authentication' | 'merchant_check' | 'merchant_creation' | 'pos_creation'>('authentication');
  
  // Initialize SDK manually
  useEffect(() => {
    const initSDK = async () => {
      try {
        initializeAPIClient({
          environment: 'sandbox',
          enableLogging: true
        });
        setIsSDKInitialized(true);
        console.log('SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      }
    };
    
    initSDK();
  }, []);

  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: currentStep,
    credentials: {
      email: 'provider@example.com',
      password: 'securePassword123'
    },
    merchantInfo: {
      fiscalId: '12345678901',
      name: 'My Store',
      email: 'store@example.com',
      address: {
        streetAddress: 'Via Roma 1',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM'
      }
    }
  });

  const handleStepExecution = async () => {
    if (!isSDKInitialized) {
      alert('SDK not initialized yet. Please wait.');
      return;
    }

    try {
      await compute();
      
      // Smart progression logic
      if (state.step === 'authentication' && !state.error) {
        setCurrentStep('merchant_check');
      } else if (state.step === 'merchant_check' && !state.error) {
        if (state.result.merchantUuid) {
          setCurrentStep('pos_creation');
        } else {
          setCurrentStep('merchant_creation');
        }
      } else if (state.step === 'merchant_creation' && !state.error) {
        setCurrentStep('pos_creation');
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  if (!isSDKInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Initializing SDK...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Standalone Provider Onboarding</h1>
      
      {/* SDK Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd' }}>
        <p><strong>SDK Status:</strong> Initialized</p>
        <p><strong>Environment:</strong> Sandbox</p>
      </div>

      {/* Progress Indicator */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Progress</h3>
        <div>Current Step: <strong>{currentStep}</strong></div>
        <div>Progress: <strong>{state.progress}%</strong></div>
        <progress 
          value={state.progress} 
          max={100} 
          style={{ width: '100%', height: '20px' }}
        />
      </div>

      {/* Error Handling */}
      {state.error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#f44336', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Error</h4>
          <p>{state.error}</p>
          <button 
            onClick={clearError}
            style={{ 
              backgroundColor: 'white', 
              color: '#f44336', 
              border: 'none', 
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStepExecution} 
          disabled={state.loading || state.step === 'completed'}
          style={{
            backgroundColor: state.loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: state.loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
        </button>
        
        <button 
          onClick={reset}
          style={{
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Results */}
      {state.result.merchantUuid && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Results</h3>
          <p><strong>Merchant UUID:</strong> {state.result.merchantUuid}</p>
          {state.result.posSerialNumber && (
            <p><strong>POS Serial:</strong> {state.result.posSerialNumber}</p>
          )}
        </div>
      )}

      {/* Success State */}
      {state.step === 'completed' && (
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2>🎉 Onboarding Complete!</h2>
          <p>Your provider setup has been completed successfully.</p>
        </div>
      )}
    </div>
  );
}

export default StandaloneProviderOnboarding;
```

### 2. Merchant Onboarding Standalone

```tsx
import React, { useState, useEffect } from 'react';
import { useOnboardingFlow, initializeAPIClient } from '@a-cube-io/ereceipts-js-sdk';

function StandaloneMerchantOnboarding() {
  const [isSDKInitialized, setIsSDKInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState<'pos_activation' | 'cash_register_creation'>('pos_activation');
  
  // Initialize SDK manually
  useEffect(() => {
    const initSDK = async () => {
      try {
        initializeAPIClient({
          environment: 'sandbox',
          enableLogging: true
        });
        setIsSDKInitialized(true);
        console.log('SDK initialized successfully');
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      }
    };
    
    initSDK();
  }, []);

  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'merchant',
    step: currentStep,
    credentials: {
      email: 'merchant@example.com',
      password: 'securePassword123'
    },
    registrationKey: 'POS-REGISTRATION-KEY-123'
  });

  const handleStepExecution = async () => {
    if (!isSDKInitialized) {
      alert('SDK not initialized yet. Please wait.');
      return;
    }

    try {
      await compute();
      
      // Smart progression logic
      if (state.step === 'pos_activation' && !state.error) {
        setCurrentStep('cash_register_creation');
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  if (!isSDKInitialized) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Initializing SDK...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Standalone Merchant Onboarding</h1>
      
      {/* SDK Status */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#e3f2fd' }}>
        <p><strong>SDK Status:</strong> Initialized</p>
        <p><strong>Environment:</strong> Sandbox</p>
      </div>

      {/* Progress Indicator */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Progress</h3>
        <div>Current Step: <strong>{currentStep}</strong></div>
        <div>Progress: <strong>{state.progress}%</strong></div>
        <progress 
          value={state.progress} 
          max={100} 
          style={{ width: '100%', height: '20px' }}
        />
      </div>

      {/* Error Handling */}
      {state.error && (
        <div style={{ 
          color: 'white', 
          backgroundColor: '#f44336', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Error</h4>
          <p>{state.error}</p>
          <button 
            onClick={clearError}
            style={{ 
              backgroundColor: 'white', 
              color: '#f44336', 
              border: 'none', 
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={handleStepExecution} 
          disabled={state.loading || state.step === 'completed'}
          style={{
            backgroundColor: state.loading ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: state.loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
        </button>
        
        <button 
          onClick={reset}
          style={{
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
      </div>

      {/* Results */}
      {state.result.cashRegisterId && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          padding: '15px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h3>Results</h3>
          <p><strong>Cash Register ID:</strong> {state.result.cashRegisterId}</p>
          <p><strong>mTLS Certificate:</strong> {state.result.mtlsCertificate ? 'Installed' : 'Not available'}</p>
        </div>
      )}

      {/* Success State */}
      {state.step === 'completed' && (
        <div style={{ 
          backgroundColor: '#4caf50', 
          color: 'white', 
          padding: '20px', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <h2>🎉 Setup Complete!</h2>
          <p>Your merchant setup has been completed successfully.</p>
        </div>
      )}
    </div>
  );
}

export default StandaloneMerchantOnboarding;
```

## 🚀 Pattern Avanzati

### 1. Gestione Errori Avanzata

```tsx
import React, { useState } from 'react';
import { useOnboardingFlow, EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';

function AdvancedErrorHandling() {
  const [currentStep, setCurrentStep] = useState<'authentication' | 'merchant_creation'>('authentication');
  
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: currentStep,
    credentials: {
      email: 'provider@example.com',
      password: 'securePassword123'
    },
    merchantInfo: {
      fiscalId: '12345678901',
      name: 'My Store',
      email: 'store@example.com',
      address: {
        streetAddress: 'Via Roma 1',
        zipCode: '00100',
        city: 'Roma',
        province: 'RM'
      }
    }
  });

  const getErrorGuidance = (error: string) => {
    if (error.includes('credentials')) {
      return {
        title: 'Authentication Failed',
        message: 'Please verify your email and password are correct.',
        action: 'retry',
        icon: '🔐'
      };
    }
    if (error.includes('fiscal ID')) {
      return {
        title: 'Invalid Fiscal ID',
        message: 'Please check the fiscal ID format and ensure it\'s not already registered.',
        action: 'edit',
        icon: '📋'
      };
    }
    if (error.includes('network')) {
      return {
        title: 'Network Error',
        message: 'Please check your internet connection and try again.',
        action: 'retry',
        icon: '🌐'
      };
    }
    if (error.includes('POS device')) {
      return {
        title: 'No POS Devices Available',
        message: 'Please contact your system administrator to provision POS devices.',
        action: 'contact_support',
        icon: '🖥️'
      };
    }
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred. Please try again.',
      action: 'retry',
      icon: '❓'
    };
  };

  const handleStepExecution = async () => {
    try {
      await compute();
      
      if (state.step === 'authentication' && !state.error) {
        setCurrentStep('merchant_creation');
      }
    } catch (error) {
      console.error('Step execution failed:', error);
    }
  };

  const errorInfo = state.error ? getErrorGuidance(state.error) : null;

  return (
    <EReceiptsProvider config={{ environment: 'sandbox', enableLogging: true }}>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Advanced Error Handling</h1>
        
        {/* Progress */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Progress</h3>
          <div>Step: <strong>{currentStep}</strong></div>
          <div>Progress: <strong>{state.progress}%</strong></div>
          <progress value={state.progress} max={100} style={{ width: '100%', height: '20px' }} />
        </div>

        {/* Advanced Error Display */}
        {errorInfo && (
          <div style={{ 
            border: '2px solid #f44336', 
            borderRadius: '8px', 
            padding: '20px', 
            marginBottom: '20px',
            backgroundColor: '#ffebee'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '24px', marginRight: '10px' }}>{errorInfo.icon}</span>
              <h3 style={{ margin: 0, color: '#d32f2f' }}>{errorInfo.title}</h3>
            </div>
            
            <p style={{ color: '#d32f2f', marginBottom: '15px' }}>{errorInfo.message}</p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {errorInfo.action === 'retry' && (
                <button 
                  onClick={handleStepExecution}
                  style={{
                    backgroundColor: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              )}
              
              {errorInfo.action === 'edit' && (
                <button 
                  onClick={() => alert('Navigate to edit form')}
                  style={{
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Edit Information
                </button>
              )}
              
              {errorInfo.action === 'contact_support' && (
                <button 
                  onClick={() => alert('Open support chat')}
                  style={{
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Contact Support
                </button>
              )}
              
              <button 
                onClick={clearError}
                style={{
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleStepExecution} 
            disabled={state.loading}
            style={{
              backgroundColor: state.loading ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: state.loading ? 'not-allowed' : 'pointer',
              marginRight: '10px'
            }}
          >
            {state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
          </button>
          
          <button 
            onClick={reset}
            style={{
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reset
          </button>
        </div>

        {/* Success State */}
        {state.step === 'completed' && (
          <div style={{ 
            backgroundColor: '#4caf50', 
            color: 'white', 
            padding: '20px', 
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            <h2>🎉 Success!</h2>
            <p>Onboarding completed successfully!</p>
          </div>
        )}
      </div>
    </EReceiptsProvider>
  );
}

export default AdvancedErrorHandling;
```

### 2. React Native Example

```tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Button, 
  Alert, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { useOnboardingFlow, EReceiptsProvider } from '@a-cube-io/ereceipts-js-sdk';

function ReactNativeOnboarding() {
  const [currentStep, setCurrentStep] = useState<'authentication' | 'merchant_creation'>('authentication');
  
  const { state, compute, reset, clearError } = useOnboardingFlow({
    role: 'provider',
    step: currentStep,
    credentials: {
      email: 'mobile@example.com',
      password: 'mobilePass123'
    },
    merchantInfo: {
      fiscalId: '98765432109',
      name: 'Mobile Store',
      email: 'mobile@store.com',
      address: {
        streetAddress: 'Via Mobile 1',
        zipCode: '20100',
        city: 'Milano',
        province: 'MI'
      }
    }
  });

  const handleStepExecution = async () => {
    try {
      await compute();
      
      if (state.step === 'authentication' && !state.error) {
        setCurrentStep('merchant_creation');
      }
      
      if (state.step === 'completed') {
        Alert.alert('Success', 'Onboarding completed successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Step execution failed. Please try again.');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Onboarding',
      'Are you sure you want to reset the onboarding process?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', onPress: reset, style: 'destructive' }
      ]
    );
  };

  return (
    <EReceiptsProvider 
      config={{ 
        environment: 'sandbox',
        enableLogging: __DEV__ 
      }}
    >
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Mobile Onboarding</Text>
        
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step: {currentStep}</Text>
          <Text style={styles.progressText}>Progress: {state.progress}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${state.progress}%` }
              ]} 
            />
          </View>
        </View>

        {/* Error Display */}
        {state.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{state.error}</Text>
            <Button title="Clear Error" onPress={clearError} color="#f44336" />
          </View>
        )}

        {/* Actions */}
        <View style={styles.buttonContainer}>
          <Button
            title={state.loading ? 'Processing...' : `Execute ${currentStep} Step`}
            onPress={handleStepExecution}
            disabled={state.loading}
            color="#2196F3"
          />
          
          <View style={styles.buttonSpacer} />
          
          <Button
            title="Reset"
            onPress={handleReset}
            color="#ff9800"
          />
        </View>

        {/* Results */}
        {state.result.merchantUuid && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results</Text>
            <Text style={styles.resultsText}>
              Merchant UUID: {state.result.merchantUuid}
            </Text>
            {state.result.posSerialNumber && (
              <Text style={styles.resultsText}>
                POS Serial: {state.result.posSerialNumber}
              </Text>
            )}
          </View>
        )}

        {/* Success State */}
        {state.step === 'completed' && (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>🎉 Success!</Text>
            <Text style={styles.successText}>
              Onboarding completed successfully!
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {state.loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>
    </EReceiptsProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  progressText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    marginBottom: 15
  },
  buttonContainer: {
    marginBottom: 20
  },
  buttonSpacer: {
    height: 10
  },
  resultsContainer: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10
  },
  resultsText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 5
  },
  successContainer: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center'
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10
  },
  successText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center'
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  }
});

export default ReactNativeOnboarding;
```

## 🔧 Troubleshooting

### Problemi Comuni e Soluzioni

#### 1. Hook non funziona senza EReceiptsProvider

**Problema:** Il hook restituisce errori quando usato senza EReceiptsProvider.

**Soluzione:** Inizializza manualmente l'SDK:

```tsx
import { useOnboardingFlow, initializeAPIClient } from '@a-cube-io/ereceipts-js-sdk';

function StandaloneComponent() {
  useEffect(() => {
    // Inizializza l'SDK manualmente
    initializeAPIClient({
      environment: 'sandbox',
      enableLogging: true
    });
  }, []);

  const { state, compute } = useOnboardingFlow({
    // ... configurazione
  });

  // ... resto del componente
}
```

#### 2. Step non progredisce automaticamente

**Problema:** Il hook esegue solo il step corrente, non progredisce automaticamente.

**Soluzione:** Implementa la logica di progressione manualmente:

```tsx
const handleStepExecution = async () => {
  try {
    await compute();
    
    // Logica di progressione manuale
    if (state.step === 'authentication' && !state.error) {
      setCurrentStep('merchant_check');
    } else if (state.step === 'merchant_check' && !state.error) {
      if (state.result.merchantUuid) {
        setCurrentStep('pos_creation');
      } else {
        setCurrentStep('merchant_creation');
      }
    }
  } catch (error) {
    console.error('Step execution failed:', error);
  }
};
```

#### 3. Errori di rete non gestiti

**Problema:** Errori di rete generici senza informazioni utili.

**Soluzione:** Usa la gestione errori specifica del hook:

```tsx
const getErrorAction = (error: string) => {
  if (error.includes('network')) {
    return {
      action: 'retry',
      message: 'Please check your internet connection and try again.'
    };
  }
  if (error.includes('credentials')) {
    return {
      action: 'edit',
      message: 'Please verify your email and password.'
    };
  }
  return {
    action: 'retry',
    message: 'Please try again or contact support.'
  };
};
```

#### 4. Stato non persiste tra riavvii

**Problema:** L'onboarding ricomincia da capo dopo il riavvio dell'app.

**Soluzione:** Il hook gestisce automaticamente la persistenza, ma assicurati che:

```tsx
// Il hook carica automaticamente lo stato salvato
useEffect(() => {
  // Lo stato viene ripristinato automaticamente
  console.log('Current step:', state.step);
  console.log('Progress:', state.progress);
}, []);
```

#### 5. Problemi di autenticazione

**Problema:** L'utente rimane bloccato nel step di autenticazione.

**Soluzione:** Verifica lo stato di autenticazione:

```tsx
import { useEReceipts } from '@a-cube-io/ereceipts-js-sdk';

function OnboardingComponent() {
  const { isAuthenticated, currentUser } = useEReceipts();
  
  // Se già autenticato, salta il step di autenticazione
  useEffect(() => {
    if (isAuthenticated && currentStep === 'authentication') {
      setCurrentStep('merchant_check');
    }
  }, [isAuthenticated, currentStep]);

  // ... resto del componente
}
```

### Best Practices

1. **Sempre gestire gli errori** con messaggi specifici
2. **Implementare la progressione manuale** dei step
3. **Verificare lo stato dell'SDK** prima di usare il hook
4. **Usare EReceiptsProvider** quando possibile per una migliore integrazione
5. **Testare su dispositivi reali** per React Native
6. **Monitorare i log** per debugging
7. **Implementare retry logic** per errori temporanei

## 📚 Risorse Aggiuntive

- [Documentazione Principale](../hooks/useOnboardingFlow.md)
- [EReceiptsProvider Guide](../guides/react-provider.md)
- [API Reference](../api/authentication.md)
- [Getting Started](../guides/getting-started.md) 