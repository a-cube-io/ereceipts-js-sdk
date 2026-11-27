import {
  EmergencyReportInput,
  EmergencyReportOutput,
} from '@/domain/entities/point-of-sale.entity';

export interface IMf2EmergencyReportRepository {
  upload(serialNumber: string, input: EmergencyReportInput): Promise<EmergencyReportOutput>;
  findAllBySerialNumber(serialNumber: string, page?: number): Promise<EmergencyReportOutput[]>;
  findById(serialNumber: string, id: number): Promise<EmergencyReportOutput>;
  /** Signed XML of the emergency report */
  download(serialNumber: string, id: number): Promise<string>;
  downloadResult(serialNumber: string, id: number): Promise<string>;
}
