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
  reminder_days?: number; // Customizable cycle days: 30, 45, 60, 90, or custom days
  stock_alert_threshold?: number; // Min threshold for low stock alert to owner
  stock_qty?: number; // Current on-hand quantity
}

const DEFAULT_CATALOG: ServiceCatalogItem[] = [
  {
    id: 'srv-00000000-0000-0000-0000-000000000001',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Cuci & Perawatan Standar Sepatu',
    sku: 'SKU-JASA-001',
    base_harga: 75000,
    hpp: 25000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    bahan_baku: 'Sabun Khusus Sepatu 50ml, Microfiber 1 pcs',
    reminder_days: 30,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000002',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Deep Clean & Repaint Tas Kulit Premium',
    sku: 'SKU-JASA-002',
    base_harga: 150000,
    hpp: 45000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    bahan_baku: 'Cat Khusus Leather 30ml, Liquid Cleaner 100ml',
    reminder_days: 60,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000003',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Treatment SPA & Restoration Full Tas/Sepatu',
    sku: 'SKU-JASA-003',
    base_harga: 250000,
    hpp: 80000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    bahan_baku: 'Minyak Pelembab Leather 50ml, Nano Coating Spray 10ml',
    reminder_days: 90,
  },
  {
    id: 'prod-00000000-0000-0000-0000-000000000004',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Sabun Pembersih Sepatu & Tas 250ml (Retail)',
    sku: 'SKU-RETAIL-001',
    base_harga: 65000,
    hpp: 32500,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 50,
    item_type: 'PRODUCT',
    bahan_baku: 'Kemasan Botol 250ml + Formula Sabun Organik',
    reminder_days: 30, // Estimasi habis dalam 30 hari
    stock_qty: 3, // Low stock sample!
    stock_alert_threshold: 5,
  },
  {
    id: 'prod-00000000-0000-0000-0000-000000000005',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Nano Waterproofing Spray 150ml (Retail)',
    sku: 'SKU-RETAIL-002',
    base_harga: 85000,
    hpp: 42500,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 50,
    item_type: 'PRODUCT',
    bahan_baku: 'Kaleng Aerosol 150ml Anti Air',
    reminder_days: 45, // Estimasi habis dalam 45 hari
    stock_qty: 14,
    stock_alert_threshold: 5,
  },
];

export class ServiceCatalogService {
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
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.masterCatalog = parsed;
            return [...this.masterCatalog];
          }
        }
      } catch (err) {
        console.error('ServiceCatalogService load error:', err);
      }
    }
    this.masterCatalog = [...DEFAULT_CATALOG];
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

  static getMasterCatalog(): ServiceCatalogItem[] {
    if (this.masterCatalog.length === 0) {
      return this.loadFromStorage();
    }
    return [...this.masterCatalog];
  }

  static getServiceById(id: string): ServiceCatalogItem | undefined {
    return this.getMasterCatalog().find((s) => s.id === id);
  }

  static addMasterService(
    service: Omit<ServiceCatalogItem, 'id' | 'sku' | 'business_id' | 'hpp'> & {
      hpp?: number;
      business_id?: string;
    }
  ): ServiceCatalogItem {
    const catalog = this.getMasterCatalog();
    const prefix = service.item_type === 'PRODUCT' ? 'SKU-RETAIL' : 'SKU-JASA';
    const nextNum = (catalog.length + 1).toString().padStart(3, '0');
    
    let computedHpp = service.hpp ?? 0;
    if (service.hpp === undefined && service.hpp_mode === 'PERCENTAGE' && service.hpp_percent) {
      computedHpp = Math.round((service.base_harga * service.hpp_percent) / 100);
    }

    const newService: ServiceCatalogItem = {
      ...service,
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: service.business_id || '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      sku: `${prefix}-${nextNum}`,
      hpp: computedHpp,
      item_type: service.item_type || 'SERVICE',
      reminder_days: service.reminder_days || 30,
      stock_qty: service.stock_qty !== undefined ? service.stock_qty : 0,
      stock_alert_threshold: service.stock_alert_threshold !== undefined ? service.stock_alert_threshold : 5,
    };
    catalog.push(newService);
    this.masterCatalog = catalog;
    this.saveToStorage();
    return newService;
  }

  static overrideServicePrice(
    serviceId: string,
    overridePrice: number,
    actorRole: string
  ): { serviceId: string; overridePrice: number; masterBasePrice: number } {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized price override: Tier 3 Manager or Tier 2 Owner authority required (GD-07 / OD-02)');
    }

    const service = this.getMasterCatalog().find((s) => s.id === serviceId);
    if (!service) {
      throw new Error('Service item not found in master catalog');
    }

    return {
      serviceId: service.id,
      overridePrice: overridePrice,
      masterBasePrice: service.base_harga,
    };
  }

  static updateMasterService(
    id: string,
    updates: Partial<Omit<ServiceCatalogItem, 'id' | 'sku' | 'business_id'>>
  ): ServiceCatalogItem | null {
    const catalog = this.getMasterCatalog();
    const idx = catalog.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated = {
      ...catalog[idx],
      ...updates,
    };
    catalog[idx] = updated;
    this.masterCatalog = catalog;
    this.saveToStorage();
    return updated;
  }

  static deleteMasterService(id: string): boolean {
    const catalog = this.getMasterCatalog();
    const filtered = catalog.filter((s) => s.id !== id);
    if (filtered.length !== catalog.length) {
      this.masterCatalog = filtered;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  static getStockAlertItems(): ServiceCatalogItem[] {
    const catalog = this.getMasterCatalog();
    return catalog.filter(
      (item) =>
        item.item_type === 'PRODUCT' &&
        item.stock_alert_threshold !== undefined &&
        item.stock_alert_threshold > 0 &&
        (item.stock_qty ?? 0) <= item.stock_alert_threshold
    );
  }
}
