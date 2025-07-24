import {
  createMerchant,
  getMerchants,
  getMerchantById,
  updateMerchant,
} from '../../api/mf2';
import { getAPIClient } from '../../api/client';
import { MF2_PATHS } from '../../constants/endpoints';
import {
  MerchantCreateInput,
  MerchantOutput,
  MerchantUpdateInput,
} from '../../api/types.generated';

// Mock dependencies
jest.mock('../../api/client');
jest.mock('../../constants/endpoints');

const mockGetAPIClient = getAPIClient as jest.MockedFunction<typeof getAPIClient>;
const mockMF2_PATHS = MF2_PATHS as jest.Mocked<typeof MF2_PATHS>;

describe('MF2 API', () => {
  let mockAPIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock API client
    mockAPIClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockGetAPIClient.mockReturnValue(mockAPIClient);

    // Setup default MF2_PATHS mocks
    mockMF2_PATHS.MERCHANTS = '/merchants';
    mockMF2_PATHS.MERCHANT_BY_UUID = jest.fn((uuid: string) => `/merchants/${uuid}`);
  });

  describe('Merchant Management', () => {
    const mockMerchantCreateInput: MerchantCreateInput = {
      fiscal_id: '12345678901',
      name: 'Test Merchant',
      email: 'merchant@example.com',
      password: 'Password123!',
      address: {
        street_address: '123 Main St',
        zip_code: '12345',
        city: 'Test City',
        province: 'Test Province',
      },
    };

    const mockMerchantOutput: MerchantOutput = {
      uuid: 'merchant-uuid-123',
      fiscal_id: '12345678901',
      name: 'Test Merchant',
      email: 'merchant@example.com',
      address: {
        street_address: '123 Main St',
        zip_code: '12345',
        city: 'Test City',
        province: 'Test Province',
      },
    };

    const mockMerchantUpdateInput: MerchantUpdateInput = {
      name: 'Updated Merchant',
      address: {
        street_address: '456 Oak St',
        zip_code: '54321',
        city: 'Updated City',
        province: 'Updated Province',
      },
    };

    describe('createMerchant', () => {
      it('should create a merchant successfully', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockMerchantOutput,
        });

        const result = await createMerchant(mockMerchantCreateInput);

        expect(result).toEqual(mockMerchantOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF2_PATHS.MERCHANTS,
          mockMerchantCreateInput
        );
      });

      it('should create a merchant without address', async () => {
        const merchantWithoutAddress = {
          ...mockMerchantCreateInput,
          address: undefined,
        };

        const merchantOutputWithoutAddress = {
          ...mockMerchantOutput,
          address: undefined,
        };

        mockAPIClient.post.mockResolvedValue({
          data: merchantOutputWithoutAddress,
        });

        const result = await createMerchant(merchantWithoutAddress);

        expect(result).toEqual(merchantOutputWithoutAddress);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF2_PATHS.MERCHANTS,
          merchantWithoutAddress
        );
      });

      it('should handle API errors', async () => {
        const error = new Error('API Error');
        mockAPIClient.post.mockRejectedValue(error);

        await expect(createMerchant(mockMerchantCreateInput)).rejects.toThrow('API Error');
      });
    });

    describe('getMerchants', () => {
      it('should get merchants with default pagination', async () => {
        const mockMerchants = [mockMerchantOutput];
        mockAPIClient.get.mockResolvedValue({
          data: mockMerchants,
        });

        const result = await getMerchants();

        expect(result).toEqual(mockMerchants);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF2_PATHS.MERCHANTS}?page=1`
        );
      });

      it('should get merchants with custom pagination', async () => {
        const mockMerchants = [mockMerchantOutput];
        mockAPIClient.get.mockResolvedValue({
          data: mockMerchants,
        });

        const result = await getMerchants(2);

        expect(result).toEqual(mockMerchants);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF2_PATHS.MERCHANTS}?page=2`
        );
      });

      it('should handle empty merchant list', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: [],
        });

        const result = await getMerchants();

        expect(result).toEqual([]);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF2_PATHS.MERCHANTS}?page=1`
        );
      });

      it('should handle API errors', async () => {
        const error = new Error('Server error');
        mockAPIClient.get.mockRejectedValue(error);

        await expect(getMerchants()).rejects.toThrow('Server error');
      });
    });

    describe('getMerchantById', () => {
      it('should get merchant by UUID', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockMerchantOutput,
        });

        const result = await getMerchantById('merchant-uuid-123');

        expect(result).toEqual(mockMerchantOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF2_PATHS.MERCHANT_BY_UUID('merchant-uuid-123')
        );
      });

      it('should handle merchant not found', async () => {
        const error = new Error('Merchant not found');
        mockAPIClient.get.mockRejectedValue(error);

        await expect(getMerchantById('non-existent-uuid')).rejects.toThrow('Merchant not found');
      });

      it('should handle API errors', async () => {
        const error = new Error('Network error');
        mockAPIClient.get.mockRejectedValue(error);

        await expect(getMerchantById('merchant-uuid-123')).rejects.toThrow('Network error');
      });
    });

    describe('updateMerchant', () => {
      it('should update merchant successfully', async () => {
        const updatedMerchantOutput = {
          ...mockMerchantOutput,
          name: 'Updated Merchant',
          address: mockMerchantUpdateInput.address,
        };

        mockAPIClient.put.mockResolvedValue({
          data: updatedMerchantOutput,
        });

        const result = await updateMerchant('merchant-uuid-123', mockMerchantUpdateInput);

        expect(result).toEqual(updatedMerchantOutput);
        expect(mockAPIClient.put).toHaveBeenCalledWith(
          mockMF2_PATHS.MERCHANT_BY_UUID('merchant-uuid-123'),
          mockMerchantUpdateInput
        );
      });

      it('should update merchant without address', async () => {
        const updateInputWithoutAddress = {
          name: 'Updated Merchant',
          address: null,
        };

        const updatedMerchantOutput = {
          ...mockMerchantOutput,
          name: 'Updated Merchant',
          address: undefined,
        };

        mockAPIClient.put.mockResolvedValue({
          data: updatedMerchantOutput,
        });

        const result = await updateMerchant('merchant-uuid-123', updateInputWithoutAddress);

        expect(result).toEqual(updatedMerchantOutput);
        expect(mockAPIClient.put).toHaveBeenCalledWith(
          mockMF2_PATHS.MERCHANT_BY_UUID('merchant-uuid-123'),
          updateInputWithoutAddress
        );
      });

      it('should handle validation errors', async () => {
        const error = new Error('Validation error');
        mockAPIClient.put.mockRejectedValue(error);

        await expect(updateMerchant('merchant-uuid-123', mockMerchantUpdateInput)).rejects.toThrow('Validation error');
      });

      it('should handle merchant not found during update', async () => {
        const error = new Error('Merchant not found');
        mockAPIClient.put.mockRejectedValue(error);

        await expect(updateMerchant('non-existent-uuid', mockMerchantUpdateInput)).rejects.toThrow('Merchant not found');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors in createMerchant', async () => {
      const error = new Error('Network error');
      mockAPIClient.post.mockRejectedValue(error);

      await expect(createMerchant({
        fiscal_id: '12345678901',
        name: 'Test Merchant',
        email: 'merchant@example.com',
        password: 'Password123!',
      })).rejects.toThrow('Network error');
    });

    it('should handle server errors in getMerchants', async () => {
      const error = new Error('Server error');
      mockAPIClient.get.mockRejectedValue(error);

      await expect(getMerchants()).rejects.toThrow('Server error');
    });

    it('should handle timeout errors in getMerchantById', async () => {
      const error = new Error('Request timeout');
      mockAPIClient.get.mockRejectedValue(error);

      await expect(getMerchantById('merchant-uuid-123')).rejects.toThrow('Request timeout');
    });

    it('should handle authorization errors in updateMerchant', async () => {
      const error = new Error('Unauthorized');
      mockAPIClient.put.mockRejectedValue(error);

      await expect(updateMerchant('merchant-uuid-123', {
        name: 'Updated Merchant',
      })).rejects.toThrow('Unauthorized');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete merchant lifecycle', async () => {
      // Create merchant
      const merchantData: MerchantCreateInput = {
        fiscal_id: '98765432109',
        name: 'New Merchant',
        email: 'newmerchant@example.com',
        password: 'Password123!',
      };

      const createdMerchant: MerchantOutput = {
        uuid: 'new-merchant-uuid',
        fiscal_id: '98765432109',
        name: 'New Merchant',
        email: 'newmerchant@example.com',
      };

      mockAPIClient.post.mockResolvedValueOnce({ data: createdMerchant });
      mockAPIClient.get.mockResolvedValueOnce({ data: createdMerchant });

      const newMerchant = await createMerchant(merchantData);
      expect(newMerchant).toEqual(createdMerchant);

      const retrievedMerchant = await getMerchantById('new-merchant-uuid');
      expect(retrievedMerchant).toEqual(createdMerchant);
    });

    it('should handle merchant update workflow', async () => {
      // Get merchant
      const originalMerchant: MerchantOutput = {
        uuid: 'update-test-uuid',
        fiscal_id: '11111111111',
        name: 'Original Name',
        email: 'original@example.com',
      };

      const updatedMerchant: MerchantOutput = {
        ...originalMerchant,
        name: 'Updated Name',
        address: {
          street_address: '789 Pine St',
          zip_code: '67890',
          city: 'New City',
          province: 'New Province',
        },
      };

      mockAPIClient.get.mockResolvedValueOnce({ data: originalMerchant });
      mockAPIClient.put.mockResolvedValueOnce({ data: updatedMerchant });

      const merchant = await getMerchantById('update-test-uuid');
      expect(merchant).toEqual(originalMerchant);

      const updateData: MerchantUpdateInput = {
        name: 'Updated Name',
        address: {
          street_address: '789 Pine St',
          zip_code: '67890',
          city: 'New City',
          province: 'New Province',
        },
      };

      const updated = await updateMerchant('update-test-uuid', updateData);
      expect(updated).toEqual(updatedMerchant);
    });

    it('should handle pagination in merchant listing', async () => {
      const merchantsPage1 = [
        {
          uuid: 'merchant-1',
          fiscal_id: '11111111111',
          name: 'Merchant 1',
          email: 'merchant1@example.com',
        },
        {
          uuid: 'merchant-2',
          fiscal_id: '22222222222',
          name: 'Merchant 2',
          email: 'merchant2@example.com',
        },
      ];

      const merchantsPage2 = [
        {
          uuid: 'merchant-3',
          fiscal_id: '33333333333',
          name: 'Merchant 3',
          email: 'merchant3@example.com',
        },
      ];

      mockAPIClient.get
        .mockResolvedValueOnce({ data: merchantsPage1 })
        .mockResolvedValueOnce({ data: merchantsPage2 });

      const page1 = await getMerchants(1);
      expect(page1).toEqual(merchantsPage1);

      const page2 = await getMerchants(2);
      expect(page2).toEqual(merchantsPage2);

      expect(mockAPIClient.get).toHaveBeenCalledWith(`${mockMF2_PATHS.MERCHANTS}?page=1`);
      expect(mockAPIClient.get).toHaveBeenCalledWith(`${mockMF2_PATHS.MERCHANTS}?page=2`);
    });
  });
}); 