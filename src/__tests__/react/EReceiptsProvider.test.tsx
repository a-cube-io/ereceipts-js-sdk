import React from 'react';
import { 
  renderReact, 
  screenReact, 
  waitForReact,
} from './test-utils';
import {  useEReceipts } from '../../providers/EReceiptsProvider';
import { render as originalRender } from '@testing-library/react';

// Test component that uses the EReceipts context
const TestComponent = () => {
  const { isInitialized, isLoading, isAuthenticated, currentUser } = useEReceipts();
  
  return (
    <div>
      <div data-testid="initialized">{isInitialized ? 'true' : 'false'}</div>
      <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{currentUser ? currentUser.email : 'no-user'}</div>
    </div>
  );
};

describe('EReceiptsProvider - React Tests', () => {
  it('should render with default state', async () => {
    renderReact(<TestComponent />);
    
    await waitForReact(() => {
      expect(screenReact.getByTestId('initialized')).toHaveTextContent('true');
      expect(screenReact.getByTestId('loading')).toHaveTextContent('false');
      expect(screenReact.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screenReact.getByTestId('user')).toHaveTextContent('no-user');
    });
  });

  it('should handle initialization callbacks', async () => {
    const testConfig = {
      environment: 'sandbox' as const,
      enableLogging: false,
      skipTokenValidation: true,
      onInitialized: jest.fn(),
      onError: jest.fn(),
      onLoadingChange: jest.fn(),
      onAuthChange: jest.fn(),
    };

    renderReact(<TestComponent />, { ereceiptsConfig: testConfig });
    
    await waitForReact(() => {
      expect(testConfig.onInitialized).toHaveBeenCalled();
      expect(testConfig.onLoadingChange).toHaveBeenCalled();
    });
  });

  it('should throw error when useEReceipts is used outside provider', () => {
    // Suppress console error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => {
      originalRender(<TestComponent />);
    }).toThrow('useEReceipts must be used within an EReceiptsProvider');
    
    console.error = originalError;
  });

  it('should support custom queries for data-testid', () => {
    renderReact(<TestComponent />);
    
    expect(screenReact.getByTestId('initialized')).toBeInTheDocument();
    expect(screenReact.getByTestId('loading')).toBeInTheDocument();
    expect(screenReact.getByTestId('authenticated')).toBeInTheDocument();
    expect(screenReact.getByTestId('user')).toBeInTheDocument();
  });
}); 