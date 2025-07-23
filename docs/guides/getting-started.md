# Getting Started with A-Cube SDK

This guide will walk you through setting up and using the A-Cube SDK in your React, React Native, or PWA project.

## Prerequisites

- Node.js 16 or higher
- React 16.8+ (for hooks support)
- React Native 0.60+ (if using React Native)
- TypeScript 4.0+ (recommended)

## Installation

### 1. Install the SDK

```bash
npm install @acube/e-receipt
# or
yarn add @acube/e-receipt
```

### 2. Install Peer Dependencies

#### For React Native Projects:
```bash
npm install @react-native-async-storage/async-storage react-native-keychain
```

#### For React Native with Expo:
```bash
npx expo install @react-native-async-storage/async-storage
npm install react-native-keychain
```

#### For Web Projects:
```bash
# No additional dependencies required for web
```

### 3. Platform-Specific Setup

#### React Native (iOS)
Add to `ios/Podfile`:
```ruby
target 'YourApp' do
  # ... other dependencies
  pod 'RNKeychain', :path => '../node_modules/react-native-keychain'
end
```

Then run:
```bash
cd ios && pod install
```

#### React Native (Android)
The dependencies should auto-link. If using React Native < 0.60, follow manual linking instructions.

## Initial Setup

### 1. Initialize the SDK

Create an initialization file (`src/services/acube.ts`):

```typescript
import { initSDK, configureSDK } from '@acube/e-receipt';

export const initializeACubeSDK = async () => {
  try {
    // Initialize with configuration
    await initSDK({
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      enableLogging: process.env.NODE_ENV === 'development',
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableOfflineQueue: true,
      timeout: 30000
    });
    
    console.log('A-Cube SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize A-Cube SDK:', error);
    return false;
  }
};

// Optional: Configure SDK later
export const updateSDKConfig = (environment: 'sandbox' | 'production') => {
  configureSDK({
    environment,
    enableLogging: environment === 'sandbox'
  });
};
```

### 2. Initialize in Your App

#### React Native (App.tsx):
```typescript
import React, { useEffect, useState } from 'react';
import { initializeACubeSDK } from './src/services/acube';
import MainApp from './src/MainApp';
import LoadingScreen from './src/components/LoadingScreen';

export default function App() {
  const [sdkReady, setSdkReady] = useState(false);
  
  useEffect(() => {
    const initialize = async () => {
      const success = await initializeACubeSDK();
      setSdkReady(success);
    };
    
    initialize();
  }, []);
  
  if (!sdkReady) {
    return <LoadingScreen message="Initializing A-Cube SDK..." />;
  }
  
  return <MainApp />;
}
```

#### React Web (index.tsx):
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeACubeSDK } from './services/acube';
import App from './App';

const startApp = async () => {
  // Initialize SDK before rendering app
  const sdkReady = await initializeACubeSDK();
  
  if (!sdkReady) {
    console.error('Failed to initialize A-Cube SDK');
    return;
  }
  
  const root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(<App />);
};

startApp();
```

## Basic Usage

### 1. Authentication

Create an authentication component:

```typescript
import React, { useState } from 'react';
import { useAuth, Button, FormInput } from '@acube/e-receipt';

export const LoginScreen: React.FC = () => {
  const { loginAsProvider, loginAsMerchant, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState<'provider' | 'merchant'>('merchant');
  
  const handleLogin = async () => {
    clearError();
    
    try {
      if (loginType === 'provider') {
        await loginAsProvider(email, password);
      } else {
        await loginAsMerchant(email, password);
      }
      // Navigation handled by auth state change
    } catch (err) {
      console.error('Login failed:', err);
    }
  };
  
  return (
    <div style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h1>A-Cube Login</h1>
      
      <div style={{ marginBottom: 20 }}>
        <label>
          <input
            type="radio"
            value="provider"
            checked={loginType === 'provider'}
            onChange={(e) => setLoginType(e.target.value as 'provider')}
          />
          Provider
        </label>
        <label style={{ marginLeft: 20 }}>
          <input
            type="radio"
            value="merchant"
            checked={loginType === 'merchant'}
            onChange={(e) => setLoginType(e.target.value as 'merchant')}
          />
          Merchant
        </label>
      </div>
      
      <FormInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Enter your email"
        required
      />
      
      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        placeholder="Enter your password"
        required
      />
      
      {error && (
        <div style={{ color: 'red', marginBottom: 20 }}>
          {error}
        </div>
      )}
      
      <Button
        title={isLoading ? 'Logging in...' : 'Login'}
        onPress={handleLogin}
        loading={isLoading}
        disabled={!email || !password}
        fullWidth
      />
    </div>
  );
};
```

### 2. Main Application with Auth Guard

```typescript
import React from 'react';
import { useAuth } from '@acube/e-receipt';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen } from './components/LoadingScreen';

export const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  return <Dashboard user={user} />;
};
```

### 3. Create Your First Receipt

```typescript
import React, { useState } from 'react';
import { createReceipt, Button, FormInput, validateReceiptItem } from '@acube/e-receipt';
import type { ReceiptItem } from '@acube/e-receipt';

export const ReceiptCreator: React.FC = () => {
  const [items, setItems] = useState<ReceiptItem[]>([{
    quantity: '1.00',
    description: '',
    unit_price: '0.00',
    good_or_service: 'B'
  }]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  const updateItem = (index: number, field: keyof ReceiptItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };
  
  const addItem = () => {
    setItems([...items, {
      quantity: '1.00',
      description: '',
      unit_price: '0.00',
      good_or_service: 'B'
    }]);
  };
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price || '0'));
    }, 0).toFixed(2);
  };
  
  const handleCreateReceipt = async () => {
    // Validate all items
    for (const item of items) {
      const validation = validateReceiptItem(item);
      if (!validation.isValid) {
        setResult(`Validation error: ${validation.errors[0].message}`);
        return;
      }
    }
    
    setLoading(true);
    setResult('');
    
    try {
      const receipt = await createReceipt({
        items,
        cash_payment_amount: calculateTotal()
      });
      
      setResult(`Receipt created successfully! UUID: ${receipt.uuid}`);
      
      // Reset form
      setItems([{
        quantity: '1.00',
        description: '',
        unit_price: '0.00',
        good_or_service: 'B'
      }]);
    } catch (error: any) {
      setResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: 20 }}>
      <h2>Create Receipt</h2>
      
      {items.map((item, index) => (
        <div key={index} style={{ 
          border: '1px solid #ccc', 
          padding: 15, 
          marginBottom: 15,
          borderRadius: 5
        }}>
          <h4>Item {index + 1}</h4>
          
          <FormInput
            label="Description"
            value={item.description}
            onChangeText={(value) => updateItem(index, 'description', value)}
            placeholder="Enter item description"
            required
          />
          
          <div style={{ display: 'flex', gap: 10 }}>
            <FormInput
              label="Quantity"
              value={item.quantity}
              onChangeText={(value) => updateItem(index, 'quantity', value)}
              placeholder="1.00"
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
            
            <FormInput
              label="Unit Price (€)"
              value={item.unit_price}
              onChangeText={(value) => updateItem(index, 'unit_price', value)}
              placeholder="0.00"
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
          </div>
          
          <div style={{ marginTop: 10 }}>
            <label>Type: </label>
            <select
              value={item.good_or_service}
              onChange={(e) => updateItem(index, 'good_or_service', e.target.value as 'B' | 'S')}
            >
              <option value="B">Goods</option>
              <option value="S">Services</option>
            </select>
          </div>
          
          {items.length > 1 && (
            <Button
              title="Remove Item"
              variant="danger"
              size="small"
              onPress={() => removeItem(index)}
              style={{ marginTop: 10 }}
            />
          )}
        </div>
      ))}
      
      <div style={{ marginBottom: 20 }}>
        <Button title="Add Item" variant="outline" onPress={addItem} />
      </div>
      
      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: 15, 
        borderRadius: 5,
        marginBottom: 20
      }}>
        <h3>Total: €{calculateTotal()}</h3>
      </div>
      
      <Button
        title={loading ? 'Creating Receipt...' : 'Create Receipt'}
        variant="primary"
        size="large"
        onPress={handleCreateReceipt}
        loading={loading}
        disabled={loading || items.some(item => !item.description.trim())}
        fullWidth
      />
      
      {result && (
        <div style={{ 
          marginTop: 20, 
          padding: 15,
          backgroundColor: result.includes('Error') ? '#ffebee' : '#e8f5e8',
          color: result.includes('Error') ? '#c62828' : '#2e7d32',
          borderRadius: 5
        }}>
          {result}
        </div>
      )}
    </div>
  );
};
```

## Environment Configuration

### Development vs Production

Create environment-specific configurations:

#### `.env.development`:
```env
REACT_APP_ACUBE_ENVIRONMENT=sandbox
REACT_APP_ACUBE_LOGGING=true
REACT_APP_ACUBE_BASE_URL=https://api-sandbox.acube.it
```

#### `.env.production`:
```env
REACT_APP_ACUBE_ENVIRONMENT=production
REACT_APP_ACUBE_LOGGING=false
REACT_APP_ACUBE_BASE_URL=https://api.acube.it
```

#### Environment-aware initialization:
```typescript
import { initSDK } from '@acube/e-receipt';

export const initializeACubeSDK = async () => {
  await initSDK({
    environment: process.env.REACT_APP_ACUBE_ENVIRONMENT as 'sandbox' | 'production',
    enableLogging: process.env.REACT_APP_ACUBE_LOGGING === 'true',
    baseURL: process.env.REACT_APP_ACUBE_BASE_URL
  });
};
```

## Debugging and Development

### Enable Logging
```typescript
import { configureSDK, logInfo } from '@acube/e-receipt';

// Enable detailed logging in development
if (process.env.NODE_ENV === 'development') {
  configureSDK({ enableLogging: true });
  logInfo('A-Cube SDK debug mode enabled');
}
```

### Access Debug Information
```typescript
// In development, access debug utilities
if (process.env.NODE_ENV === 'development') {
  // Access global debug object
  console.log('SDK Debug Info:', (global as any).__ACUBE_SDK__);
  
  // Clear all data for testing
  await (global as any).__ACUBE_SDK__.clearAllData();
}
```

### Monitor Offline Queue
```typescript
import { useRetryQueue } from '@acube/e-receipt';

function DebugPanel() {
  const { stats, isConnected, processQueue } = useRetryQueue();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white',
      padding: 10,
      fontSize: 12
    }}>
      <div>Network: {isConnected ? '🟢 Online' : '🔴 Offline'}</div>
      <div>Queue: {stats.total} requests</div>
      <div>High Priority: {stats.byPriority.high}</div>
      {stats.total > 0 && (
        <button onClick={processQueue}>Process Queue</button>
      )}
    </div>
  );
}
```

## Next Steps

1. **Explore the API**: Check out the [complete API documentation](../README.md)
2. **Learn Authentication**: Read the [authentication guide](../api/authentication.md)
3. **Handle Offline Scenarios**: Implement offline-first patterns
4. **Add Error Handling**: Implement comprehensive error handling
5. **Customize UI**: Style the SDK components to match your app

## Common Issues and Solutions

### 1. React Native KeyChain Issues
If you encounter keychain errors on iOS:
```bash
cd ios && pod install
# Clean and rebuild
rm -rf ios/build
npx react-native run-ios
```

### 2. AsyncStorage Warnings
If you see AsyncStorage warnings, ensure you've installed the correct package:
```bash
npm uninstall @react-native-community/async-storage
npm install @react-native-async-storage/async-storage
```

### 3. Network Configuration
For React Native, you might need to configure network security:

#### Android (`android/app/src/main/AndroidManifest.xml`):
```xml
<application
  android:usesCleartextTraffic="true"
  android:networkSecurityConfig="@xml/network_security_config">
```

#### iOS Info.plist:
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

This getting started guide provides everything you need to integrate the A-Cube SDK into your project and start building e-receipt functionality.