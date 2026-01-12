export class CertificateValidator {
  static validatePEMFormat(certificate: string, privateKey: string): boolean {
    const certRegex = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/;
    const keyRegex = /-----BEGIN (RSA )?PRIVATE KEY-----[\s\S]*-----END (RSA )?PRIVATE KEY-----/;
    return certRegex.test(certificate) && keyRegex.test(privateKey);
  }

  static isCertificateExpired(validTo: Date): boolean {
    return new Date() > validTo;
  }

  static getDaysUntilExpiry(validTo: Date): number {
    const now = new Date();
    const diffTime = validTo.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
