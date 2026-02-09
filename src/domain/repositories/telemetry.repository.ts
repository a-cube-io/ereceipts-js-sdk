import { Telemetry } from '@/domain/entities/telemetry.entity';

/**
 * Telemetry Repository Interface
 * Handles fetching telemetry data for a Point of Sale
 */
export interface ITelemetryRepository {
  /**
   * Get telemetry snapshot for a PEM
   * Endpoint: GET /mf1/pems/{pem_id}/telemetry (mTLS, port 444)
   */
  getTelemetry(pemId: string): Promise<Telemetry>;
}
