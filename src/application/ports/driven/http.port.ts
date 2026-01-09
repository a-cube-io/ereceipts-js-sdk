export interface HttpRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
  authMode?: 'jwt' | 'mtls' | 'auto';
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer';
  data?: unknown;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface IHttpPort {
  get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  post<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  put<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  patch<T>(url: string, data?: unknown, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
  setAuthToken(token: string | null): void;
  getAuthToken(): string | null;
}
