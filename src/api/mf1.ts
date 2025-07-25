// MF1 API endpoints - Core e-receipt functionality
import { getAPIClient } from './client';
import { MF1_PATHS } from '../constants/endpoints';
import {
  ActivationRequest,
  CashRegisterCreate,
  CashRegisterDetailedOutput,
  CashierCreateInput,
  CashierOutput,
  PEMDetailed,
  PEMStatus,
  PEMStatusOfflineRequest,
  PageCashRegisterBasicOutput,
  PageCashierOutput,
  PagePointOfSaleOutput,
  PageReceiptOutput,
  ReceiptDetailsOutput,
  ReceiptInput,
  ReceiptOutput,
  ReceiptReturnOrVoidViaPEMInput,
  ReceiptReturnOrVoidWithProofInput,
} from './types.convenience';

/**
 * Cashier Management
 */
export const createCashier = async (data: CashierCreateInput): Promise<CashierOutput> => {
  const client = getAPIClient();
  const response = await client.post<CashierOutput>(MF1_PATHS.CASHIERS, data);
  return response.data;
};

export const getCashiers = async (page: number = 1, size: number = 30): Promise<PageCashierOutput> => {
  const client = getAPIClient();
  const response = await client.get<PageCashierOutput>(
    `${MF1_PATHS.CASHIERS}?page=${page}&size=${size}`
  );
  return response.data;
};

export const getCashierById = async (id: number): Promise<CashierOutput> => {
  const client = getAPIClient();
  const response = await client.get<CashierOutput>(MF1_PATHS.CASHIER_BY_ID(id));
  return response.data;
};

export const getCurrentCashier = async (): Promise<CashierOutput> => {
  const client = getAPIClient();
  const response = await client.get<CashierOutput>(MF1_PATHS.CASHIER_ME);
  return response.data;
};

export const deleteCashier = async (id: number): Promise<void> => {
  const client = getAPIClient();
  await client.delete(MF1_PATHS.CASHIER_BY_ID(id));
};

/**
 * Point of Sale Management
 */
export const getPointOfSales = async (
  status?: PEMStatus,
  page: number = 1,
  size: number = 30
): Promise<PagePointOfSaleOutput> => {
  const client = getAPIClient();
  let url = `${MF1_PATHS.POINT_OF_SALES}?page=${page}&size=${size}`;
  if (status) {
    url += `&status=${status}`;
  }
  const response = await client.get<PagePointOfSaleOutput>(url);
  return response.data;
};

export const getPointOfSaleBySerial = async (serialNumber: string): Promise<PEMDetailed> => {
  const client = getAPIClient();
  const response = await client.get<PEMDetailed>(MF1_PATHS.POINT_OF_SALE_BY_SERIAL(serialNumber));
  return response.data;
};

export const activatePointOfSale = async (
  serialNumber: string,
  data: ActivationRequest
): Promise<void> => {
  const client = getAPIClient();
  await client.post(MF1_PATHS.POINT_OF_SALE_ACTIVATION(serialNumber), data);
};

export const createInactivityPeriod = async (serialNumber: string): Promise<void> => {
  const client = getAPIClient();
  await client.post(MF1_PATHS.POINT_OF_SALE_INACTIVITY(serialNumber));
};

export const setPointOfSaleOffline = async (
  serialNumber: string,
  data: PEMStatusOfflineRequest
): Promise<void> => {
  const client = getAPIClient();
  await client.post(MF1_PATHS.POINT_OF_SALE_OFFLINE(serialNumber), data);
};

export const closeJournal = async (): Promise<void> => {
  const client = getAPIClient();
  await client.post(MF1_PATHS.CLOSE_JOURNAL);
};

/**
 * Receipt Management
 */
export const createReceipt = async (data: ReceiptInput): Promise<ReceiptOutput> => {
  const client = getAPIClient();
  const response = await client.post<ReceiptOutput>(MF1_PATHS.RECEIPTS, data);
  return response.data;
};

export const getReceipts = async (
  page: number = 1,
  size: number = 30
): Promise<PageReceiptOutput> => {
  const client = getAPIClient();
  const response = await client.get<PageReceiptOutput>(
    `${MF1_PATHS.RECEIPTS}?page=${page}&size=${size}`
  );
  return response.data;
};

export const getReceiptById = async (uuid: string): Promise<ReceiptOutput> => {
  const client = getAPIClient();
  const response = await client.get<ReceiptOutput>(MF1_PATHS.RECEIPT_BY_UUID(uuid));
  return response.data;
};

export const getReceiptDetails = async (
  uuid: string,
  format: 'json' | 'pdf' = 'json'
): Promise<ReceiptDetailsOutput | Blob> => {
  const client = getAPIClient();
  const headers = format === 'pdf' ? { Accept: 'application/pdf' } : { Accept: 'application/json' };
  
  const response = await client.get(MF1_PATHS.RECEIPT_DETAILS(uuid), { headers });
  
  if (format === 'pdf') {
    return new Blob([response.data], { type: 'application/pdf' });
  }
  
  return response.data as ReceiptDetailsOutput;
};

export const voidReceipt = async (data: ReceiptReturnOrVoidViaPEMInput): Promise<void> => {
  const client = getAPIClient();
  await client.delete(MF1_PATHS.RECEIPTS, { data });
};

export const voidReceiptWithProof = async (data: ReceiptReturnOrVoidWithProofInput): Promise<void> => {
  const client = getAPIClient();
  await client.delete(MF1_PATHS.RECEIPT_VOID_WITH_PROOF, { data });
};

export const returnReceiptItems = async (data: ReceiptReturnOrVoidViaPEMInput): Promise<ReceiptOutput> => {
  const client = getAPIClient();
  const response = await client.post<ReceiptOutput>(MF1_PATHS.RECEIPT_RETURN, data);
  return response.data;
};

export const returnReceiptItemsWithProof = async (data: ReceiptReturnOrVoidWithProofInput): Promise<ReceiptOutput> => {
  const client = getAPIClient();
  const response = await client.post<ReceiptOutput>(MF1_PATHS.RECEIPT_RETURN_WITH_PROOF, data);
  return response.data;
};

/**
 * Cash Register Management
 */
export const createCashRegister = async (data: CashRegisterCreate): Promise<CashRegisterDetailedOutput> => {
  const client = getAPIClient();
  const response = await client.post<CashRegisterDetailedOutput>(MF1_PATHS.CASH_REGISTER, data);
  return response.data;
};

export const getCashRegisters = async (
  page: number = 1,
  size: number = 30
): Promise<PageCashRegisterBasicOutput> => {
  const client = getAPIClient();
  const response = await client.get<PageCashRegisterBasicOutput>(
    `${MF1_PATHS.CASH_REGISTER}?page=${page}&size=${size}`
  );
  return response.data;
};

export const getCashRegisterById = async (id: string): Promise<CashRegisterDetailedOutput> => {
  const client = getAPIClient();
  const response = await client.get<CashRegisterDetailedOutput>(MF1_PATHS.CASH_REGISTER_BY_ID(id));
  return response.data;
};

// Note: MTLS Certificate endpoint is not in the OpenAPI spec
// This function is kept for backward compatibility but may need verification
export const getMTLSCertificate = async (id: string): Promise<string> => {
  const client = getAPIClient();
  const response = await client.get<string>(MF1_PATHS.CASH_REGISTER_MTLS_CERT(id));
  return response.data;
};