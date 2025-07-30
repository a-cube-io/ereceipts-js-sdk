# Platform Components API Reference

## Overview

Platform components provide a unified API for building user interfaces that work seamlessly across React web and React Native environments.

## Core Components

### PlatformView

A container component that renders as a `div` on web and `View` on React Native.

```typescript
interface PlatformViewProps {
  children?: React.ReactNode;
  className?: string;        // Web only
  style?: any;              // Cross-platform styles
  testID?: string;          // For testing
  role?: string;            // Accessibility role
  onPress?: () => void;     // Makes it clickable
}
```

**Usage:**
```typescript
<PlatformView style={styles.container} onPress={handlePress}>
  <PlatformText>Click me</PlatformText>
</PlatformView>
```

**Platform Behavior:**
- Web: Renders as `<div>` or `<button>` (when `onPress` is provided)
- React Native: Renders as `View` or `TouchableOpacity` (when `onPress` is provided)

---

### PlatformText

A text display component that renders as `span` on web and `Text` on React Native.

```typescript
interface PlatformTextProps {
  children?: React.ReactNode;
  className?: string;        // Web only
  style?: any;              // Cross-platform styles
  testID?: string;          // For testing
  numberOfLines?: number;    // Truncate text
  selectable?: boolean;      // Allow text selection (default: true)
}
```

**Usage:**
```typescript
<PlatformText style={styles.heading} numberOfLines={2}>
  Welcome to A-Cube SDK
</PlatformText>
```

**Platform Behavior:**
- Web: CSS ellipsis for `numberOfLines`, `user-select` for `selectable`
- React Native: Native text truncation and selection handling

---

### PlatformTextInput

An input component for text entry.

```typescript
interface PlatformTextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onChange?: (e: any) => void;           // Web compatibility
  placeholder?: string;
  secureTextEntry?: boolean;             // Password input
  autoComplete?: string;                 // Autocomplete hints
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;                // For multiline
  className?: string;                    // Web only
  style?: any;
  testID?: string;
  id?: string;                          // Web only
  type?: string;                        // Web only
  required?: boolean;                   // Web only
  disabled?: boolean;
}
```

**Usage:**
```typescript
<PlatformTextInput
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
/>
```

**Platform Behavior:**
- Web: Maps to appropriate HTML input types
- React Native: Uses native keyboard types and autocorrect settings

---

### PlatformButton

A pressable button component.

```typescript
interface PlatformButtonProps {
  onPress?: () => void;
  onClick?: () => void;      // Web compatibility
  disabled?: boolean;
  children?: React.ReactNode;
  title?: string;            // Alternative to children
  className?: string;        // Web only
  style?: any;
  testID?: string;
  type?: 'button' | 'submit' | 'reset';  // Web only
}
```

**Usage:**
```typescript
<PlatformButton 
  onPress={handleSubmit} 
  disabled={isLoading}
  style={styles.button}
>
  <PlatformText style={styles.buttonText}>Submit</PlatformText>
</PlatformButton>
```

**Platform Behavior:**
- Web: Native `<button>` with proper type attribute
- React Native: `TouchableOpacity` with opacity feedback

---

### PlatformPicker

A dropdown/picker component for selecting from options.

```typescript
interface PlatformPickerProps {
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: any) => void;    // Web compatibility
  children?: React.ReactNode;      // <option> elements
  enabled?: boolean;
  className?: string;              // Web only
  style?: any;
  testID?: string;
  id?: string;                     // Web only
}
```

**Usage:**
```typescript
<PlatformPicker
  selectedValue={role}
  onValueChange={setRole}
  enabled={!isLoading}
>
  <option value="">Select a role</option>
  <option value="admin">Admin</option>
  <option value="user">User</option>
</PlatformPicker>
```

**Platform Behavior:**
- Web: Native `<select>` element
- React Native: Requires `@react-native-picker/picker` package

---

### PlatformScrollView

A scrollable container component.

```typescript
interface PlatformScrollViewProps {
  children?: React.ReactNode;
  className?: string;                    // Web only
  style?: any;
  testID?: string;
  horizontal?: boolean;                  // Horizontal scrolling
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}
```

**Usage:**
```typescript
<PlatformScrollView style={styles.scrollContainer}>
  {items.map(item => (
    <ItemComponent key={item.id} {...item} />
  ))}
</PlatformScrollView>
```

**Platform Behavior:**
- Web: CSS overflow with optional scrollbar hiding
- React Native: Native ScrollView with momentum scrolling

---

## Utility Functions

### showAlert

Display a platform-appropriate alert dialog.

```typescript
function showAlert(
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>
): void
```

**Usage:**
```typescript
showAlert(
  'Delete Item',
  'Are you sure you want to delete this item?',
  [
    {
      text: 'Cancel',
      style: 'cancel'
    },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => deleteItem()
    }
  ]
);
```

**Platform Behavior:**
- Web: Uses `window.confirm()` with OK/Cancel buttons
- React Native: Uses native `Alert.alert()` with full button support

---

### navigateTo

Navigate to a different screen or URL.

```typescript
function navigateTo(url: string): void
```

**Usage:**
```typescript
navigateTo('/dashboard');
```

**Platform Behavior:**
- Web: Sets `window.location.href`
- React Native: Requires integration with navigation library (React Navigation, etc.)

⚠️ **Note**: For React Native, you must implement navigation integration in your app.

---

### createStyles

Create platform-optimized styles.

```typescript
function createStyles<T extends Record<string, any>>(styles: T): T
```

**Usage:**
```typescript
const styles = createStyles({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  }
});
```

**Platform Behavior:**
- Web: Returns styles object as-is
- React Native: Processes through `StyleSheet.create()` for optimization

---

## Platform Detection

### Constants

```typescript
export const isReactNative: boolean;  // true if running in React Native
export const isWeb: boolean;          // true if running in web browser
```

### platformInfo

Get detailed platform information.

```typescript
export const platformInfo: {
  isReactNative: boolean;
  isWeb: boolean;
  OS: 'web' | 'ios' | 'android';     // Platform OS
  version?: string | number;          // OS version (React Native only)
}
```

**Usage:**
```typescript
import { platformInfo } from '@a-cube-io/ereceipts-js-sdk/hooks/react/platform-components';

if (platformInfo.OS === 'ios') {
  // iOS-specific code
}
```

---

## Style Patterns

### Conditional Styles

Apply platform-specific styles:

```typescript
const styles = createStyles({
  container: {
    padding: 20,
    // Web-specific
    ...(isWeb && {
      maxWidth: 600,
      margin: '0 auto',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }),
    // React Native specific
    ...(isReactNative && {
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }),
  },
});
```

### Responsive Styles

Handle different screen sizes:

```typescript
const styles = createStyles({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    ...(isWeb && {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: 20,
    }),
  },
});
```

---

## TypeScript Support

All components are fully typed with TypeScript. Import types as needed:

```typescript
import type { 
  PlatformViewProps,
  PlatformTextProps,
  PlatformTextInputProps,
  PlatformButtonProps,
  PlatformPickerProps,
  PlatformScrollViewProps 
} from '@a-cube-io/ereceipts-js-sdk/hooks/react/platform-components';
```

---

## Performance Tips

1. **Use createStyles**: Always use `createStyles` for better performance on React Native
2. **Avoid inline styles**: Define styles outside of render methods
3. **Memoize components**: Use `React.memo` for complex components
4. **Lazy load platform code**: Platform-specific imports are handled automatically

---

## Accessibility

All platform components support accessibility features:

- **testID**: For automated testing
- **role**: ARIA roles on web, accessibility roles on React Native
- **Keyboard navigation**: Automatically handled by platform
- **Screen readers**: Native support on both platforms

Example:
```typescript
<PlatformView role="button" testID="submit-button" onPress={handleSubmit}>
  <PlatformText>Submit Form</PlatformText>
</PlatformView>
```

---

## Migration Checklist

When migrating from platform-specific code:

- [ ] Replace HTML elements with Platform components
- [ ] Convert `className` to `style` props
- [ ] Update event handlers (`onChange` → `onChangeText` for inputs)
- [ ] Remove platform-specific imports
- [ ] Test on both platforms
- [ ] Verify accessibility features
- [ ] Check performance metrics