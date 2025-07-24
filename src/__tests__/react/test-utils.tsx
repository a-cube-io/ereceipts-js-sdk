import React, { ReactElement } from 'react';
import { render, RenderOptions, queries, within, waitFor, fireEvent, screen } from '@testing-library/react';
import { EReceiptsProvider, EReceiptsProviderConfig } from '../../providers/EReceiptsProvider';

// Custom queries for data-testid attributes
import { queryHelpers, buildQueries } from '@testing-library/react';

const queryAllByTestId = (container: HTMLElement, id: string) =>
  queryHelpers.queryAllByAttribute('data-testid', container, id);

const getMultipleError = (container: Element | null, testIdValue: string) =>
  `Found multiple elements with the data-testid attribute of: ${testIdValue}`;

const getMissingError = (container: Element | null, testIdValue: string) =>
  `Unable to find an element with the data-testid attribute of: ${testIdValue}`;

const [
  queryByTestId,
  getAllByTestId,
  getByTestId,
  findAllByTestId,
  findByTestId,
] = buildQueries(queryAllByTestId, getMultipleError, getMissingError);

// Custom queries for data-cy attributes (Cypress style)
const queryAllByDataCy = (container: HTMLElement, id: string) =>
  queryHelpers.queryAllByAttribute('data-cy', container, id);

const getMultipleDataCyError = (container: Element | null, dataCyValue: string) =>
  `Found multiple elements with the data-cy attribute of: ${dataCyValue}`;

const getMissingDataCyError = (container: Element | null, dataCyValue: string) =>
  `Unable to find an element with the data-cy attribute of: ${dataCyValue}`;

const [
  queryByDataCy,
  getAllByDataCy,
  getByDataCy,
  findAllByDataCy,
  findByDataCy,
] = buildQueries(queryAllByDataCy, getMultipleDataCyError, getMissingDataCyError);

// Combine all queries
const allQueries = {
  ...queries,
  queryByTestId,
  getAllByTestId,
  getByTestId,
  findAllByTestId,
  findByTestId,
  queryByDataCy,
  getAllByDataCy,
  getByDataCy,
  findAllByDataCy,
  findByDataCy,
};

// Default E-Receipts provider config for testing
const defaultTestConfig: EReceiptsProviderConfig = {
  environment: 'sandbox',
  enableLogging: false,
  skipTokenValidation: true,
  onInitialized: jest.fn(),
  onError: jest.fn(),
  onLoadingChange: jest.fn(),
  onAuthChange: jest.fn(),
};

// All providers wrapper component
const AllTheProviders = ({ 
  children, 
  ereceiptsConfig = defaultTestConfig 
}: { 
  children: React.ReactNode;
  ereceiptsConfig?: EReceiptsProviderConfig;
}) => {
  return (
    <EReceiptsProvider config={ereceiptsConfig}>
      {children}
    </EReceiptsProvider>
  );
};

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper' | 'queries'> & {
    ereceiptsConfig?: EReceiptsProviderConfig;
  }
) => {
  const { ereceiptsConfig, ...renderOptions } = options || {};
  
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders ereceiptsConfig={ereceiptsConfig}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Note: Custom screen and within functions removed due to type compatibility issues
// Use standard screen and within from @testing-library/react instead

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Export custom queries
export {
  customRender as renderReact,
  screen as screenReact,
  AllTheProviders as AllTheProvidersReact,
  defaultTestConfig as defaultReactTestConfig,
  fireEvent as fireEventReact,
  waitFor as waitForReact,
  within as withinReact,
  // Custom queries for React
  queryByTestId as queryByTestIdReact,
  getAllByTestId as getAllByTestIdReact,
  getByTestId as getByTestIdReact,
  findAllByTestId as findAllByTestIdReact,
  findByTestId as findByTestIdReact,
  queryByDataCy as queryByDataCyReact,
  getAllByDataCy as getAllByDataCyReact,
  getByDataCy as getByDataCyReact,
  findAllByDataCy as findAllByDataCyReact,
  findByDataCy as findByDataCyReact
}; 