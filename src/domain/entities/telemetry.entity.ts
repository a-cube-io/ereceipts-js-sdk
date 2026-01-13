/**
 * PEM Status
 */
export type PemStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

/**
 * Software Status
 */
export type SoftwareStatus = 'active' | 'inactive' | 'archived';

/**
 * Transmission Outcome
 */
export type TransmissionOutcome = 'success' | 'failed' | 'pending';

/**
 * Merchant info in telemetry context
 */
export interface TelemetryMerchant {
  vatNumber: string;
  fiscalCode: string | null;
  businessName: string;
}

/**
 * Supplier info in telemetry context (same structure as merchant)
 */
export interface TelemetrySupplier {
  vatNumber: string;
  fiscalCode: string | null;
  businessName: string;
}

/**
 * Software version information
 */
export interface TelemetrySoftwareVersion {
  version: string;
  swid: string;
  installedAt: string;
  status: SoftwareStatus;
}

/**
 * Software information
 */
export interface TelemetrySoftware {
  code: string;
  name: string;
  approvalReference: string;
  versionInfo: TelemetrySoftwareVersion;
}

/**
 * Pending receipts summary
 */
export interface PendingReceipts {
  count: number;
  totalAmount: string;
}

/**
 * Transmission record
 */
export interface Transmission {
  attemptedAt: string;
  outcome: TransmissionOutcome;
}

/**
 * Message record
 */
export interface Message {
  receivedAt: string;
  content: string;
}

/**
 * Lottery transmission info
 */
export interface LotteryInfo {
  lastTransmission: Transmission;
  secretRequest: Transmission;
}

/**
 * Telemetry Entity - Aggregate Root
 * Complete snapshot of a Point of Sale status
 */
export interface Telemetry {
  pemId: string;
  pemStatus: PemStatus;
  pemStatusChangedAt: string;
  merchant: TelemetryMerchant;
  supplier: TelemetrySupplier;
  software: TelemetrySoftware;
  lastCommunicationAt: string;
  pendingReceipts: PendingReceipts;
  lastReceiptTransmission: Transmission;
  lastMessageFromMf2: Message;
  adeCorrispettiviTransmission: Transmission;
  lastMessageFromAde: Message;
  lottery: LotteryInfo;
}
