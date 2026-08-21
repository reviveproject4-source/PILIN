export interface ServiceCatalogItem {
  id: string;
  business_id: string;
  nama: string;
  sku: string;
  base_harga: number;
  hpp: number;
  bahan_baku?: string;
}

const DEFAULT_CATALOG: ServiceCatalogItem[] = [
  {
    id: 'srv-00000000-0000-0000-0000-000000000001',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Grooming / Service Standar 01',
    sku: 'SKU-SRV-001',
    base_harga: 75000,
    hpp: 30000,
    bahan_baku: 'Sabun Khusus 50ml, Kain Lap Microfiber 1 pcs'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000002',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Deep Clean & Repaint Premium 02',
    sku: 'SKU-SRV-002',
    base_harga: 120000,
    hpp: 45000,
    bahan_baku: 'Cat Khusus Leather 30ml, Liquid Cleaner 100ml'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000003',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Treatment SPA & Restoration Full 03',
    sku: 'SKU-SRV-003',
    base_harga: 250000,
    hpp: 100000,
    bahan_baku: 'Minyak Pelembab Leather 50ml, Nano Coating Spray 10ml'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000004',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Fast Wash & Express Care 04',
    sku: 'SKU-SRV-004',
    base_harga: 95000,
    hpp: 35000,
    bahan_baku: 'Shampoo Spray 30ml, Microfiber Fast Dry 1 pcs'
  },
];

export class ServiceCatalogService {
  /**
   * Master Service Catalog matching PostgreSQL Migration 00007_services_and_branch_catalog.sql
   */
  private static masterCatalog: ServiceCatalogItem[] = [...DEFAULT_CATALOG];

  static resetDefaultCatalogForTest() {
    this.masterCatalog = [...DEFAULT_CATALOG];
  }

  static loadFromStorage(): ServiceCatalogItem[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pilin_master_catalog');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.masterCatalog = parsed;
            return [...this.masterCatalog];
          }
        }
      } catch (err) {
        console.error('ServiceCatalogService load error:', err);
      }
    }
    return [...this.masterCatalog];
  }

  static saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_master_catalog', JSON.stringify(this.masterCatalog));
      } catch (err) {
        console.error('ServiceCatalogService save error:', err);
      }
    }
  }

  static setMasterCatalog(items: ServiceCatalogItem[]): void {
    this.masterCatalog = [...items];
    this.saveToStorage();
  }

  static getMasterCatalog(): ServiceCatalogItem[] {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
    return [...this.masterCatalog];
  }

  static getServiceById(id: string): ServiceCatalogItem | undefined {
    return this.masterCatalog.find((item) => item.id === id);
  }

  static addMasterService(item: {
    nama: string;
    base_harga: number;
    hpp: number;
    bahan_baku?: string;
  }): ServiceCatalogItem {
    const newItem: ServiceCatalogItem = {
      id: `srv-${Date.now()}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      nama: item.nama,
      sku: `SKU-SRV-${String(this.masterCatalog.length + 1).padStart(3, '0')}`,
      base_harga: item.base_harga,
      hpp: item.hpp,
      bahan_baku: item.bahan_baku || 'Bahan Baku Standar'
    };

    this.masterCatalog.push(newItem);
    this.saveToStorage();
    return newItem;
  }

  /**
   * GD-07 / OD-02: POS Price Override Authority
   * Authorized roles: Tier 3 MANAGER and Tier 2 OWNER. CASHIER and unauthorized roles prohibited.
   * Master catalog base_harga remains untouched and protected.
   */
  static overrideServicePrice(
    serviceId: string,
    overridePrice: number,
    actorRole: string
  ): { serviceId: string; overridePrice: number; masterBasePrice: number } {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized price override: Tier 3 Manager or Tier 2 Owner authority required (GD-07 / OD-02)');
    }

    const service = this.masterCatalog.find(s => s.id === serviceId);
    if (!service) {
      throw new Error('Service item not found in master catalog');
    }

    // Protected master catalog base_harga is preserved without silent mutation
    return {
      serviceId: service.id,
      overridePrice: overridePrice,
      masterBasePrice: service.base_harga,
    };
  }

  static deleteMasterService(serviceId: string): boolean {
    const initialLen = this.masterCatalog.length;
    this.masterCatalog = this.masterCatalog.filter(s => s.id !== serviceId);
    const deleted = this.masterCatalog.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }
}
