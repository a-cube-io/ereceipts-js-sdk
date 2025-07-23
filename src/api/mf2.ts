// MF2 API endpoints - Merchant management
import { getAPIClient } from './client';
import { MF2_PATHS } from '../constants/endpoints';
import {
  MerchantCreateInput,
  MerchantOutput,
  MerchantUpdateInput,
} from './types.generated';

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