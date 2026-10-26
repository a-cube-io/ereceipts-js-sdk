import axios from 'axios';

import { AxiosHttpAdapter } from '../axios-http.adapter';

jest.mock('axios');

describe('AxiosHttpAdapter', () => {
  const mockClient = {
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue(mockClient);
    mockClient.put.mockResolvedValue({ data: {}, status: 200, headers: {} });
  });

  describe('put', () => {
    const body = { name: 'value', empty: '', missing: null };

    it('should strip null and empty values from the body by default', async () => {
      const adapter = new AxiosHttpAdapter({ baseUrl: 'https://api.test' });

      await adapter.put('/resource', body);

      expect(mockClient.put).toHaveBeenCalledWith('/resource', { name: 'value' }, {});
    });

    it('should send null and empty values when preserveEmptyValues is set', async () => {
      const adapter = new AxiosHttpAdapter({ baseUrl: 'https://api.test' });

      await adapter.put('/resource', body, { preserveEmptyValues: true });

      expect(mockClient.put).toHaveBeenCalledWith('/resource', body, expect.any(Object));
    });
  });
});
