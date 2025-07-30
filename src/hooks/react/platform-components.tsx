/**
 * Cross-Platform Component Abstractions
 * Platform-agnostic components that work seamlessly in React web and React Native
 *
 * @module platform-components
 * @description
 * This module provides a unified API for building user interfaces that work
 * across both React web and React Native environments. Components automatically
 * detect the platform and render appropriate native elements.
 *
 * @example
 * ```typescript
 * import { PlatformView, PlatformText, createStyles } from './platform-components';
 *
 * const styles = createStyles({
 *   container: { padding: 20 }
 * });
 *
 * function MyComponent() {
 *   return (
 *     <PlatformView style={styles.container}>
 *       <PlatformText>Hello Cross-Platform World!</PlatformText>
 *     </PlatformView>
 *   );
 * }
 * ```
 *
 * @see {@link file://./docs/CROSS_PLATFORM_GUIDE.md} for usage guide
 * @see {@link file://./docs/PLATFORM_COMPONENTS_API.md} for API reference
 */

import React from 'react';

// Platform detection utility
export const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
export const isWeb = !isReactNative;

// Platform-specific imports with fallbacks
let View: any; let Text: any; let TextInput: any; let TouchableOpacity: any; let ScrollView: any; let StyleSheet: any; let Platform: any; let Alert: any;

if (isReactNative) {
  try {
    const RN = require('react-native');
    View = RN.View;
    Text = RN.Text;
    TextInput = RN.TextInput;
    TouchableOpacity = RN.TouchableOpacity;
    ScrollView = RN.ScrollView;
    StyleSheet = RN.StyleSheet;
    Platform = RN.Platform;
    Alert = RN.Alert;
  } catch (error) {
    console.warn('React Native components not available, falling back to web components');
  }
}

// Platform-agnostic component interfaces
export interface PlatformViewProps {
  children?: React.ReactNode;
  className?: string;
  style?: any;
  testID?: string;
  role?: string;
  onPress?: () => void;
}

export interface PlatformTextProps {
  children?: React.ReactNode;
  className?: string;
  style?: any;
  testID?: string;
  numberOfLines?: number;
  selectable?: boolean;
}

export interface PlatformTextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onChange?: (e: any) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  className?: string;
  style?: any;
  testID?: string;
  id?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface PlatformButtonProps {
  onPress?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  title?: string;
  className?: string;
  style?: any;
  testID?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface PlatformPickerProps {
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: any) => void;
  children?: React.ReactNode;
  enabled?: boolean;
  className?: string;
  style?: any;
  testID?: string;
  id?: string;
}

// Cross-platform View component
export const PlatformView: React.FC<PlatformViewProps> = ({
  children,
  className,
  style,
  testID,
  role,
  onPress,
  ...props
}) => {
  if (isReactNative && View) {
    const TouchableComponent = onPress ? TouchableOpacity : View;
    return (
      <TouchableComponent
        style={style}
        testID={testID}
        onPress={onPress}
        accessible={!!role}
        accessibilityRole={role as any}
        {...props}
      >
        {children}
      </TouchableComponent>
    );
  }

  // Web fallback
  const Component = onPress ? 'button' : 'div';
  return React.createElement(Component, {
    className,
    style,
    'data-testid': testID,
    role,
    onClick: onPress,
    ...props,
  }, children);
};

// Cross-platform Text component
export const PlatformText: React.FC<PlatformTextProps> = ({
  children,
  className,
  style,
  testID,
  numberOfLines,
  selectable = true,
  ...props
}) => {
  if (isReactNative && Text) {
    return (
      <Text
        style={style}
        testID={testID}
        numberOfLines={numberOfLines}
        selectable={selectable}
        {...props}
      >
        {children}
      </Text>
    );
  }

  // Web fallback
  const webStyle = {
    ...style,
    ...(numberOfLines && {
      display: '-webkit-box',
      WebkitLineClamp: numberOfLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }),
    ...(selectable === false && { userSelect: 'none' }),
  };

  return React.createElement('span', {
    className,
    style: webStyle,
    'data-testid': testID,
    ...props,
  }, children);
};

// Cross-platform TextInput component
export const PlatformTextInput: React.FC<PlatformTextInputProps> = ({
  value,
  onChangeText,
  onChange,
  placeholder,
  secureTextEntry,
  autoComplete,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  editable = true,
  multiline = false,
  numberOfLines,
  className,
  style,
  testID,
  id,
  type,
  required,
  disabled,
  ...props
}) => {
  if (isReactNative && TextInput) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        autoComplete={autoComplete as any}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        editable={editable && !disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={style}
        testID={testID}
        {...props}
      />
    );
  }

  // Web fallback
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChangeText?.(text);
    onChange?.(e);
  };

  const webProps = {
    id,
    value,
    onChange: handleChange,
    placeholder,
    autoComplete,
    required,
    disabled,
    className,
    style,
    'data-testid': testID,
    ...props,
  };

  if (multiline) {
    return React.createElement('textarea', {
      ...webProps,
      rows: numberOfLines,
    });
  }

  return React.createElement('input', {
    ...webProps,
    type: secureTextEntry ? 'password' : (type || (keyboardType === 'email-address' ? 'email' : 'text')),
  });
};

// Cross-platform Button component
export const PlatformButton: React.FC<PlatformButtonProps> = ({
  onPress,
  onClick,
  disabled,
  children,
  title,
  className,
  style,
  testID,
  type = 'button',
  ...props
}) => {
  const handlePress = onPress || onClick;

  if (isReactNative && TouchableOpacity) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        style={[style, disabled && { opacity: 0.5 }]}
        testID={testID}
        {...props}
      >
        {children || (title && <Text>{title}</Text>)}
      </TouchableOpacity>
    );
  }

  // Web fallback
  return React.createElement('button', {
    type,
    onClick: handlePress,
    disabled,
    className,
    style,
    'data-testid': testID,
    ...props,
  }, children || title);
};

// Cross-platform Picker component
export const PlatformPicker: React.FC<PlatformPickerProps> = ({
  selectedValue,
  onValueChange,
  onChange,
  children,
  enabled = true,
  className,
  style,
  testID,
  id,
  ...props
}) => {
  if (isReactNative) {
    // Try to use React Native Picker
    try {
      // @ts-ignore - Dynamic import
      const { Picker } = require('@react-native-picker/picker');
      return (
        <Picker
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          enabled={enabled}
          style={style}
          testID={testID}
          {...props}
        >
          {children}
        </Picker>
      );
    } catch (error) {
      console.warn('React Native Picker not available, using fallback');
      // Fallback to a simple text display
      return (
        <PlatformView style={style} {...(testID && { testID })}>
          <PlatformText>{selectedValue || 'Select an option'}</PlatformText>
        </PlatformView>
      );
    }
  }

  // Web fallback
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const {value} = e.target;
    onValueChange?.(value);
    onChange?.(e);
  };

  return React.createElement('select', {
    id,
    value: selectedValue,
    onChange: handleChange,
    disabled: !enabled,
    className,
    style,
    'data-testid': testID,
    ...props,
  }, children);
};

// Cross-platform ScrollView component
export const PlatformScrollView: React.FC<{
  children?: React.ReactNode;
  className?: string;
  style?: any;
  testID?: string;
  horizontal?: boolean;
  showsVerticalScrollIndicator?: boolean;
  showsHorizontalScrollIndicator?: boolean;
}> = ({
  children,
  className,
  style,
  testID,
  horizontal,
  showsVerticalScrollIndicator = true,
  showsHorizontalScrollIndicator = true,
  ...props
}) => {
  if (isReactNative && ScrollView) {
    return (
      <ScrollView
        style={style}
        testID={testID}
        horizontal={horizontal}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  // Web fallback
  const webStyle = {
    ...style,
    overflow: 'auto',
    ...(horizontal && {
      overflowX: 'auto',
      overflowY: 'hidden',
      whiteSpace: 'nowrap',
    }),
    ...(!showsVerticalScrollIndicator && {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }),
  };

  return React.createElement('div', {
    className,
    style: webStyle,
    'data-testid': testID,
    ...props,
  }, children);
};

// Platform-specific alert function
export const showAlert = (title: string, message?: string, buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>) => {
  if (isReactNative && Alert) {
    Alert.alert(
      title,
      message,
      buttons?.map(button => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style,
      })),
    );
  } else {
    // Web fallback
    const result = window.confirm(message || title);
    if (result && buttons && buttons.length > 0) {
      const defaultButton = buttons.find(b => !b.style || b.style === 'default');
      defaultButton?.onPress?.();
    } else if (!result && buttons && buttons.length > 1) {
      const cancelButton = buttons.find(b => b.style === 'cancel');
      cancelButton?.onPress?.();
    }
  }
};

// Navigation helper
export const navigateTo = (url: string) => {
  if (isWeb && typeof window !== 'undefined') {
    window.location.href = url;
  } else {
    // For React Native, this would typically use React Navigation
    // This is a placeholder that should be implemented based on the navigation library used
    console.warn('Navigation not implemented for React Native. Please integrate with your navigation library.');
  }
};

// Style utilities
export const createStyles = (styles: any) => {
  if (isReactNative && StyleSheet) {
    return StyleSheet.create(styles);
  }
  return styles; // Web uses regular objects
};

// Export platform information
export const platformInfo = {
  isReactNative,
  isWeb,
  OS: isReactNative && Platform ? Platform.OS : 'web',
  version: isReactNative && Platform ? Platform.Version : undefined,
};
