import React from 'react';
import { 
  ActivityIndicator, 
  StyleSheet, 
  Text, 
  TextStyle, 
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;

  const buttonStyle: ViewStyle = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as unknown as ViewStyle;

  const textColor: TextStyle = [
    styles.baseText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    isDisabled && styles.disabledText,
    textStyle,
  ].filter(Boolean) as unknown as TextStyle;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={title}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'outline' ? '#007AFF' : '#FFFFFF'}
            style={styles.loader}
          />
        )}
        <Text style={textColor}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loader: {
    marginRight: 8,
  },

  // Variants
  primary: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  
  secondary: {
    backgroundColor: '#6C757D',
    borderColor: '#6C757D',
  },
  
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  
  danger: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
  },

  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  
  large: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 52,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  
  fullWidth: {
    width: '100%',
  },

  // Text styles
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  primaryText: {
    color: '#FFFFFF',
  },
  
  secondaryText: {
    color: '#FFFFFF',
  },
  
  outlineText: {
    color: '#007AFF',
  },
  
  dangerText: {
    color: '#FFFFFF',
  },
  
  smallText: {
    fontSize: 14,
  },
  
  mediumText: {
    fontSize: 16,
  },
  
  largeText: {
    fontSize: 18,
  },
  
  disabledText: {
    opacity: 0.7,
  },
});

export default Button;