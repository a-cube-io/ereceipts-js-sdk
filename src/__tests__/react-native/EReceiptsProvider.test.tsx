import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { renderReactNative, screenReactNative, waitForReactNative, fireEventReactNative } from './test-utils';
import { useEReceipts } from '../../providers/EReceiptsProvider';
import { render as originalRender } from '@testing-library/react-native';

// Test component that uses the EReceipts context with React Native components
const TestRNComponent = () => {
  const { isInitialized, isLoading, isAuthenticated, currentUser } = useEReceipts();
  
  return (
    <View testID="container" accessibilityLabel="main-container">
      <Text testID="initialized" accessibilityLabel="initialization-status">
        {isInitialized ? 'true' : 'false'}
      </Text>
      <Text testID="loading" accessibilityLabel="loading-status">
        {isLoading ? 'true' : 'false'}
      </Text>
      <Text testID="authenticated" accessibilityLabel="authentication-status">
        {isAuthenticated ? 'true' : 'false'}
      </Text>
      <Text testID="user" accessibilityLabel="user-info">
        {currentUser ? currentUser.email : 'no-user'}
      </Text>
      <TouchableOpacity 
        testID="refresh-button" 
        accessibilityLabel="refresh-authentication"
        onPress={() => console.log('Refresh pressed')}
      >
        <Text>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

describe('EReceiptsProvider - React Native Tests', () => {
  it('should render with default state', async () => {
    renderReactNative(<TestRNComponent />);
    
    await waitForReactNative(() => {
      expect(screenReactNative.getByTestId('initialized')).toHaveTextContent('true');
      expect(screenReactNative.getByTestId('loading')).toHaveTextContent('false');
      expect(screenReactNative.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screenReactNative.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  it('should support testID queries', () => {
    renderReactNative(<TestRNComponent />);
    
    expect(screenReactNative.getByTestId('container')).toBeTruthy();
    expect(screenReactNative.getByTestId('refresh-button')).toBeTruthy();
    expect(screenReactNative.getByTestId('initialized')).toBeTruthy();
  });

  it('should support accessibilityLabel queries', () => {
    renderReactNative(<TestRNComponent />);
    
    expect(screenReactNative.getByLabelText('main-container')).toBeTruthy();
    expect(screenReactNative.getByLabelText('refresh-authentication')).toBeTruthy();
    expect(screenReactNative.getByLabelText('initialization-status')).toBeTruthy();
  });

  it('should handle touch events', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    renderReactNative(<TestRNComponent />);
    
    const refreshButton = screenReactNative.getByTestId('refresh-button');
    fireEventReactNative.press(refreshButton);
    
    expect(consoleSpy).toHaveBeenCalledWith('Refresh pressed');
    consoleSpy.mockRestore();
  });

  it('should throw error when useEReceipts is used outside provider', () => {
    // Suppress console error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      originalRender(<TestRNComponent />);
    }).toThrow('useEReceipts must be used within an EReceiptsProvider');
    
    console.error = originalError;
  });
}); 