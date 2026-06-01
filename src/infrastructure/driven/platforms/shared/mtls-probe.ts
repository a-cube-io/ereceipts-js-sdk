export const MTLS_DIAGNOSTIC_PROBE_PATH = '/mf1';

export function buildMtlsDiagnosticProbeUrl(
  baseUrl: string,
  path: string = MTLS_DIAGNOSTIC_PROBE_PATH
): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
