export type SoftwareVersionStatus = 'active';

export interface TelemetryMerchant {
  vatNumber: string | null;
  fiscalCode: string | null;
  businessName: string | null;
}

export interface TelemetrySupplier {
  vatNumber: string | null;
  fiscalCode: string | null;
  businessName: string | null;
}

export interface TelemetrySoftwareVersion {
  version: string | null;
  swid: string | null;
  installedAt: string | null;
  status: SoftwareVersionStatus;
}

export interface TelemetrySoftware {
  code: string | null;
  name: string | null;
  approvalReference: string | null;
  versionInfo: TelemetrySoftwareVersion | null;
}

export interface PendingReceipts {
  count: number;
  totalAmount: string;
}

export interface TransmissionAttemptInfo {
  attemptedAt: string | null;
  outcome: string | null;
}

export interface LotterySecretRequestInfo {
  requestedAt: string | null;
  outcome: string | null;
}

export interface MessageInfo {
  receivedAt: string | null;
  content: string | null;
}

export interface LotteryTelemetry {
  lastTransmission: TransmissionAttemptInfo | null;
  secretRequest: LotterySecretRequestInfo | null;
}

export interface Telemetry {
  pemId: string;
  pemStatus: string;
  pemStatusChangedAt: string | null;
  merchant: TelemetryMerchant;
  supplier: TelemetrySupplier;
  software: TelemetrySoftware;
  lastCommunicationAt: string | null;
  pendingReceipts: PendingReceipts | null;
  lastReceiptTransmission: TransmissionAttemptInfo | null;
  lastMessageFromMf2: MessageInfo | null;
  adeCorrispettiviTransmission: TransmissionAttemptInfo | null;
  lastMessageFromAde: MessageInfo | null;
  lottery: LotteryTelemetry;
}
