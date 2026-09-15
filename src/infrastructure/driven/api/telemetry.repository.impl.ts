import { TelemetryApiOutput, TelemetryMapper } from '@/application/dto/telemetry.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';
import { ACubeSDKError } from '@/shared/types';

export class TelemetryRepositoryImpl implements ITelemetryRepository {
  constructor(private readonly http: IHttpPort) {}

  async getTelemetry(): Promise<Telemetry> {
    const response = await this.http.get<TelemetryApiOutput>('/mf1/pems/telemetry');
    return TelemetryMapper.fromApiOutput(response.data);
  }
}

/**
 * No-op telemetry repository used when telemetry is disabled via SDKConfig.
 * Never performs any network call.
 */
export class NoopTelemetryRepository implements ITelemetryRepository {
  async getTelemetry(): Promise<Telemetry> {
    throw new ACubeSDKError(
      'TELEMETRY_DISABLED',
      'Telemetry is disabled via SDK configuration (telemetryEnabled: false)'
    );
  }
}
