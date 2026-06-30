import { Telemetry } from '@/domain/entities/telemetry.entity';

/**
 * Telemetry Repository Interface
 * Handles fetching telemetry data for a Point of Sale
 */
export interface ITelemetryRepository {
  /**
   * Get telemetry snapshot for the authenticated PEM (from mTLS cert / session).
   * Endpoint: GET /mf1/pems/telemetry (mTLS, port 443)
   */
  getTelemetry(): Promise<Telemetry>;
}
