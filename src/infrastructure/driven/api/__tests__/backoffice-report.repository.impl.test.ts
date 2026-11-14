import { IHttpPort } from '@/application/ports/driven/http.port';

import { BackofficeReportRepositoryImpl } from '../backoffice-report.repository.impl';

const queuedOutput = { request_uuid: 'request-uuid' };

function createHttpMock(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn().mockResolvedValue({ data: queuedOutput, status: 202, headers: {} }),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

describe('BackofficeReportRepositoryImpl', () => {
  const serialNumber = 'E001-000001';
  const base = `/mf1/pems/${serialNumber}/backoffice-reports`;

  it('queueDiagnostics should POST to /diagnostics', async () => {
    const http = createHttpMock();
    const repository = new BackofficeReportRepositoryImpl(http);

    const result = await repository.queueDiagnostics(serialNumber);

    expect(http.post).toHaveBeenCalledWith(`${base}/diagnostics`);
    expect(result).toEqual({ requestUuid: 'request-uuid' });
  });

  it('queueJournalReading should POST to /journal-reading', async () => {
    const http = createHttpMock();
    const repository = new BackofficeReportRepositoryImpl(http);

    await repository.queueJournalReading(serialNumber);

    expect(http.post).toHaveBeenCalledWith(`${base}/journal-reading`);
  });

  it('queueReceiptsReport should POST a summary report to /receipts', async () => {
    const http = createHttpMock();
    const repository = new BackofficeReportRepositoryImpl(http);

    const result = await repository.queueReceiptsReport(serialNumber, {
      type: 'summary',
      filterBy: { startingDate: '2026-11-01', endingDate: '2026-11-10' },
    });

    expect(http.post).toHaveBeenCalledWith(`${base}/receipts`, {
      type: 'summary',
      filter_by: { starting_date: '2026-11-01', ending_date: '2026-11-10' },
    });
    expect(result).toEqual({ requestUuid: 'request-uuid' });
  });

  it('downloadPdf should request the PDF as arraybuffer', async () => {
    const http = createHttpMock();
    const pdf = new ArrayBuffer(4);
    http.get.mockResolvedValue({ data: pdf, status: 200, headers: {} });
    const repository = new BackofficeReportRepositoryImpl(http);

    const result = await repository.downloadPdf(serialNumber, 'report-uuid');

    expect(http.get).toHaveBeenCalledWith(`${base}/report-uuid/pdf`, {
      headers: { Accept: 'application/pdf' },
      responseType: 'arraybuffer',
    });
    expect(result).toBe(pdf);
  });
});
