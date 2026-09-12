import { NoopTelemetryRepository, TelemetryRepositoryImpl } from '@/infrastructure/driven/api';

import { DI_TOKENS } from '../di-container';
import { SDKFactory } from '../sdk-factory';

describe('SDKFactory telemetry wiring', () => {
  const baseConfig = { baseUrl: 'https://example.test' };

  it('registers a NoopTelemetryRepository when telemetryEnabled is unset', async () => {
    const container = SDKFactory.createContainer(baseConfig);
    const repo = container.get(DI_TOKENS.TELEMETRY_REPOSITORY);

    expect(repo).toBeInstanceOf(NoopTelemetryRepository);
    await expect((repo as NoopTelemetryRepository).getTelemetry()).rejects.toMatchObject({
      type: 'TELEMETRY_DISABLED',
    });
  });

  it('registers a NoopTelemetryRepository when telemetryEnabled is false', () => {
    const container = SDKFactory.createContainer({ ...baseConfig, telemetryEnabled: false });
    const repo = container.get(DI_TOKENS.TELEMETRY_REPOSITORY);

    expect(repo).toBeInstanceOf(NoopTelemetryRepository);
  });

  it('registers a real TelemetryRepositoryImpl when telemetryEnabled is true', () => {
    const container = SDKFactory.createContainer({ ...baseConfig, telemetryEnabled: true });
    const repo = container.get(DI_TOKENS.TELEMETRY_REPOSITORY);

    expect(repo).toBeInstanceOf(TelemetryRepositoryImpl);
  });
});
