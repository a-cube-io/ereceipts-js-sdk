import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputStyle?: TextStyle;
  errorStyle?: TextStyle;
  helperStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const FormInput = forwardRef<TextInput, FormInputProps>(({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  labelStyle,
  inputStyle,
  errorStyle,
  helperStyle,
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  secureTextEntry,
  ...textInputProps
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const isPassword = secureTextEntry ?? showPasswordToggle;
  const actualSecureTextEntry = isPassword ? !isPasswordVisible : false;

  const handleTogglePassword = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const inputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
  ].filter(Boolean);

  const textInputStyle = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    (rightIcon ?? showPasswordToggle) && styles.inputWithRightIcon,
    inputStyle,
  ].filter(Boolean);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, labelStyle]}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={inputContainerStyle as ViewStyle}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={textInputStyle as TextStyle}
          secureTextEntry={actualSecureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#999999"
          {...textInputProps}
        />
        
        {(rightIcon ?? showPasswordToggle) && (
          <View style={styles.rightIconContainer}>
            {showPasswordToggle ? (
              <TouchableOpacity
                onPress={handleTogglePassword}
                style={styles.passwordToggle}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <Text style={styles.passwordToggleText}>
                  {isPasswordVisible ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            ) : (
              rightIcon
            )}
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
      
      {helperText && !error && (
        <Text style={[styles.helperText, helperStyle]}>
          {helperText}
        </Text>
      )}
    </View>
  );
});

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  labelContainer: {
    marginBottom: 6,
  },
  
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  
  required: {
    color: '#DC3545',
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  
  inputContainerFocused: {
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  
  inputContainerError: {
    borderColor: '#DC3545',
  },
  
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  
  inputWithRightIcon: {
    paddingRight: 8,
  },
  
  leftIconContainer: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  rightIconContainer: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  passwordToggle: {
    padding: 4,
  },
  
  passwordToggleText: {
    fontSize: 16,
  },
  
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginTop: 4,
  },
  
  helperText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
});

export default FormInput;