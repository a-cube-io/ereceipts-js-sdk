import { TelemetryApiOutput, TelemetryMapper } from '@/application/dto/telemetry.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import { Telemetry } from '@/domain/entities/telemetry.entity';
import { ITelemetryRepository } from '@/domain/repositories/telemetry.repository';

export class TelemetryRepositoryImpl implements ITelemetryRepository {
  constructor(private readonly http: IHttpPort) {}

  async getTelemetry(pemId: string): Promise<Telemetry> {
    const response = await this.http.get<TelemetryApiOutput>(
      `/mf1/point-of-sales/${pemId}/telemetry`
    );
    return TelemetryMapper.fromApiOutput(response.data);
  }
}
