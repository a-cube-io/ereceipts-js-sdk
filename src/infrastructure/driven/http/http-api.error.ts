import axios from 'axios';

export interface HttpResponsePayload {
  status: number;
  data: unknown;
}

export class HttpApiError extends Error {
  readonly response: HttpResponsePayload;

  constructor(response: HttpResponsePayload, message?: string) {
    const resolvedMessage =
      message ?? extractApiErrorMessage(response.data) ?? `HTTP ${response.status}`;
    super(resolvedMessage);
    this.name = 'HttpApiError';
    this.response = response;
  }
}

export function createHttpApiError(status: number, data: unknown): HttpApiError {
  return new HttpApiError({ status, data });
}

export function extractApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.detail === 'string') {
    return payload.detail;
  }

  if (typeof payload.title === 'string') {
    return payload.title;
  }

  return undefined;
}

export function extractHttpResponse(error: unknown): HttpResponsePayload | null {
  if (error instanceof HttpApiError) {
    return error.response;
  }

  if (axios.isAxiosError(error) && error.response) {
    return {
      status: error.response.status,
      data: error.response.data,
    };
  }

  if (!error || typeof error !== 'object') {
    return null;
  }

  const errorObject = error as Record<string, unknown>;

  if (errorObject.response && typeof errorObject.response === 'object') {
    const response = errorObject.response as Record<string, unknown>;
    const status = response.status ?? response.statusCode;

    if (typeof status === 'number') {
      return {
        status,
        data: response.data,
      };
    }
  }

  if (typeof errorObject.statusCode === 'number' && 'responseData' in errorObject) {
    return {
      status: errorObject.statusCode,
      data: errorObject.responseData,
    };
  }

  return null;
}
