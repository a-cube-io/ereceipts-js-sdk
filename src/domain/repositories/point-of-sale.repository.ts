import {
  ActivationRequest,
  PEMStatusOfflineRequest,
  PointOfSale,
  PointOfSaleDetailed,
  PointOfSaleListParams,
} from '@/domain/entities/point-of-sale.entity';
import { Page } from '@/domain/value-objects/page.vo';

export interface IPointOfSaleRepository {
  findById(serialNumber: string): Promise<PointOfSaleDetailed>;
  findAll(params?: PointOfSaleListParams): Promise<Page<PointOfSale>>;
  activate(serialNumber: string, input: ActivationRequest): Promise<void>;
  closeJournal(serialNumber: string): Promise<void>;
  createInactivity(serialNumber: string): Promise<void>;
  communicateOffline(serialNumber: string, input: PEMStatusOfflineRequest): Promise<void>;
}
