# Cross-Platform Migration Guide

This guide helps you migrate existing React web applications using A-Cube SDK to support both web and React Native platforms.

## Quick Start

The good news: **If you're using the latest version of `@a-cube-io/cli`, your auth components are already cross-platform!** The migration has been done at the SDK level, so existing code continues to work without changes.

## What Changed

### 1. Auth Components (No Action Required)

The auth components (`LoginForm`, `UserProfile`, `ProtectedRoute`, etc.) now automatically work on both platforms:

```typescript
// This code now works on both web and React Native!
import { LoginForm } from '@a-cube-io/cli/hooks/react/auth-components';

<LoginForm 
  onSuccess={() => console.log('Logged in!')}
  showRememberMe={true}
/>
```

### 2. ACubeProvider (No Action Required)

The provider now automatically detects and configures platform-specific network managers:

```typescript
// This automatically uses the right network manager for each platform
<ACubeProvider config={sdkConfig}>
  <App />
</ACubeProvider>
```

## Migration Steps for Custom Components

If you have custom components that use HTML elements directly, follow these steps:

### Step 1: Install Platform Components

```typescript
import { 
  PlatformView, 
  PlatformText, 
  PlatformTextInput,
  PlatformButton,
  createStyles 
} from '@a-cube-io/cli/hooks/react/platform-components';
```

### Step 2: Replace HTML Elements

**Before:**
```typescript
<div className="container">
  <h1>Welcome</h1>
  <input 
    type="email" 
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  <button onClick={handleSubmit}>
    Submit
  </button>
</div>
```

**After:**
```typescript
<PlatformView style={styles.container}>
  <PlatformText style={styles.heading}>Welcome</PlatformText>
  <PlatformTextInput
    value={email}
    onChangeText={setEmail}
    keyboardType="email-address"
  />
  <PlatformButton onPress={handleSubmit}>
    <PlatformText>Submit</PlatformText>
  </PlatformButton>
</PlatformView>
```

### Step 3: Convert Styles

**Before:**
```css
/* styles.css */
.container {
  padding: 20px;
  max-width: 400px;
}

.heading {
  font-size: 24px;
  font-weight: bold;
}
```

**After:**
```typescript
const styles = createStyles({
  container: {
    padding: 20,
    ...(isWeb && { maxWidth: 400 })
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold'
  }
});
```

### Step 4: Update Event Handlers

| Web Event | Cross-Platform Event |
|-----------|---------------------|
| `onChange` (input) | `onChangeText` |
| `onClick` | `onPress` |
| `onSubmit` (form) | `onPress` (button) |

### Step 5: Handle Navigation

**Before:**
```typescript
window.location.href = '/dashboard';
```

**After:**
```typescript
import { navigateTo } from '@a-cube-io/cli/hooks/react/platform-components';

navigateTo('/dashboard');
```

**Note:** For React Native, integrate with your navigation library:
```typescript
// In your app setup
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { navigateTo } from '@a-cube-io/cli/hooks/react/platform-components';

// Override navigateTo for React Native
if (isReactNative) {
  const navigation = useNavigation();
  window.navigateTo = (path) => navigation.navigate(path);
}
```

## Testing Your Migration

### 1. Web Testing

```bash
# Run your existing web app
npm start

# Everything should work as before
```

### 2. React Native Testing

```bash
# Install React Native dependencies
npm install react-native @react-native-community/netinfo @react-native-picker/picker

# Run on iOS
npx react-native run-ios

# Run on Android
npx react-native run-android
```

### 3. Cross-Platform Testing Checklist

- [ ] Authentication flow works on both platforms
- [ ] Network status updates correctly
- [ ] Forms submit properly
- [ ] Navigation works as expected
- [ ] Styles render correctly
- [ ] Touch/click interactions work
- [ ] Keyboard handling is correct

## Common Issues and Solutions

### Issue: "React Native components not available"

**Solution:** Make sure React Native dependencies are installed:
```bash
npm install react-native
```

### Issue: Styles look different between platforms

**Solution:** Use platform-specific styles:
```typescript
const styles = createStyles({
  button: {
    padding: 16,
    // Platform-specific adjustments
    ...(isWeb && {
      cursor: 'pointer',
    }),
    ...(isReactNative && {
      elevation: 3, // Android shadow
    })
  }
});
```

### Issue: Form submission not working

**Solution:** Remove form elements and use button handlers:
```typescript
// Before
<form onSubmit={handleSubmit}>
  <button type="submit">Submit</button>
</form>

// After
<PlatformView>
  <PlatformButton onPress={handleSubmit}>
    <PlatformText>Submit</PlatformText>
  </PlatformButton>
</PlatformView>
```

## Best Practices

1. **Use Platform Components**: Always use `Platform*` components instead of HTML elements
2. **Test Both Platforms**: Regularly test on both web and React Native
3. **Conditional Platform Code**: Use `isWeb` and `isReactNative` for platform-specific logic
4. **Shared Styles**: Use `createStyles` for consistent styling
5. **Type Safety**: Leverage TypeScript for cross-platform type checking

## Performance Optimization

### Code Splitting

Platform-specific code is automatically loaded only when needed:

```typescript
// This is handled automatically by the SDK
if (isReactNative) {
  const { ConnectivityManager } = await import('@/react-native/connectivity-manager');
} else {
  const { NetworkManager } = await import('@/sync/network-manager-simple');
}
```

### Bundle Size

Only include platform-specific dependencies in each build:

**Web build:**
```json
{
  "browser": {
    "react-native": false
  }
}
```

**React Native build:**
Metro bundler automatically excludes web-only code.

## Need Help?

- Check the [Cross-Platform Guide](./CROSS_PLATFORM_GUIDE.md) for detailed documentation
- Review the [API Reference](./PLATFORM_COMPONENTS_API.md) for component details
- Open an issue on [GitHub](https://github.com/a-cube-io/acube-ereceipt/issues) for support

## Summary

The migration to cross-platform support is designed to be seamless:

1. **Existing code continues to work** - Auth components are already cross-platform
2. **Gradual migration** - Update custom components as needed
3. **Full type safety** - TypeScript ensures compatibility
4. **Performance maintained** - Platform-specific optimizations preserved

Your web app can now run on React Native with minimal changes!