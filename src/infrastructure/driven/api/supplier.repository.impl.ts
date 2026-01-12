import { SupplierApiOutput, SupplierMapper } from '@/application/dto/supplier.dto';
import { IHttpPort } from '@/application/ports/driven/http.port';
import {
  Supplier,
  SupplierCreateInput,
  SupplierUpdateInput,
  SuppliersParams,
} from '@/domain/entities/supplier.entity';
import { ISupplierRepository } from '@/domain/repositories/supplier.repository';
import { Page } from '@/domain/value-objects/page.vo';

export class SupplierRepositoryImpl implements ISupplierRepository {
  constructor(private readonly http: IHttpPort) {}

  async create(merchantUuid: string, input: SupplierCreateInput): Promise<Supplier> {
    const apiInput = SupplierMapper.toCreateApiInput(input);
    const response = await this.http.post<SupplierApiOutput>(
      `/mf2/merchants/${merchantUuid}/suppliers`,
      apiInput
    );
    return SupplierMapper.fromApiOutput(response.data);
  }

  async findById(merchantUuid: string, supplierUuid: string): Promise<Supplier> {
    const response = await this.http.get<SupplierApiOutput>(
      `/mf2/merchants/${merchantUuid}/suppliers/${supplierUuid}`
    );
    return SupplierMapper.fromApiOutput(response.data);
  }

  async findAll(merchantUuid: string, params?: SuppliersParams): Promise<Page<Supplier>> {
    const response = await this.http.get<Page<SupplierApiOutput>>(
      `/mf2/merchants/${merchantUuid}/suppliers`,
      { params: { page: params?.page } }
    );
    return SupplierMapper.pageFromApi(response.data);
  }

  async update(
    merchantUuid: string,
    supplierUuid: string,
    input: SupplierUpdateInput
  ): Promise<Supplier> {
    const apiInput = SupplierMapper.toUpdateApiInput(input);
    const response = await this.http.patch<SupplierApiOutput>(
      `/mf2/merchants/${merchantUuid}/suppliers/${supplierUuid}`,
      apiInput
    );
    return SupplierMapper.fromApiOutput(response.data);
  }

  async delete(merchantUuid: string, supplierUuid: string): Promise<void> {
    await this.http.delete(`/mf2/merchants/${merchantUuid}/suppliers/${supplierUuid}`);
  }
}
