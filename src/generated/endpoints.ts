/**
 * Generated Endpoint Definitions from OpenAPI Specification
 * Comprehensive endpoint configurations for all API resources
 *
 * This file is auto-generated based on openapi.yaml
 * Do not edit manually - use regeneration scripts instead
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface EndpointDefinition {
  path: string;
  method: HttpMethod;
  operationId: string;
  summary?: string;
  description?: string;
  tags: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: {
    path?: Record<string, string>;
    query?: Record<string, string>;
    header?: Record<string, string>;
  };
  requestBody?: {
    required: boolean;
    contentType: string;
    schema: string;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      contentType?: string;
      schema?: string;
    };
  };
  metadata?: {
    resource: string;
    operation: string;
    authRequired: boolean;
    retryable: boolean;
  };
}

/**
 * Cashier Endpoints - User account management for cashiers
 */
export class CashierEndpoints {
  static readonly LIST: EndpointDefinition = {
    path: '/mf1/cashiers',
    method: 'GET',
    operationId: 'read_cashiers_mf1_cashiers_get',
    summary: 'Read Cashiers',
    description: 'Get a paginated list of cashiers',
    tags: ['Cashier'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      query: {
        page: 'integer',
        size: 'integer',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_Page__T_Customized_CashierOutput_',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'cashiers',
      operation: 'list',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly CREATE: EndpointDefinition = {
    path: '/mf1/cashiers',
    method: 'POST',
    operationId: 'create_cashier_mf1_cashiers_post',
    summary: 'Create Cashier',
    description: 'Create a new cashier account',
    tags: ['Cashier'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_CashierCreateInput',
    },
    responses: {
      '201': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CashierOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'cashiers',
      operation: 'create',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly ME: EndpointDefinition = {
    path: '/mf1/cashiers/me',
    method: 'GET',
    operationId: 'read_cashier_me_mf1_cashiers_me_get',
    summary: 'Read Cashier Me',
    description: 'Read currently authenticated cashier\'s information',
    tags: ['Cashier'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CashierOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'cashiers',
      operation: 'me',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly GET_BY_ID: EndpointDefinition = {
    path: '/mf1/cashiers/{cashier_id}',
    method: 'GET',
    operationId: 'read_cashier_by_id_mf1_cashiers__cashier_id__get',
    summary: 'Read Cashier By Id',
    description: 'Get a specific user by id',
    tags: ['Cashier'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        cashier_id: 'integer',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CashierOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'cashiers',
      operation: 'get',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly DELETE: EndpointDefinition = {
    path: '/mf1/cashiers/{cashier_id}',
    method: 'DELETE',
    operationId: 'delete_cashier_mf1_cashiers__cashier_id__delete',
    summary: 'Delete Cashier',
    description: 'Delete a cashier',
    tags: ['Cashier'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        cashier_id: 'integer',
      },
    },
    responses: {
      '204': {
        description: 'Successful Response',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'cashiers',
      operation: 'delete',
      authRequired: true,
      retryable: false,
    },
  };
}

/**
 * Point of Sales Endpoints - PEM device management
 */
export class PointOfSalesEndpoints {
  static readonly LIST: EndpointDefinition = {
    path: '/mf1/point-of-sales',
    method: 'GET',
    operationId: 'read_point_of_sales_mf1_point_of_sales_get',
    summary: 'Read Point Of Sales',
    description: 'Retrieve PEMs',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_Page__T_Customized_PointOfSaleOutput_',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'list',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly GET_BY_SERIAL: EndpointDefinition = {
    path: '/mf1/point-of-sales/{serial_number}',
    method: 'GET',
    operationId: 'read_point_of_sale_mf1_point_of_sales__serial_number__get',
    summary: 'Read Point Of Sale',
    description: 'Get a specific Point of Sale by serial number',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        serial_number: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_PointOfSaleOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'get',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly CLOSE_JOURNAL: EndpointDefinition = {
    path: '/mf1/point-of-sales/close',
    method: 'POST',
    operationId: 'close_journal_mf1_point_of_sales_close_post',
    summary: 'Close Journal',
    description: 'Close the daily journal for Point of Sales',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_CloseJournalRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CloseJournalOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'close_journal',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly ACTIVATION: EndpointDefinition = {
    path: '/mf1/point-of-sales/{serial_number}/activation',
    method: 'POST',
    operationId: 'post_activation_mf1_point_of_sales__serial_number__activation_post',
    summary: 'Post Activation',
    description: 'Trigger the activation process of a Point of Sale by requesting a certificate to the Italian Tax Agency',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        serial_number: 'string',
      },
    },
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_ActivationRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ActivationOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'activation',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly CREATE_INACTIVITY: EndpointDefinition = {
    path: '/mf1/point-of-sales/{serial_number}/inactivity',
    method: 'POST',
    operationId: 'create_inactivity_period_mf1_point_of_sales__serial_number__inactivity_post',
    summary: 'Create Inactivity Period',
    description: 'Create a new inactivity period',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        serial_number: 'string',
      },
    },
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_InactivityRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'create_inactivity',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly SET_OFFLINE: EndpointDefinition = {
    path: '/mf1/point-of-sales/{serial_number}/status/offline',
    method: 'POST',
    operationId: 'post_offline_mf1_point_of_sales__serial_number__status_offline_post',
    summary: 'Post Offline',
    description: 'Change the state of the Point of Sale to \'offline\'',
    tags: ['Point of Sale'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        serial_number: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'point-of-sales',
      operation: 'set_offline',
      authRequired: true,
      retryable: false,
    },
  };
}

/**
 * Receipt Endpoints - Electronic receipt management
 */
export class ReceiptEndpoints {
  static readonly LIST: EndpointDefinition = {
    path: '/mf1/receipts',
    method: 'GET',
    operationId: 'get_receipts_mf1_receipts_get',
    summary: 'Get Receipts',
    description: 'Get a list of electronic receipts',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      query: {
        page: 'integer',
        size: 'integer',
        start_date: 'string',
        end_date: 'string',
        serial_number: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_Page__T_Customized_ReceiptOutput_',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'list',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly CREATE: EndpointDefinition = {
    path: '/mf1/receipts',
    method: 'POST',
    operationId: 'create_receipt_mf1_receipts_post',
    summary: 'Create Receipt',
    description: 'Create a new electronic receipt',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_ReceiptInput',
    },
    responses: {
      '201': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'create',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly VOID: EndpointDefinition = {
    path: '/mf1/receipts',
    method: 'DELETE',
    operationId: 'void_receipt_mf1_receipts_delete',
    summary: 'Void Receipt',
    description: 'Void an electronic receipt',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_VoidReceiptRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_VoidReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'void',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly GET_BY_UUID: EndpointDefinition = {
    path: '/mf1/receipts/{receipt_uuid}',
    method: 'GET',
    operationId: 'get_receipt_mf1_receipts__receipt_uuid__get',
    summary: 'Get Receipt',
    description: 'Get an electronic receipt',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        receipt_uuid: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'get',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly VOID_WITH_PROOF: EndpointDefinition = {
    path: '/mf1/receipts/void-with-proof',
    method: 'DELETE',
    operationId: 'void_receipt_via_proof_mf1_receipts_void_with_proof_delete',
    summary: 'Void Receipt Via Proof',
    description: 'Void an electronic receipt identified by a proof of purchase',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_VoidReceiptWithProofRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_VoidReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'void_with_proof',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly GET_DETAILS: EndpointDefinition = {
    path: '/mf1/receipts/{receipt_uuid}/details',
    method: 'GET',
    operationId: 'get_receipt_details_mf1_receipts__receipt_uuid__details_get',
    summary: 'Get Receipt Details',
    description: 'Get the details or the PDF of an electronic receipt',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        receipt_uuid: 'string',
      },
      header: {
        Accept: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'get_details',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly RETURN_ITEMS: EndpointDefinition = {
    path: '/mf1/receipts/return',
    method: 'POST',
    operationId: 'return_receipt_items_mf1_receipts_return_post',
    summary: 'Return Receipt Items',
    description: 'Return items from an electronic receipt (same PEM or other PEM)',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_ReturnRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'return_items',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly RETURN_ITEMS_WITH_PROOF: EndpointDefinition = {
    path: '/mf1/receipts/return-with-proof',
    method: 'POST',
    operationId: 'return_receipt_items_via_proof_mf1_receipts_return_with_proof_post',
    summary: 'Return Receipt Items Via Proof',
    description: 'Return items from an electronic receipt identified by a proof of purchase',
    tags: ['Receipt'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_ReturnWithProofRequest',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ReceiptOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'receipts',
      operation: 'return_items_with_proof',
      authRequired: true,
      retryable: false,
    },
  };
}

/**
 * Cash Register Endpoints - Cash register management
 */
export class CashRegisterEndpoints {
  static readonly CREATE: EndpointDefinition = {
    path: '/mf1/cash-register',
    method: 'POST',
    operationId: 'create_cash_register_mf1_cash_register_post',
    summary: 'Create Cash Register',
    description: 'Create a new cash register',
    tags: ['Cash Register'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'E-Receipt_IT_API_CashRegisterInput',
    },
    responses: {
      '201': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CashRegisterOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'cash-registers',
      operation: 'create',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly LIST: EndpointDefinition = {
    path: '/mf1/cash-register',
    method: 'GET',
    operationId: 'get_cash_registers_mf1_cash_register_get',
    summary: 'Get Cash Registers',
    description: 'Get a list of cash registers',
    tags: ['Cash Register'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_Page__T_Customized_CashRegisterOutput_',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'cash-registers',
      operation: 'list',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly GET_BY_ID: EndpointDefinition = {
    path: '/mf1/cash-register/{id}',
    method: 'GET',
    operationId: 'get_cash_register_mf1_cash_register__id__get',
    summary: 'Get Cash Register',
    description: 'Get a specific cash register by ID',
    tags: ['Cash Register'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        id: 'integer',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_CashRegisterOutput',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'cash-registers',
      operation: 'get',
      authRequired: true,
      retryable: true,
    },
  };
}

/**
 * Merchant Endpoints - Business entity management
 */
export class MerchantEndpoints {
  static readonly LIST: EndpointDefinition = {
    path: '/mf2/merchants',
    method: 'GET',
    operationId: 'api_merchants_get_collection',
    summary: 'Get Merchants',
    description: 'Get a list of merchants',
    tags: ['Merchant'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
    },
    metadata: {
      resource: 'merchants',
      operation: 'list',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly CREATE: EndpointDefinition = {
    path: '/mf2/merchants',
    method: 'POST',
    operationId: 'api_merchants_post',
    summary: 'Create Merchant',
    description: 'Create a new merchant',
    tags: ['Merchant'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'Merchant-create',
    },
    responses: {
      '201': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'Merchant-read',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'merchants',
      operation: 'create',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly GET_BY_UUID: EndpointDefinition = {
    path: '/mf2/merchants/{uuid}',
    method: 'GET',
    operationId: 'api_merchants_uuid_get',
    summary: 'Get Merchant',
    description: 'Get a specific merchant by UUID',
    tags: ['Merchant'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        uuid: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'Merchant-read',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'merchants',
      operation: 'get',
      authRequired: true,
      retryable: true,
    },
  };

  static readonly UPDATE: EndpointDefinition = {
    path: '/mf2/merchants/{uuid}',
    method: 'PUT',
    operationId: 'api_merchants_uuid_put',
    summary: 'Update Merchant',
    description: 'Update a merchant',
    tags: ['Merchant'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        uuid: 'string',
      },
    },
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'Merchant-update',
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'Merchant-read',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'merchants',
      operation: 'update',
      authRequired: true,
      retryable: false,
    },
  };
}

/**
 * PEM Endpoints - Point of Sale Module certificate management
 */
export class PEMEndpoints {
  static readonly CREATE_POS: EndpointDefinition = {
    path: '/mf2/point-of-sales',
    method: 'POST',
    operationId: 'api_point-of-sales_post',
    summary: 'Create Point of Sale',
    description: 'Create a new Point of Sale',
    tags: ['Pem'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    requestBody: {
      required: true,
      contentType: 'application/json',
      schema: 'PointOfSale-create',
    },
    responses: {
      '201': {
        description: 'Successful Response',
        contentType: 'application/json',
        schema: 'PointOfSale-read',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '422': {
        description: 'Validation Error',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_HTTPValidationError',
      },
    },
    metadata: {
      resource: 'pems',
      operation: 'create_pos',
      authRequired: true,
      retryable: false,
    },
  };

  static readonly GET_CERTIFICATES: EndpointDefinition = {
    path: '/mf2/point-of-sales/{id}/certificates',
    method: 'GET',
    operationId: 'api_point-of-sales_idcertificates_get',
    summary: 'Get PEM Certificates',
    description: 'Get certificates for a Point of Sale',
    tags: ['Pem'],
    security: [{ 'E-Receipt_IT_API_OAuth2PasswordBearer': [] }],
    parameters: {
      path: {
        id: 'string',
      },
    },
    responses: {
      '200': {
        description: 'Successful Response',
        contentType: 'application/json',
      },
      '403': {
        description: 'Forbidden',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel403Forbidden',
      },
      '404': {
        description: 'Not Found',
        contentType: 'application/json',
        schema: 'E-Receipt_IT_API_ErrorModel404NotFound',
      },
    },
    metadata: {
      resource: 'pems',
      operation: 'get_certificates',
      authRequired: true,
      retryable: true,
    },
  };
}

/**
 * Utility class for endpoint operations
 */
export class EndpointUtils {
  /**
   * Get all endpoints for a specific resource
   */
  static getResourceEndpoints(resource: string): EndpointDefinition[] {
    switch (resource.toLowerCase()) {
      case 'cashiers':
        return Object.values(CashierEndpoints);
      case 'point-of-sales':
        return Object.values(PointOfSalesEndpoints);
      case 'receipts':
        return Object.values(ReceiptEndpoints);
      case 'cash-registers':
        return Object.values(CashRegisterEndpoints);
      case 'merchants':
        return Object.values(MerchantEndpoints);
      case 'pems':
        return Object.values(PEMEndpoints);
      default:
        return [];
    }
  }

  /**
   * Find endpoint by operation ID
   */
  static findEndpointByOperationId(operationId: string): EndpointDefinition | null {
    const allClasses = [
      CashierEndpoints,
      PointOfSalesEndpoints,
      ReceiptEndpoints,
      CashRegisterEndpoints,
      MerchantEndpoints,
      PEMEndpoints,
    ];

    for (const endpointClass of allClasses) {
      for (const endpoint of Object.values(endpointClass)) {
        if (endpoint.operationId === operationId) {
          return endpoint;
        }
      }
    }

    return null;
  }

  /**
   * Build URL with path parameters
   */
  static buildUrl(endpoint: EndpointDefinition, pathParams: Record<string, string | number> = {}): string {
    let url = endpoint.path;

    for (const [key, value] of Object.entries(pathParams)) {
      url = url.replace(`{${key}}`, String(value));
    }

    return url;
  }

  /**
   * Check if endpoint requires authentication
   */
  static requiresAuth(endpoint: EndpointDefinition): boolean {
    return endpoint.metadata?.authRequired ?? false;
  }

  /**
   * Check if endpoint operation is retryable
   */
  static isRetryable(endpoint: EndpointDefinition): boolean {
    return endpoint.metadata?.retryable ?? false;
  }

  /**
   * Get expected content type for request body
   */
  static getRequestContentType(endpoint: EndpointDefinition): string | null {
    return endpoint.requestBody?.contentType ?? null;
  }

  /**
   * Get expected response content type
   */
  static getResponseContentType(endpoint: EndpointDefinition, statusCode: string): string | null {
    return endpoint.responses[statusCode]?.contentType ?? null;
  }
}
