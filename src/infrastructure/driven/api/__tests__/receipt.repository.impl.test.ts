import { IHttpPort } from '@/application/ports/driven/http.port';

import { ReceiptRepositoryImpl } from '../receipt.repository.impl';

const voidReceiptOutput = {
  uuid: 'void-uuid',
  type: 'void',
  total_amount: null,
  document_number: '0001-0002',
  document_datetime: '2026-11-10T10:00:00',
  is_returnable: false,
  is_voidable: false,
  pdf_url: null,
  parent_receipt_uuid: 'sale-uuid',
  status: 'ready',
};

function createHttpMock(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({ data: voidReceiptOutput, status: 200, headers: {} }),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

describe('ReceiptRepositoryImpl', () => {
  const item = {
    quantity: '1',
    description: 'Prodotto',
    unitPrice: '10',
    vatRateCode: '22.00' as const,
  };

  it('voidReceipt should post to /mf1/receipts/void and return the void receipt', async () => {
    const http = createHttpMock();
    const repository = new ReceiptRepositoryImpl(http);

    const result = await repository.voidReceipt({ documentNumber: '0001-0001' });

    expect(http.post).toHaveBeenCalledWith('/mf1/receipts/void', {
      document_number: '0001-0001',
      additional_text: undefined,
    });
    expect(result.uuid).toBe('void-uuid');
    expect(result.type).toBe('void');
    expect(result.parentReceiptUuid).toBe('sale-uuid');
    expect(result.totalAmount).toBeUndefined();
  });

  it('voidViaDifferentDevice should return the void receipt', async () => {
    const http = createHttpMock();
    const repository = new ReceiptRepositoryImpl(http);

    const result = await repository.voidViaDifferentDevice({
      deviceId: 'E001-000001',
      items: [item],
      documentNumber: '0001-0001',
      documentDatetime: '2026-11-10T10:00:00',
    });

    expect(http.post).toHaveBeenCalledWith(
      '/mf1/receipts/void-via-different-device',
      expect.objectContaining({ device_id: 'E001-000001' })
    );
    expect(result.uuid).toBe('void-uuid');
  });

  it('voidWithProof should return the void receipt', async () => {
    const http = createHttpMock();
    const repository = new ReceiptRepositoryImpl(http);

    const result = await repository.voidWithProof({
      items: [item],
      proof: 'POS',
      documentDatetime: '2026-11-10T10:00:00',
    });

    expect(http.post).toHaveBeenCalledWith(
      '/mf1/receipts/void-with-proof',
      expect.objectContaining({ proof: 'POS' })
    );
    expect(result.uuid).toBe('void-uuid');
  });

  it('findAll should send the sort as order[document_number]', async () => {
    const http = createHttpMock();
    http.get.mockResolvedValue({
      data: { members: [voidReceiptOutput], total: 1, page: 1, size: 30, pages: 1 },
      status: 200,
      headers: {},
    });
    const repository = new ReceiptRepositoryImpl(http);

    const result = await repository.findAll({ serialNumber: 'E001-000001', sort: 'ascending' });

    expect(http.get).toHaveBeenCalledWith('/mf1/pems/E001-000001/receipts', {
      params: expect.objectContaining({ 'order[document_number]': 'asc' }),
    });
    expect(result.members).toHaveLength(1);
  });
});
