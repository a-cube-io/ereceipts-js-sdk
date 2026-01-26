import {
  LotterySecretRequestInfo,
  LotteryTelemetry,
  MessageInfo,
  PendingReceipts,
  SoftwareVersionStatus,
  Telemetry,
  TelemetryMerchant,
  TelemetrySoftware,
  TelemetrySoftwareVersion,
  TelemetrySupplier,
  TransmissionAttemptInfo,
} from '@/domain/entities/telemetry.entity';

export interface TelemetryMerchantApiOutput {
  vat_number: string | null;
  fiscal_code: string | null;
  business_name: string | null;
}

export interface TelemetrySupplierApiOutput {
  vat_number: string | null;
  fiscal_code: string | null;
  business_name: string | null;
}

export interface TelemetrySoftwareVersionApiOutput {
  version: string | null;
  swid: string | null;
  installed_at: string | null;
  status: string;
}

export interface TelemetrySoftwareApiOutput {
  code: string | null;
  name: string | null;
  approval_reference: string | null;
  version_info: TelemetrySoftwareVersionApiOutput | null;
}

export interface PendingReceiptsApiOutput {
  count: number;
  total_amount: string;
}

export interface TransmissionAttemptApiOutput {
  attempted_at: string | null;
  outcome: string | null;
}

export interface MessageApiOutput {
  received_at: string | null;
  content: string | null;
}

export interface LotterySecretRequestApiOutput {
  requested_at: string | null;
  outcome: string | null;
}

export interface LotteryApiOutput {
  last_transmission: TransmissionAttemptApiOutput | null;
  secret_request: LotterySecretRequestApiOutput | null;
}

export interface TelemetryApiOutput {
  pem_id: string;
  pem_status: string;
  pem_status_changed_at: string | null;
  merchant: TelemetryMerchantApiOutput;
  supplier: TelemetrySupplierApiOutput;
  software: TelemetrySoftwareApiOutput;
  last_communication_at: string | null;
  pending_receipts: PendingReceiptsApiOutput | null;
  last_receipt_transmission: TransmissionAttemptApiOutput | null;
  last_message_from_mf2: MessageApiOutput | null;
  ade_corrispettivi_transmission: TransmissionAttemptApiOutput | null;
  last_message_from_ade: MessageApiOutput | null;
  lottery: LotteryApiOutput;
}

export class TelemetryMapper {
  static fromApiOutput(output: TelemetryApiOutput): Telemetry {
    return {
      pemId: output.pem_id,
      pemStatus: output.pem_status,
      pemStatusChangedAt: output.pem_status_changed_at,
      merchant: this.merchantFromApi(output.merchant),
      supplier: this.supplierFromApi(output.supplier),
      software: this.softwareFromApi(output.software),
      lastCommunicationAt: output.last_communication_at,
      pendingReceipts: output.pending_receipts
        ? this.pendingReceiptsFromApi(output.pending_receipts)
        : null,
      lastReceiptTransmission: output.last_receipt_transmission
        ? this.transmissionFromApi(output.last_receipt_transmission)
        : null,
      lastMessageFromMf2: output.last_message_from_mf2
        ? this.messageFromApi(output.last_message_from_mf2)
        : null,
      adeCorrispettiviTransmission: output.ade_corrispettivi_transmission
        ? this.transmissionFromApi(output.ade_corrispettivi_transmission)
        : null,
      lastMessageFromAde: output.last_message_from_ade
        ? this.messageFromApi(output.last_message_from_ade)
        : null,
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
      status: output.status as SoftwareVersionStatus,
    };
  }

  private static softwareFromApi(output: TelemetrySoftwareApiOutput): TelemetrySoftware {
    return {
      code: output.code,
      name: output.name,
      approvalReference: output.approval_reference,
      versionInfo: output.version_info ? this.softwareVersionFromApi(output.version_info) : null,
    };
  }

  private static pendingReceiptsFromApi(output: PendingReceiptsApiOutput): PendingReceipts {
    return {
      count: output.count,
      totalAmount: output.total_amount,
    };
  }

  private static transmissionFromApi(
    output: TransmissionAttemptApiOutput
  ): TransmissionAttemptInfo {
    return {
      attemptedAt: output.attempted_at,
      outcome: output.outcome,
    };
  }

  private static messageFromApi(output: MessageApiOutput): MessageInfo {
    return {
      receivedAt: output.received_at,
      content: output.content,
    };
  }

  private static secretRequestFromApi(
    output: LotterySecretRequestApiOutput
  ): LotterySecretRequestInfo {
    return {
      requestedAt: output.requested_at,
      outcome: output.outcome,
    };
  }

  private static lotteryFromApi(output: LotteryApiOutput): LotteryTelemetry {
    return {
      lastTransmission: output.last_transmission
        ? this.transmissionFromApi(output.last_transmission)
        : null,
      secretRequest: output.secret_request
        ? this.secretRequestFromApi(output.secret_request)
        : null,
    };
  }
}
