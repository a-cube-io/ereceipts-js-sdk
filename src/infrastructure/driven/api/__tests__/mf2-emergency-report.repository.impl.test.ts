import { IHttpPort } from '@/application/ports/driven/http.port';

import { Mf2EmergencyReportRepositoryImpl } from '../mf2-emergency-report.repository.impl';

function createHttpMock(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn().mockResolvedValue({ data: '<xml/>', status: 200, headers: {} }),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

describe('Mf2EmergencyReportRepositoryImpl', () => {
  const serialNumber = 'E001-000001';

  it.each([
    ['download', 'download'],
    ['downloadResult', 'result'],
  ] as const)('%s should GET the XML as text', async (method, suffix) => {
    const http = createHttpMock();
    const repository = new Mf2EmergencyReportRepositoryImpl(http);

    const result = await repository[method](serialNumber, 42);

    expect(http.get).toHaveBeenCalledWith(
      `/mf2/pems/${serialNumber}/emergency-reports/42/${suffix}`,
      { headers: { Accept: 'application/xml' }, responseType: 'text' }
    );
    expect(result).toBe('<xml/>');
  });
});
