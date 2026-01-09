import { PemCertificates, PemCreateInput, PemCreateOutput } from '@/domain/entities/pem.entity';
import { PointOfSaleMf2 } from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IPemRepository {
  create(input: PemCreateInput): Promise<PemCreateOutput>;
  findBySerialNumber(serialNumber: string): Promise<PointOfSaleMf2>;
  findAllByMerchant(merchantUuid: string, page?: number): Promise<Page<PointOfSaleMf2>>;
  getCertificates(serialNumber: string): Promise<PemCertificates>;
}
