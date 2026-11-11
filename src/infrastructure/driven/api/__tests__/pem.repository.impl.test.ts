import { IHttpPort } from '@/application/ports/driven/http.port';

import { PemRepositoryImpl } from '../pem.repository.impl';

function createHttpMock(): jest.Mocked<IHttpPort> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn().mockResolvedValue({ data: undefined, status: 204, headers: {} }),
    patch: jest.fn(),
    delete: jest.fn().mockResolvedValue({ data: undefined, status: 204, headers: {} }),
    setAuthToken: jest.fn(),
    getAuthToken: jest.fn(),
  };
}

describe('PemRepositoryImpl logo', () => {
  const pngBytes = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  it('updateLogo should PUT the raw PNG bytes with image/png content type', async () => {
    const http = createHttpMock();
    const repository = new PemRepositoryImpl(http);
    const logo = new Uint8Array(pngBytes);

    await repository.updateLogo('E001-000001', { logo });

    expect(http.put).toHaveBeenCalledWith('/mf2/pems/E001-000001/configuration/logo', logo, {
      headers: { 'Content-Type': 'image/png' },
    });
  });

  it('updateLogo should decode a base64 logo before sending it', async () => {
    const http = createHttpMock();
    const repository = new PemRepositoryImpl(http);

    await repository.updateLogo('E001-000001', { logo: 'iVBORw0KGgo=' });

    const body = http.put.mock.calls[0][1] as Uint8Array;
    expect(body).toBeInstanceOf(Uint8Array);
    expect(Array.from(body)).toEqual(pngBytes);
    expect(http.put.mock.calls[0][2]).toEqual({ headers: { 'Content-Type': 'image/png' } });
  });

  it('getLogo should request the logo as arraybuffer', async () => {
    const http = createHttpMock();
    const buffer = new Uint8Array(pngBytes).buffer;
    http.get.mockResolvedValue({ data: buffer, status: 200, headers: {} });
    const repository = new PemRepositoryImpl(http);

    const result = await repository.getLogo('E001-000001');

    expect(http.get).toHaveBeenCalledWith('/mf2/pems/E001-000001/configuration/logo', {
      responseType: 'arraybuffer',
    });
    expect(result).toBe(buffer);
  });

  it('deleteLogo should DELETE the logo', async () => {
    const http = createHttpMock();
    const repository = new PemRepositoryImpl(http);

    await repository.deleteLogo('E001-000001');

    expect(http.delete).toHaveBeenCalledWith('/mf2/pems/E001-000001/configuration/logo');
  });
});
