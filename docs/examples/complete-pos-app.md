# Complete Point of Sale Application Example

This example demonstrates a full-featured Point of Sale application using the A-Cube SDK, including authentication, receipt creation, offline support, and role-based access control.

## Project Structure

```
pos-app/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── pos/
│   │   │   ├── ReceiptCreator.tsx
│   │   │   ├── ReceiptHistory.tsx
│   │   │   └── ProductSelector.tsx
│   │   ├── admin/
│   │   │   ├── MerchantDashboard.tsx
│   │   │   └── CashierManagement.tsx
│   │   └── common/
│   │       ├── LoadingScreen.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── OfflineIndicator.tsx
│   ├── services/
│   │   ├── acube.ts
│   │   ├── products.ts
│   │   └── storage.ts
│   ├── hooks/
│   │   ├── useProducts.ts
│   │   └── useReceiptHistory.ts
│   ├── types/
│   │   └── app.ts
│   └── App.tsx
└── package.json
```

## 1. Main Application Setup

### App.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth, useRetryQueue } from '@acube/e-receipt';
import { initializeACubeSDK } from './services/acube';
import { AuthGuard } from './components/auth/AuthGuard';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { MainNavigator } from './navigation/MainNavigator';

export default function App() {
  const [sdkReady, setSdkReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeACubeSDK();
        setSdkReady(true);
      } catch (error: any) {
        setInitError(error.message);
      }
    };
    
    initialize();
  }, []);
  
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text>Failed to initialize POS system: {initError}</Text>
      </View>
    );
  }
  
  if (!sdkReady) {
    return <LoadingScreen message="Initializing POS System..." />;
  }
  
  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <OfflineIndicator />
        <AuthGuard>
          <MainNavigator />
        </AuthGuard>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});
```

### services/acube.ts
```typescript
import { initSDK, configureSDK } from '@acube/e-receipt';

export const initializeACubeSDK = async () => {
  try {
    await initSDK({
      environment: __DEV__ ? 'sandbox' : 'production',
      enableLogging: __DEV__,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableOfflineQueue: true,
      timeout: 30000
    });
    
    console.log('A-Cube SDK initialized successfully');
  } catch (error) {
    console.error('Failed to initialize A-Cube SDK:', error);
    throw error;
  }
};

export const switchEnvironment = (environment: 'sandbox' | 'production') => {
  configureSDK({
    environment,
    enableLogging: environment === 'sandbox'
  });
};
```

## 2. Authentication Components

### components/auth/LoginScreen.tsx
```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useAuth, Button, FormInput, validateEmail, validatePassword } from '@acube/e-receipt';

interface LoginForm {
  email: string;
  password: string;
  role: 'provider' | 'merchant' | 'cashier';
}

export const LoginScreen: React.FC = () => {
  const { loginAsProvider, loginAsMerchant, loginAsCashier, isLoading, error, clearError } = useAuth();
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    role: 'cashier'
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors[0].message;
    }
    
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0].message;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    clearError();
    
    try {
      switch (form.role) {
        case 'provider':
          await loginAsProvider(form.email, form.password);
          break;
        case 'merchant':
          await loginAsMerchant(form.email, form.password);
          break;
        case 'cashier':
          await loginAsCashier(form.email, form.password);
          break;
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      Alert.alert('Login Failed', err.message);
    }
  };
  
  const updateForm = (field: keyof LoginForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>POS System Login</Text>
        
        {/* Role Selection */}
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>Login as:</Text>
          {(['cashier', 'merchant', 'provider'] as const).map((role) => (
            <Button
              key={role}
              title={role.charAt(0).toUpperCase() + role.slice(1)}
              variant={form.role === role ? 'primary' : 'outline'}
              size="small"
              onPress={() => updateForm('role', role)}
              style={styles.roleButton}
            />
          ))}
        </View>
        
        {/* Email Input */}
        <FormInput
          label="Email Address"
          value={form.email}
          onChangeText={(value) => updateForm('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Enter your email"
          error={validationErrors.email}
          required
        />
        
        {/* Password Input */}
        <FormInput
          label="Password"
          value={form.password}
          onChangeText={(value) => updateForm('password', value)}
          secureTextEntry
          showPasswordToggle
          placeholder="Enter your password"
          error={validationErrors.password}
          required
        />
        
        {/* Login Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Login Button */}
        <Button
          title={isLoading ? 'Logging in...' : 'Login'}
          onPress={handleLogin}
          loading={isLoading}
          disabled={!form.email || !form.password}
          size="large"
          fullWidth
          style={styles.loginButton}
        />
        
        {/* Demo Credentials */}
        {__DEV__ && (
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Credentials:</Text>
            <Text style={styles.demoText}>Cashier: cashier@demo.com / Demo123!</Text>
            <Text style={styles.demoText}>Merchant: merchant@demo.com / Demo123!</Text>
            <Text style={styles.demoText}>Provider: provider@demo.com / Demo123!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  form: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: '#333',
  },
  roleButton: {
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 20,
  },
  demoContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976d2',
  },
  demoText: {
    fontSize: 12,
    color: '#1976d2',
    marginBottom: 2,
  },
});
```

### components/auth/AuthGuard.tsx
```typescript
import React from 'react';
import { useAuth } from '@acube/e-receipt';
import { LoginScreen } from './LoginScreen';
import { LoadingScreen } from '../common/LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'provider' | 'merchant' | 'cashier';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole = 'cashier' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }
  
  if (!isAuthenticated) {
    return <LoginScreen />;
  }
  
  // Check role hierarchy: provider > merchant > cashier
  const roleHierarchy: Record<string, number> = {
    provider: 3,
    merchant: 2,
    cashier: 1,
  };
  
  const userLevel = roleHierarchy[user?.role || 'cashier'];
  const requiredLevel = roleHierarchy[requiredRole];
  
  if (userLevel < requiredLevel) {
    return (
      <LoadingScreen 
        message={`Access denied. Required role: ${requiredRole}`} 
      />
    );
  }
  
  return <>{children}</>;
};
```

## 3. Point of Sale Components

### components/pos/ReceiptCreator.tsx
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  createReceipt, 
  Button, 
  FormInput, 
  validateReceiptItem,
  useAuth
} from '@acube/e-receipt';
import type { ReceiptItem, ReceiptInput } from '@acube/e-receipt';
import { ProductSelector } from './ProductSelector';
import { useProducts } from '../../hooks/useProducts';

interface ReceiptState {
  items: ReceiptItem[];
  customerLotteryCode: string;
  paymentMethod: 'cash' | 'card' | 'mixed';
  cashAmount: string;
  cardAmount: string;
}

export const ReceiptCreator: React.FC = () => {
  const { user } = useAuth();
  const { products } = useProducts();
  const [receipt, setReceipt] = useState<ReceiptState>({
    items: [],
    customerLotteryCode: '',
    paymentMethod: 'cash',
    cashAmount: '0.00',
    cardAmount: '0.00',
  });
  const [loading, setLoading] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  const calculateTotal = (): number => {
    return receipt.items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);
  };
  
  const updatePaymentAmounts = (total: number) => {
    switch (receipt.paymentMethod) {
      case 'cash':
        setReceipt(prev => ({
          ...prev,
          cashAmount: total.toFixed(2),
          cardAmount: '0.00'
        }));
        break;
      case 'card':
        setReceipt(prev => ({
          ...prev,
          cashAmount: '0.00',
          cardAmount: total.toFixed(2)
        }));
        break;
      // 'mixed' allows manual entry
    }
  };
  
  useEffect(() => {
    const total = calculateTotal();
    if (receipt.paymentMethod !== 'mixed') {
      updatePaymentAmounts(total);
    }
  }, [receipt.items, receipt.paymentMethod]);
  
  const addProduct = (product: any) => {
    const newItem: ReceiptItem = {
      quantity: '1.00',
      description: product.name,
      unit_price: product.price.toFixed(2),
      good_or_service: product.type === 'service' ? 'S' : 'B',
      vat_rate_code: product.vatRate || '22'
    };
    
    setReceipt(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    setShowProductSelector(false);
  };
  
  const updateItem = (index: number, field: keyof ReceiptItem, value: string) => {
    setReceipt(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };
  
  const removeItem = (index: number) => {
    setReceipt(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };
  
  const validateReceipt = (): string | null => {
    if (receipt.items.length === 0) {
      return 'At least one item is required';
    }
    
    for (const [index, item] of receipt.items.entries()) {
      const validation = validateReceiptItem(item);
      if (!validation.isValid) {
        return `Item ${index + 1}: ${validation.errors[0].message}`;
      }
    }
    
    const total = calculateTotal();
    const paymentTotal = parseFloat(receipt.cashAmount) + parseFloat(receipt.cardAmount);
    
    if (Math.abs(total - paymentTotal) > 0.01) {
      return 'Payment amounts must equal the total';
    }
    
    return null;
  };
  
  const handleCreateReceipt = async () => {
    const validationError = validateReceipt();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      const receiptData: ReceiptInput = {
        items: receipt.items,
        customer_lottery_code: receipt.customerLotteryCode || undefined,
        cash_payment_amount: receipt.cashAmount,
        electronic_payment_amount: receipt.cardAmount,
      };
      
      const createdReceipt = await createReceipt(receiptData);
      
      Alert.alert(
        'Receipt Created',
        `Receipt created successfully!\nID: ${createdReceipt.uuid}`,
        [
          { text: 'New Receipt', onPress: resetReceipt },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Failed to create receipt: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const resetReceipt = () => {
    setReceipt({
      items: [],
      customerLotteryCode: '',
      paymentMethod: 'cash',
      cashAmount: '0.00',
      cardAmount: '0.00',
    });
  };
  
  const total = calculateTotal();
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Create Receipt</Text>
        <Text style={styles.cashier}>Cashier: {user?.email}</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items ({receipt.items.length})</Text>
            <Button
              title="Add Product"
              variant="outline"
              size="small"
              onPress={() => setShowProductSelector(true)}
            />
          </View>
          
          {receipt.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item {index + 1}</Text>
                <Button
                  title="×"
                  variant="danger"
                  size="small"
                  onPress={() => removeItem(index)}
                  style={styles.removeButton}
                />
              </View>
              
              <FormInput
                label="Description"
                value={item.description}
                onChangeText={(value) => updateItem(index, 'description', value)}
                placeholder="Enter item description"
                required
              />
              
              <View style={styles.itemRow}>
                <FormInput
                  label="Quantity"
                  value={item.quantity}
                  onChangeText={(value) => updateItem(index, 'quantity', value)}
                  placeholder="1.00"
                  keyboardType="decimal-pad"
                  containerStyle={styles.itemInputHalf}
                />
                
                <FormInput
                  label="Unit Price (€)"
                  value={item.unit_price}
                  onChangeText={(value) => updateItem(index, 'unit_price', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  containerStyle={styles.itemInputHalf}
                />
              </View>
              
              <View style={styles.itemOptions}>
                <Text style={styles.optionLabel}>Type:</Text>
                {(['B', 'S'] as const).map((type) => (
                  <Button
                    key={type}
                    title={type === 'B' ? 'Goods' : 'Services'}
                    variant={item.good_or_service === type ? 'primary' : 'outline'}
                    size="small"
                    onPress={() => updateItem(index, 'good_or_service', type)}
                    style={styles.optionButton}
                  />
                ))}
              </View>
              
              <Text style={styles.itemTotal}>
                Subtotal: €{(parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2)}
              </Text>
            </View>
          ))}
          
          {receipt.items.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No items added yet</Text>
              <Button
                title="Add Your First Item"
                variant="outline"
                onPress={() => setShowProductSelector(true)}
              />
            </View>
          )}
        </View>
        
        {/* Customer Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <FormInput
            label="Lottery Code (Optional)"
            value={receipt.customerLotteryCode}
            onChangeText={(value) => setReceipt(prev => ({ ...prev, customerLotteryCode: value }))}
            placeholder="Enter lottery code"
            maxLength={20}
          />
        </View>
        
        {/* Payment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          
          <View style={styles.paymentMethods}>
            {(['cash', 'card', 'mixed'] as const).map((method) => (
              <Button
                key={method}
                title={method.charAt(0).toUpperCase() + method.slice(1)}
                variant={receipt.paymentMethod === method ? 'primary' : 'outline'}
                size="small"
                onPress={() => setReceipt(prev => ({ ...prev, paymentMethod: method }))}
                style={styles.paymentButton}
              />
            ))}
          </View>
          
          <View style={styles.paymentAmounts}>
            <FormInput
              label="Cash Amount (€)"
              value={receipt.cashAmount}
              onChangeText={(value) => setReceipt(prev => ({ ...prev, cashAmount: value }))}
              keyboardType="decimal-pad"
              editable={receipt.paymentMethod !== 'card'}
              containerStyle={styles.paymentInput}
            />
            
            <FormInput
              label="Card Amount (€)"
              value={receipt.cardAmount}
              onChangeText={(value) => setReceipt(prev => ({ ...prev, cardAmount: value }))}
              keyboardType="decimal-pad"
              editable={receipt.paymentMethod !== 'cash'}
              containerStyle={styles.paymentInput}
            />
          </View>
        </View>
      </ScrollView>
      
      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>€{total.toFixed(2)}</Text>
        </View>
        
        <View style={styles.footerButtons}>
          <Button
            title="Clear All"
            variant="outline"
            onPress={resetReceipt}
            disabled={loading || receipt.items.length === 0}
            style={styles.footerButton}
          />
          
          <Button
            title={loading ? 'Creating...' : 'Create Receipt'}
            variant="primary"
            onPress={handleCreateReceipt}
            loading={loading}
            disabled={loading || receipt.items.length === 0}
            style={styles.footerButton}
          />
        </View>
      </View>
      
      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelector
          products={products}
          onSelect={addProduct}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  cashier: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  removeButton: {
    minWidth: 32,
    height: 32,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemInputHalf: {
    flex: 1,
  },
  itemOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  optionButton: {
    minWidth: 80,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  paymentButton: {
    flex: 1,
  },
  paymentAmounts: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentInput: {
    flex: 1,
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
```

## 4. Common Components

### components/common/OfflineIndicator.tsx
```typescript
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRetryQueue, Button } from '@acube/e-receipt';

export const OfflineIndicator: React.FC = () => {
  const { stats, isProcessing, isConnected, processQueue } = useRetryQueue();
  const [visible, setVisible] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    const shouldShow = !isConnected || stats.total > 0;
    
    if (shouldShow !== visible) {
      setVisible(shouldShow);
      
      Animated.timing(fadeAnim, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, stats.total, visible, fadeAnim]);
  
  if (!visible) {
    return null;
  }
  
  const getStatusColor = () => {
    if (!isConnected) return '#f44336'; // Red for offline
    if (isProcessing) return '#ff9800'; // Orange for processing
    return '#4caf50'; // Green for online with queue
  };
  
  const getStatusText = () => {
    if (!isConnected) {
      return `Offline - ${stats.total} requests queued`;
    }
    if (isProcessing) {
      return `Processing ${stats.total} queued requests...`;
    }
    if (stats.total > 0) {
      return `${stats.total} requests pending`;
    }
    return 'Online';
  };
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: getStatusColor(), opacity: fadeAnim }
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.text}>{getStatusText()}</Text>
        
        {stats.total > 0 && !isProcessing && (
          <Button
            title="Retry Now"
            variant="outline"
            size="small"
            onPress={processQueue}
            style={styles.retryButton}
            textStyle={styles.retryButtonText}
          />
        )}
      </View>
      
      {stats.byPriority.high > 0 && (
        <Text style={styles.priorityText}>
          {stats.byPriority.high} high priority
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    backgroundColor: 'transparent',
    borderColor: '#ffffff',
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
  },
  priorityText: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9,
  },
});
```

This complete Point of Sale application example demonstrates:

1. **Full Authentication Flow**: Login with role-based access control
2. **Receipt Creation**: Complete receipt creation with validation
3. **Offline Support**: Visual indicators and automatic retry
4. **Product Management**: Integrated product selection
5. **Error Handling**: Comprehensive error handling and user feedback
6. **Professional UI**: Clean, responsive design with proper styling
7. **Type Safety**: Full TypeScript integration
8. **Cross-Platform**: Works on React Native and Web

The example shows how to build a production-ready POS application using the A-Cube SDK with proper architecture, error handling, and user experience considerations.