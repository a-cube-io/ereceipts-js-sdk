// MF2 API endpoints - Merchant management
import { getAPIClient } from './client';
import { MF2_PATHS } from '../constants/endpoints';
import {
  MerchantCreateInput,
  MerchantOutput,
  MerchantUpdateInput,
  PemCertificatesOutput,
  PemCreateInput,
  PemCreateOutput,
} from './types.convenience';

/**
 * Create a new merchant
 */
export const createMerchant = async (data: MerchantCreateInput): Promise<MerchantOutput> => {
  const client = getAPIClient();
  const response = await client.post<MerchantOutput>(MF2_PATHS.MERCHANTS, data);
  return response.data;
};

/**
 * Get list of merchants
 */
export const getMerchants = async (page: number = 1): Promise<MerchantOutput[]> => {
  const client = getAPIClient();
  const response = await client.get<MerchantOutput[]>(
    `${MF2_PATHS.MERCHANTS}?page=${page}`
  );
  return response.data;
};

/**
 * Get merchant by UUID
 */
export const getMerchantById = async (uuid: string): Promise<MerchantOutput> => {
  const client = getAPIClient();
  const response = await client.get<MerchantOutput>(MF2_PATHS.MERCHANT_BY_UUID(uuid));
  return response.data;
};

/**
 * Update merchant information
 */
export const updateMerchant = async (
  uuid: string,
  data: MerchantUpdateInput
): Promise<MerchantOutput> => {
  const client = getAPIClient();
  const response = await client.put<MerchantOutput>(MF2_PATHS.MERCHANT_BY_UUID(uuid), data);
  return response.data;
};

/**
 * Create a new PEM (Point of Electronic Money)
 */
export const createPem = async (data: PemCreateInput): Promise<PemCreateOutput> => {
  const client = getAPIClient();
  const response = await client.post<PemCreateOutput>(MF2_PATHS.POINT_OF_SALES, data);
  return response.data;
};

/**
 * Get PEM certificates by ID
 */
export const getPemCertificates = async (id: string): Promise<PemCertificatesOutput> => {
  const client = getAPIClient();
  const response = await client.get<PemCertificatesOutput>(MF2_PATHS.PEM_CERTIFICATES(id));
  return response.data;
};