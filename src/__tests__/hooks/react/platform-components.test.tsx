/**
 * Platform Components Tests
 * Tests for cross-platform component abstractions
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  isReactNative,
  isWeb,
  PlatformView,
  PlatformText,
  PlatformTextInput,
  PlatformButton,
  createStyles,
  showAlert,
  platformInfo,
} from '../../../hooks/react/platform-components';

// Mock React Native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: 'ios',
    Version: '14.0',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Platform Components', () => {
  describe('Platform Detection', () => {
    it('should detect web environment correctly', () => {
      // In test environment, we're running in Node/web context
      expect(isWeb).toBe(true);
      expect(isReactNative).toBe(false);
    });

    it('should provide correct platform info', () => {
      expect(platformInfo).toMatchObject({
        isReactNative: false,
        isWeb: true,
        OS: 'web',
      });
    });
  });

  describe('PlatformView', () => {
    it('should render as div on web', () => {
      const { container } = render(
        <PlatformView testID="test-view">
          <span>Content</span>
        </PlatformView>
      );
      
      const element = container.firstChild;
      expect(element?.nodeName).toBe('DIV');
      expect(element).toHaveAttribute('data-testid', 'test-view');
    });

    it('should render as button when onPress is provided', () => {
      const handlePress = jest.fn();
      const { container } = render(
        <PlatformView onPress={handlePress}>
          <span>Click me</span>
        </PlatformView>
      );
      
      const element = container.firstChild;
      expect(element?.nodeName).toBe('BUTTON');
    });

    it('should handle className and style props', () => {
      const { container } = render(
        <PlatformView 
          className="custom-class" 
          style={{ padding: 20 }}
        >
          Content
        </PlatformView>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.className).toBe('custom-class');
      expect(element.style.padding).toBe('20px');
    });
  });

  describe('PlatformText', () => {
    it('should render as span on web', () => {
      const { container } = render(
        <PlatformText>Hello World</PlatformText>
      );
      
      expect(container.firstChild?.nodeName).toBe('SPAN');
      expect(container.textContent).toBe('Hello World');
    });

    it('should apply numberOfLines styling on web', () => {
      const { container } = render(
        <PlatformText numberOfLines={2}>
          Long text that should be truncated
        </PlatformText>
      );
      
      const element = container.firstChild as HTMLElement;
      expect(element.style.display).toBe('-webkit-box');
      expect(element.style.webkitLineClamp).toBe('2');
    });
  });

  describe('PlatformTextInput', () => {
    it('should render as input on web', () => {
      const { container } = render(
        <PlatformTextInput 
          value="test" 
          placeholder="Enter text"
        />
      );
      
      const input = container.firstChild as HTMLInputElement;
      expect(input.nodeName).toBe('INPUT');
      expect(input.value).toBe('test');
      expect(input.placeholder).toBe('Enter text');
    });

    it('should render as textarea when multiline', () => {
      const { container } = render(
        <PlatformTextInput 
          multiline 
          numberOfLines={4}
          value="Multi\nLine\nText"
        />
      );
      
      const textarea = container.firstChild as HTMLTextAreaElement;
      expect(textarea.nodeName).toBe('TEXTAREA');
      expect(textarea.rows).toBe(4);
    });

    it('should handle password input', () => {
      const { container } = render(
        <PlatformTextInput secureTextEntry />
      );
      
      const input = container.firstChild as HTMLInputElement;
      expect(input.type).toBe('password');
    });

    it('should map keyboardType to input type', () => {
      const { container } = render(
        <PlatformTextInput keyboardType="email-address" />
      );
      
      const input = container.firstChild as HTMLInputElement;
      expect(input.type).toBe('email');
    });
  });

  describe('PlatformButton', () => {
    it('should render as button on web', () => {
      const handlePress = jest.fn();
      const { container, getByText } = render(
        <PlatformButton onPress={handlePress}>
          Click Me
        </PlatformButton>
      );
      
      const button = container.firstChild as HTMLButtonElement;
      expect(button.nodeName).toBe('BUTTON');
      expect(button.type).toBe('button');
      
      button.click();
      expect(handlePress).toHaveBeenCalled();
    });

    it('should handle disabled state', () => {
      const { container } = render(
        <PlatformButton disabled>
          Disabled Button
        </PlatformButton>
      );
      
      const button = container.firstChild as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should support different button types', () => {
      const { container } = render(
        <PlatformButton type="submit">
          Submit
        </PlatformButton>
      );
      
      const button = container.firstChild as HTMLButtonElement;
      expect(button.type).toBe('submit');
    });
  });

  describe('createStyles', () => {
    it('should return styles object on web', () => {
      const styles = createStyles({
        container: {
          padding: 20,
          backgroundColor: '#fff',
        },
        text: {
          fontSize: 16,
          color: '#333',
        },
      });
      
      expect(styles).toEqual({
        container: {
          padding: 20,
          backgroundColor: '#fff',
        },
        text: {
          fontSize: 16,
          color: '#333',
        },
      });
    });
  });

  describe('showAlert', () => {
    it('should use window.confirm on web', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const handleOk = jest.fn();
      
      showAlert('Test Alert', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: handleOk },
      ]);
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
      expect(handleOk).toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });

    it('should handle cancel button when confirm returns false', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const handleCancel = jest.fn();
      const handleOk = jest.fn();
      
      showAlert('Test Alert', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel', onPress: handleCancel },
        { text: 'OK', onPress: handleOk },
      ]);
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
      expect(handleCancel).toHaveBeenCalled();
      expect(handleOk).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });
});