export const API_ENDPOINTS = {
  SANDBOX: 'https://api-sandbox.acube.it',
  PRODUCTION: 'https://api.acube.it',
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
} as const;

export type Environment = 'sandbox' | 'production';

export const getBaseURL = (environment: Environment = 'sandbox'): string => {
  return environment === 'production' 
    ? API_ENDPOINTS.PRODUCTION 
    : API_ENDPOINTS.SANDBOX;
};