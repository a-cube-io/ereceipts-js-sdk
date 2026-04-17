import { EmergencyReportInput, EmergencyReportOutput } from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IMf2EmergencyReportRepository {
  upload(serialNumber: string, input: EmergencyReportInput): Promise<EmergencyReportOutput>;
  findAllBySerialNumber(serialNumber: string, page?: number): Promise<Page<EmergencyReportOutput>>;
  findById(serialNumber: string, id: number): Promise<EmergencyReportOutput>;
}
