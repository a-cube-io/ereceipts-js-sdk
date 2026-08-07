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
  id: string | null;
  swidTagId: string | null;
  date: string | null;
}

export interface TelemetrySoftware {
  code: string | null;
  name: string | null;
  approvalReference: string | null;
  version: TelemetrySoftwareVersion | null;
  availableVersion: TelemetrySoftwareVersion | null;
}

export interface TelemetryCashRegister {
  uuid: string;
  name: string | null;
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
  cashRegister: TelemetryCashRegister;
  lastCommunicationAt: string | null;
  pendingReceipts: PendingReceipts | null;
  lastReceiptTransmission: TransmissionAttemptInfo | null;
  lastMessageFromMf2: MessageInfo | null;
  adeCorrispettiviTransmission: TransmissionAttemptInfo | null;
  lastMessageFromAde: MessageInfo | null;
  lottery: LotteryTelemetry;
}
