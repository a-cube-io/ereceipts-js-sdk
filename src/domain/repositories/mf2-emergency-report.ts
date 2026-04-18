import {
  EmergencyReportInput,
  EmergencyReportOutput,
} from '@/domain/entities/point-of-sale.entity';

export interface IMf2EmergencyReportRepository {
  upload(serialNumber: string, input: EmergencyReportInput): Promise<EmergencyReportOutput>;
  findAllBySerialNumber(serialNumber: string, page?: number): Promise<EmergencyReportOutput[]>;
  findById(serialNumber: string, id: number): Promise<EmergencyReportOutput>;
}
