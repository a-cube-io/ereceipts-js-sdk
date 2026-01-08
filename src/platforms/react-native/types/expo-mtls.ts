export interface MTLSDebugLogEvent {
  type: string;
  message?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
}

export interface MTLSErrorEvent {
  message: string;
  code?: string;
}

export interface MTLSCertificateExpiryEvent {
  alias?: string;
  subject: string;
  expiry: number;
  warning?: boolean;
}

export interface MTLSEventSubscription {
  remove(): void;
}

export type MTLSResponseBody = string | Record<string, unknown>;
