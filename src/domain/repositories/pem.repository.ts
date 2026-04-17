import {
  PemCertificates,
  PemCreateInput,
  PemCreateOutput,
  PemUpdateInput,
  PemConfigurationOutput,
} from '@/domain/entities/pem.entity';
import { PointOfSaleMf2 } from '@/domain/entities/point-of-sale.entity';

export interface IPemRepository {
  create(input: PemCreateInput): Promise<PemCreateOutput>;
  findBySerialNumber(serialNumber: string): Promise<PointOfSaleMf2>;
  findAllByMerchant(merchantUuid: string, page?: number): Promise<PointOfSaleMf2[]>;
  getCertificates(serialNumber: string): Promise<PemCertificates>;
  updateConfiguration(serialNumber: string, input: PemUpdateInput): Promise<PemConfigurationOutput>;
  getPEMConfiguration(serialNumber: string): Promise<PemConfigurationOutput>;
  getLogo(serialNumber: string): Promise<ArrayBuffer>;
}
