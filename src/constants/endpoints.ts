export const API_ENDPOINTS = {
  SANDBOX: 'https://ereceipts-it-sandbox.acubeapi.com',
  PRODUCTION: 'https://ereceipts-it.acubeapi.com',
  DEVELOPMENT: 'https://ereceipts-it.dev.acubeapi.com',
} as const;

export const API_AUTH_ENDPOINTS = {
  SANDBOX: 'https://common-sandbox.api.acubeapi.com',
  PRODUCTION: 'https://common.api.acubeapi.com',
  DEVELOPMENT: 'https://common-sandbox.api.acubeapi.com',
} as const;

export const MF1_PATHS = {
  // Authentication
  LOGIN: '/mf1/login',
  
  // Cashiers
  CASHIERS: '/mf1/cashiers/',
  CASHIER_ME: '/mf1/cashiers/me',
  CASHIER_BY_ID: (id: number) => `/mf1/cashiers/${id}`,
  
  // Point of Sales
  POINT_OF_SALES: '/mf1/point-of-sales/',
  POINT_OF_SALE_BY_SERIAL: (serialNumber: string) => `/mf1/point-of-sales/${serialNumber}`,
  POINT_OF_SALE_ACTIVATION: (serialNumber: string) => `/mf1/point-of-sales/${serialNumber}/activation`,
  POINT_OF_SALE_INACTIVITY: (serialNumber: string) => `/mf1/point-of-sales/${serialNumber}/inactivity`,
  POINT_OF_SALE_OFFLINE: (serialNumber: string) => `/mf1/point-of-sales/${serialNumber}/status/offline`,
  CLOSE_JOURNAL: '/mf1/point-of-sales/close',
  
  // Receipts
  RECEIPTS: '/mf1/receipts/',
  RECEIPT_BY_UUID: (uuid: string) => `/mf1/receipts/${uuid}`,
  RECEIPT_DETAILS: (uuid: string) => `/mf1/receipts/${uuid}/details`,
  RECEIPT_VOID_WITH_PROOF: '/mf1/receipts/void-with-proof',
  RECEIPT_RETURN: '/mf1/receipts/return',
  RECEIPT_RETURN_WITH_PROOF: '/mf1/receipts/return-with-proof',
  
  // Cash Register
  CASH_REGISTER: '/mf1/cash-register/',
  CASH_REGISTER_BY_ID: (id: string) => `/mf1/cash-register/${id}`,
  CASH_REGISTER_MTLS_CERT: (id: string) => `/mf1/cash-register/${id}/mtls-certificate`,
} as const;

export const MF2_PATHS = {
  // Merchants
  MERCHANTS: '/mf2/merchants',
  MERCHANT_BY_UUID: (uuid: string) => `/mf2/merchants/${uuid}`,

  // Point of Sales (PEMs)
  POINT_OF_SALES: '/mf2/point-of-sales',
  PEM_CERTIFICATES: (id: string) => `/mf2/point-of-sales/${id}/certificates`,
} as const;

export type Environment = 'sandbox' | 'production' | 'development';

export type BaseURLMode = 'auth' | 'api';

export const getBasePath = (mode: BaseURLMode, environment: Environment = 'sandbox'): string => {
  if (mode === 'auth') {
    return getAuthBaseURL(environment);
  }
  return getBaseURL(environment);
};

export const getBaseURL = (environment: Environment = 'sandbox'): string => {
  switch (environment) {
    case 'production':
      return API_ENDPOINTS.PRODUCTION;
    case 'development':
      return API_ENDPOINTS.DEVELOPMENT;
    case 'sandbox':
    default:
      return API_ENDPOINTS.SANDBOX;
  }
};

export const getAuthBaseURL = (environment: Environment = 'sandbox'): string => {
  switch (environment) {
    case 'production':
      return API_AUTH_ENDPOINTS.PRODUCTION;
    case 'development':
      return API_AUTH_ENDPOINTS.DEVELOPMENT;
    case 'sandbox':
    default:
      return API_AUTH_ENDPOINTS.SANDBOX;
  }
};