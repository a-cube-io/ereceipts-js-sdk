import {
  LotteryInfo,
  Message,
  PemStatus,
  PendingReceipts,
  SoftwareStatus,
  Telemetry,
  TelemetryMerchant,
  TelemetrySoftware,
  TelemetrySoftwareVersion,
  TelemetrySupplier,
  Transmission,
  TransmissionOutcome,
} from '@/domain/entities/telemetry.entity';

/**
 * API interfaces (snake_case)
 */
export interface TelemetryMerchantApiOutput {
  vat_number: string;
  fiscal_code: string | null;
  business_name: string;
}

export interface TelemetrySupplierApiOutput {
  vat_number: string;
  fiscal_code: string | null;
  business_name: string;
}

export interface TelemetrySoftwareVersionApiOutput {
  version: string;
  swid: string;
  installed_at: string;
  status: string;
}

export interface TelemetrySoftwareApiOutput {
  code: string;
  name: string;
  approval_reference: string;
  version_info: TelemetrySoftwareVersionApiOutput;
}

export interface PendingReceiptsApiOutput {
  count: number;
  total_amount: string;
}

export interface TransmissionApiOutput {
  attempted_at: string;
  outcome: string;
}

export interface MessageApiOutput {
  received_at: string;
  content: string;
}

export interface LotterySecretRequestApiOutput {
  requested_at: string;
  outcome: string;
}

export interface LotteryApiOutput {
  last_transmission: TransmissionApiOutput;
  secret_request: LotterySecretRequestApiOutput;
}

export interface TelemetryApiOutput {
  pem_id: string;
  pem_status: string;
  pem_status_changed_at: string;
  merchant: TelemetryMerchantApiOutput;
  supplier: TelemetrySupplierApiOutput;
  software: TelemetrySoftwareApiOutput;
  last_communication_at: string;
  pending_receipts: PendingReceiptsApiOutput;
  last_receipt_transmission: TransmissionApiOutput;
  last_message_from_mf2: MessageApiOutput;
  ade_corrispettivi_transmission: TransmissionApiOutput;
  last_message_from_ade: MessageApiOutput;
  lottery: LotteryApiOutput;
}

/**
 * Telemetry Mapper
 * Converts between API (snake_case) and Domain (camelCase)
 */
export class TelemetryMapper {
  static fromApiOutput(output: TelemetryApiOutput): Telemetry {
    return {
      pemId: output.pem_id,
      pemStatus: output.pem_status as PemStatus,
      pemStatusChangedAt: output.pem_status_changed_at,
      merchant: this.merchantFromApi(output.merchant),
      supplier: this.supplierFromApi(output.supplier),
      software: this.softwareFromApi(output.software),
      lastCommunicationAt: output.last_communication_at,
      pendingReceipts: this.pendingReceiptsFromApi(output.pending_receipts),
      lastReceiptTransmission: this.transmissionFromApi(output.last_receipt_transmission),
      lastMessageFromMf2: this.messageFromApi(output.last_message_from_mf2),
      adeCorrispettiviTransmission: this.transmissionFromApi(output.ade_corrispettivi_transmission),
      lastMessageFromAde: this.messageFromApi(output.last_message_from_ade),
      lottery: this.lotteryFromApi(output.lottery),
    };
  }

  private static merchantFromApi(output: TelemetryMerchantApiOutput): TelemetryMerchant {
    return {
      vatNumber: output.vat_number,
      fiscalCode: output.fiscal_code,
      businessName: output.business_name,
    };
  }

  private static supplierFromApi(output: TelemetrySupplierApiOutput): TelemetrySupplier {
    return {
      vatNumber: output.vat_number,
      fiscalCode: output.fiscal_code,
      businessName: output.business_name,
    };
  }

  private static softwareVersionFromApi(
    output: TelemetrySoftwareVersionApiOutput
  ): TelemetrySoftwareVersion {
    return {
      version: output.version,
      swid: output.swid,
      installedAt: output.installed_at,
      status: output.status as SoftwareStatus,
    };
  }

  private static softwareFromApi(output: TelemetrySoftwareApiOutput): TelemetrySoftware {
    return {
      code: output.code,
      name: output.name,
      approvalReference: output.approval_reference,
      versionInfo: this.softwareVersionFromApi(output.version_info),
    };
  }

  private static pendingReceiptsFromApi(output: PendingReceiptsApiOutput): PendingReceipts {
    return {
      count: output.count,
      totalAmount: output.total_amount,
    };
  }

  private static transmissionFromApi(output: TransmissionApiOutput): Transmission {
    return {
      attemptedAt: output.attempted_at,
      outcome: output.outcome as TransmissionOutcome,
    };
  }

  private static messageFromApi(output: MessageApiOutput): Message {
    return {
      receivedAt: output.received_at,
      content: output.content,
    };
  }

  private static lotteryFromApi(output: LotteryApiOutput): LotteryInfo {
    return {
      lastTransmission: this.transmissionFromApi(output.last_transmission),
      secretRequest: {
        attemptedAt: output.secret_request.requested_at,
        outcome: output.secret_request.outcome as TransmissionOutcome,
      },
    };
  }
}
