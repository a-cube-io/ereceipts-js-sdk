# Cross-Platform Components Guide

This guide covers the cross-platform authentication components and provider implementation for the A-Cube E-Receipt SDK, enabling seamless operation across React web and React Native applications.

## Overview

The A-Cube SDK now includes cross-platform support that automatically detects the runtime environment and renders appropriate components for React web or React Native. This implementation maintains full backward compatibility while providing a native experience on each platform.

## Key Features

- **Automatic Platform Detection**: Components detect whether they're running in React web or React Native
- **Unified API**: Same component interfaces work across both platforms
- **Native Experience**: Platform-specific UI elements and interactions
- **Network Management**: Intelligent network monitoring for both web and mobile
- **Type Safety**: Full TypeScript support with cross-platform type definitions

## Architecture

### Platform Detection

The SDK uses a reliable platform detection mechanism:

```typescript
export const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
export const isWeb = !isReactNative;
```

### Component Architecture

```
src/hooks/react/
├── platform-components.tsx      # Platform abstraction layer
├── auth-components.tsx         # Main export (backward compatible)
├── auth-components-cross-platform.tsx  # Cross-platform implementations
└── ACubeProvider.tsx          # Cross-platform provider with network management
```

## Platform Components

### Core Components

The SDK provides platform-agnostic wrapper components that automatically render the appropriate native elements:

#### PlatformView
- **Web**: Renders as `<div>` or `<button>` (if onPress is provided)
- **React Native**: Renders as `View` or `TouchableOpacity`

```typescript
import { PlatformView } from '@a-cube-io/cli/hooks/react/platform-components';

<PlatformView style={styles.container} onPress={handlePress}>
  {/* Content */}
</PlatformView>
```

#### PlatformText
- **Web**: Renders as `<span>`
- **React Native**: Renders as `Text`

```typescript
<PlatformText style={styles.label} numberOfLines={2}>
  Your text content
</PlatformText>
```

#### PlatformTextInput
- **Web**: Renders as `<input>` or `<textarea>`
- **React Native**: Renders as `TextInput`

```typescript
<PlatformTextInput
  value={value}
  onChangeText={setValue}
  placeholder="Enter text"
  secureTextEntry={isPassword}
  keyboardType="email-address"
/>
```

#### PlatformButton
- **Web**: Renders as `<button>`
- **React Native**: Renders as `TouchableOpacity`

```typescript
<PlatformButton onPress={handleSubmit} disabled={isLoading}>
  <PlatformText>Submit</PlatformText>
</PlatformButton>
```

#### PlatformPicker
- **Web**: Renders as `<select>`
- **React Native**: Renders as `Picker` (requires `@react-native-picker/picker`)

```typescript
<PlatformPicker
  selectedValue={selectedRole}
  onValueChange={setSelectedRole}
>
  <option value="admin">Admin</option>
  <option value="user">User</option>
</PlatformPicker>
```

#### PlatformScrollView
- **Web**: Renders as scrollable `<div>`
- **React Native**: Renders as `ScrollView`

```typescript
<PlatformScrollView style={styles.container}>
  {/* Scrollable content */}
</PlatformScrollView>
```

### Utility Functions

#### showAlert
Cross-platform alert dialog:

```typescript
import { showAlert } from '@a-cube-io/cli/hooks/react/platform-components';

showAlert(
  'Confirm Action',
  'Are you sure you want to proceed?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', onPress: () => handleConfirm() }
  ]
);
```

#### navigateTo
Cross-platform navigation helper:

```typescript
import { navigateTo } from '@a-cube-io/cli/hooks/react/platform-components';

// Web: Uses window.location.href
// React Native: Requires integration with your navigation library
navigateTo('/dashboard');
```

#### createStyles
Platform-aware style creation:

```typescript
import { createStyles } from '@a-cube-io/cli/hooks/react/platform-components';

const styles = createStyles({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#333',
  }
});
```

## Authentication Components

All authentication components now work seamlessly across platforms:

### LoginForm

```typescript
import { LoginForm } from '@a-cube-io/cli/hooks/react/auth-components';

<LoginForm
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => console.error(error)}
  showRememberMe={true}
  allowRoleSelection={true}
  availableRoles={['ROLE_USER', 'ROLE_ADMIN']}
/>
```

### UserProfile

```typescript
import { UserProfile } from '@a-cube-io/cli/hooks/react/auth-components';

<UserProfile
  showRoles={true}
  showSession={true}
  showPermissions={false}
/>
```

### ProtectedRoute

```typescript
import { ProtectedRoute } from '@a-cube-io/cli/hooks/react/auth-components';

<ProtectedRoute
  requiredRole="ROLE_ADMIN"
  redirectTo="/login"
>
  <AdminDashboard />
</ProtectedRoute>
```

### RoleSwitcher

```typescript
import { RoleSwitcher } from '@a-cube-io/cli/hooks/react/auth-components';

<RoleSwitcher
  availableRoles={['ROLE_USER', 'ROLE_ADMIN']}
  onRoleSwitch={(role) => console.log('Switched to:', role)}
/>
```

## ACubeProvider

The provider now includes cross-platform network management:

```typescript
import { ACubeProvider } from '@a-cube-io/cli/hooks/react/ACubeProvider';

function App() {
  return (
    <ACubeProvider
      config={{
        apiKey: 'your-api-key',
        environment: 'production',
        features: {
          enableOfflineQueue: true,
          enableSync: true,
        }
      }}
    >
      <YourApp />
    </ACubeProvider>
  );
}
```

### Network Management

The provider automatically uses the appropriate network manager:

- **Web**: Uses `NetworkManager` with browser online/offline events
- **React Native**: Uses `ConnectivityManager` with advanced mobile network detection

```typescript
import { useACubeNetworkStatus } from '@a-cube-io/cli/hooks/react/ACubeProvider';

function NetworkIndicator() {
  const { isOnline, quality, type } = useACubeNetworkStatus();
  
  return (
    <PlatformView>
      <PlatformText>
        Network: {isOnline ? 'Online' : 'Offline'}
        {isOnline && ` (${quality} - ${type})`}
      </PlatformText>
    </PlatformView>
  );
}
```

## Styling Best Practices

### 1. Use Platform-Aware Styles

```typescript
const styles = createStyles({
  container: {
    padding: 20,
    // Web-specific styles
    ...(isWeb && {
      maxWidth: 400,
      margin: '0 auto',
    }),
    // React Native specific styles
    ...(isReactNative && {
      flex: 1,
    }),
  },
});
```

### 2. Handle Platform Differences

```typescript
const styles = createStyles({
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    // Web-specific
    ...(isWeb && {
      width: '100%',
      boxSizing: 'border-box',
    }),
  },
});
```

### 3. Responsive Design

```typescript
const styles = createStyles({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    // Web hover states
    ...(isWeb && {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#0051D5',
      },
    }),
  },
});
```

## Migration Guide

### From Web-Only to Cross-Platform

1. **Update imports**: No changes needed - existing imports continue to work
2. **Remove className props**: Replace with style props
3. **Update event handlers**: onChange → onChangeText for text inputs
4. **Test on both platforms**: Ensure consistent behavior

### Example Migration

Before (Web-only):
```typescript
<div className="auth-form">
  <input 
    type="email" 
    className="auth-input"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  <button className="auth-button" onClick={handleSubmit}>
    Submit
  </button>
</div>
```

After (Cross-platform):
```typescript
<PlatformView style={styles.form}>
  <PlatformTextInput
    style={styles.input}
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
  />
  <PlatformButton style={styles.button} onPress={handleSubmit}>
    <PlatformText>Submit</PlatformText>
  </PlatformButton>
</PlatformView>
```

## React Native Setup

### Required Dependencies

For React Native projects, install these additional dependencies:

```bash
npm install react-native
npm install @react-native-community/netinfo
npm install @react-native-picker/picker
```

### Platform-Specific Configuration

#### iOS (Info.plist)
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

#### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Testing

### Cross-Platform Testing Strategy

1. **Unit Tests**: Test component logic independently of platform
2. **Platform-Specific Tests**: Use platform detection in tests
3. **Integration Tests**: Test full flows on both platforms

Example test:
```typescript
import { render } from '@testing-library/react-native';
import { LoginForm } from '@a-cube-io/cli/hooks/react/auth-components';
import { isReactNative } from '@a-cube-io/cli/hooks/react/platform-components';

describe('LoginForm', () => {
  it('renders correctly on current platform', () => {
    const { getByPlaceholderText } = render(
      <LoginForm onSuccess={jest.fn()} />
    );
    
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
  });
});
```

## Troubleshooting

### Common Issues

1. **"React Native components not available" warning**
   - Ensure React Native dependencies are properly installed
   - Check that the app is running in a React Native environment

2. **Styling differences between platforms**
   - Use the `createStyles` utility for consistent styling
   - Test on both platforms during development

3. **Navigation not working in React Native**
   - Integrate `navigateTo` with your React Native navigation library
   - Example with React Navigation:
   ```typescript
   // In your app setup
   import { setNavigationRef } from './navigation';
   
   <NavigationContainer ref={setNavigationRef}>
     {/* Your app */}
   </NavigationContainer>
   ```

4. **Network status not updating**
   - Ensure proper permissions are set for network access
   - Check that network managers are initializing correctly

## Performance Considerations

1. **Lazy Loading**: Platform-specific code is dynamically imported
2. **Bundle Size**: Only include necessary platform code
3. **Memory Usage**: Network managers clean up on unmount
4. **Render Optimization**: Use React.memo for complex components

## Best Practices

1. **Always use platform components** instead of HTML elements or React Native components directly
2. **Test on both platforms** during development
3. **Handle platform-specific features** gracefully with fallbacks
4. **Use TypeScript** for better cross-platform type safety
5. **Follow platform conventions** for UI/UX patterns

## API Reference

For detailed API documentation of each component and hook, refer to the [API Reference](./API_REFERENCE.md).

## Examples

For complete working examples, check out the [examples directory](../examples/cross-platform/).

---

## Support

For issues or questions related to cross-platform functionality:
- GitHub Issues: [Report bugs or request features](https://github.com/a-cube-io/acube-ereceipt/issues)
- Documentation: [Full SDK documentation](./README.md)