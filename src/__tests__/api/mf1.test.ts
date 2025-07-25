import {
  createCashier,
  getCashiers,
  getCashierById,
  getCurrentCashier,
  deleteCashier,
  getPointOfSales,
  getPointOfSaleBySerial,
  activatePointOfSale,
  createInactivityPeriod,
  setPointOfSaleOffline,
  closeJournal,
  createReceipt,
  getReceipts,
  getReceiptById,
  getReceiptDetails,
  voidReceipt,
  voidReceiptWithProof,
  returnReceiptItems,
  returnReceiptItemsWithProof,
  createCashRegister,
  getCashRegisters,
  getCashRegisterById,
  getMTLSCertificate,
} from '../../api/mf1';
import { getAPIClient } from '../../api/client';
import { MF1_PATHS } from '../../constants/endpoints';
import {
  CashierCreateInput,
  CashierOutput,
  CashRegisterCreate,
  CashRegisterOutput,
  PEMPublic,
  PaginatedResponse,
  ReceiptDetailsOutput,
  ReceiptInput,
  ReceiptOutput,
  ReceiptReturnOrVoidViaPEMInput,
  ReceiptReturnOrVoidWithProofInput,
} from '../../api/types.convenience';

// Mock dependencies
jest.mock('../../api/client');
jest.mock('../../constants/endpoints');

const mockGetAPIClient = getAPIClient as jest.MockedFunction<typeof getAPIClient>;
const mockMF1_PATHS = MF1_PATHS as jest.Mocked<typeof MF1_PATHS>;

describe('MF1 API', () => {
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

    // Setup default MF1_PATHS mocks
    // @ts-ignore
    mockMF1_PATHS.CASHIERS = '/cashiers';
    // @ts-ignore
    mockMF1_PATHS.CASHIER_BY_ID = jest.fn((id: number) => `/cashiers/${id}`);
    // @ts-ignore
    mockMF1_PATHS.CASHIER_ME = '/cashiers/me';
    // @ts-ignore
    mockMF1_PATHS.POINT_OF_SALES = '/point-of-sales';
    // @ts-ignore
    mockMF1_PATHS.POINT_OF_SALE_BY_SERIAL = jest.fn((serial: string) => `/point-of-sales/${serial}`);
    // @ts-ignore
    mockMF1_PATHS.POINT_OF_SALE_ACTIVATION = jest.fn((serial: string) => `/point-of-sales/${serial}/activation`);
    // @ts-ignore
    mockMF1_PATHS.POINT_OF_SALE_INACTIVITY = jest.fn((serial: string) => `/point-of-sales/${serial}/inactivity`);
    // @ts-ignore
    mockMF1_PATHS.POINT_OF_SALE_OFFLINE = jest.fn((serial: string) => `/point-of-sales/${serial}/offline`);
    // @ts-ignore
    mockMF1_PATHS.CLOSE_JOURNAL = '/close-journal';
    // @ts-ignore
    mockMF1_PATHS.RECEIPTS = '/receipts';
    // @ts-ignore
    mockMF1_PATHS.RECEIPT_BY_UUID = jest.fn((uuid: string) => `/receipts/${uuid}`);
    // @ts-ignore
    mockMF1_PATHS.RECEIPT_DETAILS = jest.fn((uuid: string) => `/receipts/${uuid}/details`);
    // @ts-ignore
    mockMF1_PATHS.RECEIPT_VOID_WITH_PROOF = '/receipts/void-with-proof';
    // @ts-ignore
    mockMF1_PATHS.RECEIPT_RETURN = '/receipts/return';
    // @ts-ignore
    mockMF1_PATHS.RECEIPT_RETURN_WITH_PROOF = '/receipts/return-with-proof';
    // @ts-ignore
    mockMF1_PATHS.CASH_REGISTER = '/cash-register';
    // @ts-ignore
    mockMF1_PATHS.CASH_REGISTER_BY_ID = jest.fn((id: string) => `/cash-register/${id}`);
    // @ts-ignore
    mockMF1_PATHS.CASH_REGISTER_MTLS_CERT = jest.fn((id: string) => `/cash-register/${id}/mtls-cert`);
  });

  describe('Cashier Management', () => {
    const mockCashierData: CashierCreateInput = {
      email: 'cashier@example.com',
      password: 'Password123!',
    };

    const mockCashierOutput: CashierOutput = {
      id: 1,
      email: 'cashier@example.com',
    };

    describe('createCashier', () => {
      it('should create a cashier successfully', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockCashierOutput,
        });

        const result = await createCashier(mockCashierData);

        expect(result).toEqual(mockCashierOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.CASHIERS,
          mockCashierData
        );
      });

      it('should handle API errors', async () => {
        const error = new Error('API Error');
        mockAPIClient.post.mockRejectedValue(error);

        await expect(createCashier(mockCashierData)).rejects.toThrow('API Error');
      });
    });

    describe('getCashiers', () => {
      const mockPaginatedResponse: PaginatedResponse<CashierOutput> = {
        members: [mockCashierOutput],
        total: 1,
        page: 1,
        size: 30,
        pages: 1,
      };

      it('should get cashiers with default pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getCashiers();

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.CASHIERS}?page=1&size=30`
        );
      });

      it('should get cashiers with custom pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getCashiers(2, 50);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.CASHIERS}?page=2&size=50`
        );
      });
    });

    describe('getCashierById', () => {
      it('should get cashier by ID', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockCashierOutput,
        });

        const result = await getCashierById(1);

        expect(result).toEqual(mockCashierOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.CASHIER_BY_ID(1)
        );
      });
    });

    describe('getCurrentCashier', () => {
      it('should get current cashier', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockCashierOutput,
        });

        const result = await getCurrentCashier();

        expect(result).toEqual(mockCashierOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.CASHIER_ME
        );
      });
    });

    describe('deleteCashier', () => {
      it('should delete cashier successfully', async () => {
        mockAPIClient.delete.mockResolvedValue({});

        await deleteCashier(1);

        expect(mockAPIClient.delete).toHaveBeenCalledWith(
          mockMF1_PATHS.CASHIER_BY_ID(1)
        );
      });
    });
  });

  describe('Point of Sale Management', () => {
    const mockPEMPublic: PEMPublic = {
      serial_number: 'PEM123456',
      status: 'ACTIVE',
      address: {
        street_address: '123 Main St',
        zip_code: '12345',
        city: 'Test City',
        province: 'Test Province',
      },
    };

    describe('getPointOfSales', () => {
      const mockPaginatedResponse: PaginatedResponse<PEMPublic> = {
        members: [mockPEMPublic],
        total: 1,
        page: 1,
        size: 30,
        pages: 1,
      };

      it('should get point of sales with default parameters', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getPointOfSales();

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.POINT_OF_SALES}?page=1&size=30`
        );
      });

      it('should get point of sales with status filter', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getPointOfSales('ACTIVE', 2, 50);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.POINT_OF_SALES}?page=2&size=50&status=ACTIVE`
        );
      });
    });

    describe('getPointOfSaleBySerial', () => {
      it('should get point of sale by serial number', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPEMPublic,
        });

        const result = await getPointOfSaleBySerial('PEM123456');

        expect(result).toEqual(mockPEMPublic);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.POINT_OF_SALE_BY_SERIAL('PEM123456')
        );
      });
    });

    describe('activatePointOfSale', () => {
      it('should activate point of sale', async () => {
        mockAPIClient.post.mockResolvedValue({});

        await activatePointOfSale('PEM123456', { registration_key: 'registration-key-123' });

        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.POINT_OF_SALE_ACTIVATION('PEM123456'),
          {
            registration_key: 'registration-key-123',
          }
        );
      });
    });

    describe('createInactivityPeriod', () => {
      it('should create inactivity period', async () => {
        mockAPIClient.post.mockResolvedValue({});

        await createInactivityPeriod('PEM123456');

        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.POINT_OF_SALE_INACTIVITY('PEM123456')
        );
      });
    });

    describe('setPointOfSaleOffline', () => {
      it('should set point of sale offline', async () => {
        mockAPIClient.post.mockResolvedValue({});

          await setPointOfSaleOffline('PEM123456', {
          timestamp: '2023-01-01T10:00:00Z',
          reason: 'Maintenance',
        });

        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.POINT_OF_SALE_OFFLINE('PEM123456'),
          {
            timestamp: '2023-01-01T10:00:00Z',
            reason: 'Maintenance',
          }
        );
      });
    });

    describe('closeJournal', () => {
      it('should close journal', async () => {
        mockAPIClient.post.mockResolvedValue({});

        await closeJournal();

        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.CLOSE_JOURNAL
        );
      });
    });
  });

  describe('Receipt Management', () => {
    const mockReceiptInput: ReceiptInput = {
      items: [
        {
          quantity: '2',
          description: 'Test Item',
          unit_price: '10.00',
          good_or_service: 'B',
        },
      ],
      customer_tax_code: '12345678901',
      cash_payment_amount: '20.00',
    };

    const mockReceiptOutput: ReceiptOutput = {
      uuid: 'receipt-uuid-123',
      type: 'sale',
      customer_lottery_code: null,
      created_at: '2023-01-01T10:00:00Z',
      total_amount: '20.00',
      document_number: 'DOC001',
      document_datetime: '2023-01-01T10:00:00Z',
    };

    const mockReceiptDetailsOutput: ReceiptDetailsOutput = {
      uuid: 'receipt-uuid-123',
      type: 'sale',
      customer_lottery_code: null,
      created_at: '2023-01-01T10:00:00Z',
      total_amount: '20.00',
      document_number: 'DOC001',
      document_datetime: '2023-01-01T10:00:00Z',
      fiscal_id: 'FISCAL123',
      total_taxable_amount: '18.00',
      total_uncollected_amount: '0.00',
      deductible_amount: '0.00',
      total_vat_amount: '2.00',
      total_discount: '0.00',
      total_gross_discount: '0.00',
      discount: '0.00',
      items: [
        {
          quantity: '2',
          description: 'Test Item',
          unit_price: '10.00',
          good_or_service: 'B',
        },
      ],
    };

    describe('createReceipt', () => {
      it('should create receipt successfully', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockReceiptOutput,
        });

        const result = await createReceipt(mockReceiptInput);

        expect(result).toEqual(mockReceiptOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPTS,
          mockReceiptInput
        );
      });
    });

    describe('getReceipts', () => {
      const mockPaginatedResponse: PaginatedResponse<ReceiptOutput> = {
        members: [mockReceiptOutput],
        total: 1,
        page: 1,
        size: 30,
        pages: 1,
      };

      it('should get receipts with default pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getReceipts();

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.RECEIPTS}?page=1&size=30`
        );
      });

      it('should get receipts with custom pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getReceipts(2, 50);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.RECEIPTS}?page=2&size=50`
        );
      });
    });

    describe('getReceiptById', () => {
      it('should get receipt by UUID', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockReceiptOutput,
        });

        const result = await getReceiptById('receipt-uuid-123');

        expect(result).toEqual(mockReceiptOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_BY_UUID('receipt-uuid-123')
        );
      });
    });

    describe('getReceiptDetails', () => {
      it('should get receipt details in JSON format', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockReceiptDetailsOutput,
        });

        const result = await getReceiptDetails('receipt-uuid-123', 'json');

        expect(result).toEqual(mockReceiptDetailsOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_DETAILS('receipt-uuid-123'),
          { headers: { Accept: 'application/json' } }
        );
      });

      it('should get receipt details in PDF format', async () => {
        const pdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // PDF header
        mockAPIClient.get.mockResolvedValue({
          data: pdfData,
        });

        const result = await getReceiptDetails('receipt-uuid-123', 'pdf');

        expect(result).toBeInstanceOf(Blob);
        expect((result as Blob).type).toBe('application/pdf');
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_DETAILS('receipt-uuid-123'),
          { headers: { Accept: 'application/pdf' } }
        );
      });

      it('should default to JSON format', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockReceiptDetailsOutput,
        });

        const result = await getReceiptDetails('receipt-uuid-123');

        expect(result).toEqual(mockReceiptDetailsOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_DETAILS('receipt-uuid-123'),
          { headers: { Accept: 'application/json' } }
        );
      });
    });

    describe('voidReceipt', () => {
      it('should void receipt', async () => {
        mockAPIClient.delete.mockResolvedValue({});

        const voidData: ReceiptReturnOrVoidViaPEMInput = {
          pem_id: 'pem-123',
          items: [{ good_or_service: 'B', quantity: '1', description: 'Test Item', unit_price: '10.00' }],
          document_number: 'DOC001',
          document_date: '2023-01-01',
          lottery_code: 'LOT123',
        };

        await voidReceipt(voidData);

        expect(mockAPIClient.delete).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPTS,
          { data: voidData }
        );
      });
    });

    describe('voidReceiptWithProof', () => {
      it('should void receipt with proof', async () => {
        mockAPIClient.delete.mockResolvedValue({});

        const voidData: ReceiptReturnOrVoidWithProofInput = {
          items: [{ good_or_service: 'B', quantity: '1', description: 'Test Item', unit_price: '10.00' }],
          proof: 'POS',
          document_datetime: '2023-01-01T10:00:00Z',
        };

        await voidReceiptWithProof(voidData);

        expect(mockAPIClient.delete).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_VOID_WITH_PROOF,
          { data: voidData }
        );
      });
    });

    describe('returnReceiptItems', () => {
      it('should return receipt items', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockReceiptOutput,
        });

        const returnData: ReceiptReturnOrVoidViaPEMInput = {
          pem_id: 'pem-123',
          items: [{ good_or_service: 'B', quantity: '1', description: 'Test Item', unit_price: '10.00' }],
          document_number: 'DOC001',
          document_date: '2023-01-01',
          lottery_code: 'LOT123',
        };

        const result = await returnReceiptItems(returnData);

        expect(result).toEqual(mockReceiptOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_RETURN,
          returnData
        );
      });
    });

    describe('returnReceiptItemsWithProof', () => {
      it('should return receipt items with proof', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockReceiptOutput,
        });

        const returnData: ReceiptReturnOrVoidWithProofInput = {
          items: [{ good_or_service: 'B', quantity: '1', description: 'Test Item', unit_price: '10.00' }],
          proof: 'VR',
          document_datetime: '2023-01-01T10:00:00Z',
        };

        const result = await returnReceiptItemsWithProof(returnData);

        expect(result).toEqual(mockReceiptOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.RECEIPT_RETURN_WITH_PROOF,
          returnData
        );
      });
    });
  });

  describe('Cash Register Management', () => {
    const mockCashRegisterCreate: CashRegisterCreate = {
      pem_serial_number: 'PEM123456',
      name: 'Test Cash Register',
    };

    const mockCashRegisterOutput: CashRegisterOutput = {
      id: 'register-123',
      pem_serial_number: 'PEM123456',
      name: 'Test Cash Register',
      mtls_certificate: '-----BEGIN CERTIFICATE-----...',
      private_key: '-----BEGIN PRIVATE KEY-----...',
    };

    describe('createCashRegister', () => {
      it('should create cash register successfully', async () => {
        mockAPIClient.post.mockResolvedValue({
          data: mockCashRegisterOutput,
        });

        const result = await createCashRegister(mockCashRegisterCreate);

        expect(result).toEqual(mockCashRegisterOutput);
        expect(mockAPIClient.post).toHaveBeenCalledWith(
          mockMF1_PATHS.CASH_REGISTER,
          mockCashRegisterCreate
        );
      });
    });

    describe('getCashRegisters', () => {
      const mockPaginatedResponse: PaginatedResponse<CashRegisterOutput> = {
        members: [mockCashRegisterOutput],
        total: 1,
        page: 1,
        size: 30,
        pages: 1,
      };

      it('should get cash registers with default pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getCashRegisters();

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.CASH_REGISTER}?page=1&size=30`
        );
      });

      it('should get cash registers with custom pagination', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockPaginatedResponse,
        });

        const result = await getCashRegisters(2, 50);

        expect(result).toEqual(mockPaginatedResponse);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          `${mockMF1_PATHS.CASH_REGISTER}?page=2&size=50`
        );
      });
    });

    describe('getCashRegisterById', () => {
      it('should get cash register by ID', async () => {
        mockAPIClient.get.mockResolvedValue({
          data: mockCashRegisterOutput,
        });

        const result = await getCashRegisterById('register-123');

        expect(result).toEqual(mockCashRegisterOutput);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.CASH_REGISTER_BY_ID('register-123')
        );
      });
    });

    describe('getMTLSCertificate', () => {
      it('should get MTLS certificate', async () => {
        const certificate = '-----BEGIN CERTIFICATE-----\nMIIE...\n-----END CERTIFICATE-----';
        mockAPIClient.get.mockResolvedValue({
          data: certificate,
        });

        const result = await getMTLSCertificate('register-123');

        expect(result).toBe(certificate);
        expect(mockAPIClient.get).toHaveBeenCalledWith(
          mockMF1_PATHS.CASH_REGISTER_MTLS_CERT('register-123')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors in createCashier', async () => {
      const error = new Error('Network error');
      mockAPIClient.post.mockRejectedValue(error);

      await expect(createCashier({
        email: 'test@example.com',
        password: 'password123',
      })).rejects.toThrow('Network error');
    });

    it('should handle API errors in getCashiers', async () => {
      const error = new Error('Server error');
      mockAPIClient.get.mockRejectedValue(error);

      await expect(getCashiers()).rejects.toThrow('Server error');
    });

    it('should handle API errors in createReceipt', async () => {
      const error = new Error('Validation error');
      mockAPIClient.post.mockRejectedValue(error);

      await expect(createReceipt({
        items: [{ quantity: '1', description: 'Test', unit_price: '10.00' }],
      })).rejects.toThrow('Validation error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete cashier workflow', async () => {
      // Create cashier
      const cashierData: CashierCreateInput = {
        email: 'newcashier@example.com',
        password: 'Password123!',
      };
      const createdCashier: CashierOutput = {
        id: 2,
        email: 'newcashier@example.com',
      };

      mockAPIClient.post.mockResolvedValueOnce({ data: createdCashier });
      mockAPIClient.get.mockResolvedValueOnce({ data: createdCashier });

      const newCashier = await createCashier(cashierData);
      expect(newCashier).toEqual(createdCashier);

      const retrievedCashier = await getCashierById(2);
      expect(retrievedCashier).toEqual(createdCashier);
    });

    it('should handle complete receipt workflow', async () => {
      // Create receipt
      const receiptInput: ReceiptInput = {
        items: [
          {
            quantity: '1',
            description: 'Test Item',
            unit_price: '15.00',
            good_or_service: 'B',
          },
        ],
        cash_payment_amount: '15.00',
      };

      const receiptOutput: ReceiptOutput = {
        uuid: 'receipt-456',
        type: 'sale',
        customer_lottery_code: null,
        created_at: '2023-01-01T12:00:00Z',
        total_amount: '15.00',
        document_number: 'DOC002',
        document_datetime: '2023-01-01T12:00:00Z',
      };

      mockAPIClient.post.mockResolvedValueOnce({ data: receiptOutput });
      mockAPIClient.get.mockResolvedValueOnce({ data: receiptOutput });

      const createdReceipt = await createReceipt(receiptInput);
      expect(createdReceipt).toEqual(receiptOutput);

      const retrievedReceipt = await getReceiptById('receipt-456');
      expect(retrievedReceipt).toEqual(receiptOutput);
    });

    it('should handle point of sale activation workflow', async () => {
      // Get point of sale
      const pemPublic: PEMPublic = {
        serial_number: 'PEM789',
        status: 'NEW',
        address: {
          street_address: '456 Oak St',
          zip_code: '54321',
          city: 'Another City',
          province: 'Another Province',
        },
      };

      mockAPIClient.get.mockResolvedValueOnce({ data: pemPublic });
      mockAPIClient.post.mockResolvedValueOnce({});

      const pos = await getPointOfSaleBySerial('PEM789');
      expect(pos).toEqual(pemPublic);

      await activatePointOfSale('PEM789', { registration_key: 'activation-key-456' });
      expect(mockAPIClient.post).toHaveBeenCalledWith(
        mockMF1_PATHS.POINT_OF_SALE_ACTIVATION('PEM789'),
        { registration_key: 'activation-key-456' }
      );
    });
  });
}); 