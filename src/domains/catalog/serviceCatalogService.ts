export interface ServiceCatalogItem {
  id: string;
  business_id: string;
  nama: string;
  sku: string;
  base_harga: number;
  hpp: number;
  hpp_mode?: 'PERCENTAGE' | 'ACTUAL_COST';
  hpp_percent?: number;
  item_type?: 'PRODUCT' | 'SERVICE';
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
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 40,
    item_type: 'SERVICE',
    bahan_baku: 'Sabun Khusus 50ml, Kain Lap Microfiber 1 pcs'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000002',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Deep Clean & Repaint Premium 02',
    sku: 'SKU-SRV-002',
    base_harga: 120000,
    hpp: 45000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    bahan_baku: 'Cat Khusus Leather 30ml, Liquid Cleaner 100ml'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000003',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Treatment SPA & Restoration Full 03',
    sku: 'SKU-SRV-003',
    base_harga: 250000,
    hpp: 100000,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 40,
    item_type: 'SERVICE',
    bahan_baku: 'Minyak Pelembab Leather 50ml, Nano Coating Spray 10ml'
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000004',
    business_id: '00000000-0000-0000-0000-000000000001',
    nama: 'Fast Wash & Express Care 04',
    sku: 'SKU-SRV-004',
    base_harga: 95000,
    hpp: 35000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    bahan_baku: 'Shampoo Spray 30ml, Microfiber Fast Dry 1 pcs'
  },
];

export class ServiceCatalogService {
  /**
   * Master Service Catalog matching PostgreSQL Migration 00007_services_and_branch_catalog.sql & 00049_add_hpp_mode_to_services.sql
   */
  private static masterCatalog: ServiceCatalogItem[] = [];

  static resetDefaultCatalogForTest() {
    this.masterCatalog = [...DEFAULT_CATALOG];
  }

  static loadFromStorage(): ServiceCatalogItem[] {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pilin_master_catalog');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
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

  static getMasterCatalog(isDemo: boolean = false): ServiceCatalogItem[] {
    if (isDemo) {
      return [...DEFAULT_CATALOG];
    }
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
    hpp?: number;
    hpp_mode?: 'PERCENTAGE' | 'ACTUAL_COST';
    hpp_percent?: number;
    item_type?: 'PRODUCT' | 'SERVICE';
    bahan_baku?: string;
  }): ServiceCatalogItem {
    const mode = item.hpp_mode || 'ACTUAL_COST';
    const percent = item.hpp_percent ?? 0;
    const itemType = item.item_type || 'PRODUCT';
    let computedHpp = item.hpp || 0;

    if (mode === 'PERCENTAGE' && percent > 0) {
      computedHpp = Math.round((item.base_harga * percent) / 100);
    }

    const newItem: ServiceCatalogItem = {
      id: `srv-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      nama: item.nama,
      sku: `SKU-SRV-${String(this.masterCatalog.length + 1).padStart(3, '0')}`,
      base_harga: item.base_harga,
      hpp: computedHpp,
      hpp_mode: mode,
      hpp_percent: percent,
      item_type: itemType,
      bahan_baku: item.bahan_baku || (itemType === 'SERVICE' ? 'Jasa Operasional' : 'Bahan Baku Standar')
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

  static updateMasterService(id: string, item: {
    nama?: string;
    base_harga?: number;
    hpp?: number;
    hpp_mode?: 'PERCENTAGE' | 'ACTUAL_COST';
    hpp_percent?: number;
    item_type?: 'PRODUCT' | 'SERVICE';
    bahan_baku?: string;
  }): ServiceCatalogItem | undefined {
    const existing = this.masterCatalog.find((s) => s.id === id);
    if (!existing) return undefined;

    const mode = item.hpp_mode !== undefined ? item.hpp_mode : (existing.hpp_mode || 'ACTUAL_COST');
    const percent = item.hpp_percent !== undefined ? item.hpp_percent : (existing.hpp_percent ?? 0);
    const hargaJual = item.base_harga !== undefined ? item.base_harga : existing.base_harga;
    let computedHpp = item.hpp !== undefined ? item.hpp : existing.hpp;

    if (mode === 'PERCENTAGE' && percent > 0) {
      computedHpp = Math.round((hargaJual * percent) / 100);
    }

    const updatedItem: ServiceCatalogItem = {
      ...existing,
      nama: item.nama !== undefined ? item.nama : existing.nama,
      base_harga: hargaJual,
      hpp: computedHpp,
      hpp_mode: mode,
      hpp_percent: percent,
      item_type: item.item_type !== undefined ? item.item_type : existing.item_type,
      bahan_baku: item.bahan_baku !== undefined ? item.bahan_baku : existing.bahan_baku,
    };

    const idx = this.masterCatalog.findIndex((s) => s.id === id);
    if (idx >= 0) {
      this.masterCatalog[idx] = updatedItem;
      this.saveToStorage();
    }

    return updatedItem;
  }
}
