export type PricingUnit =
  | 'unit'
  | 'pc'
  | 'sepasang'
  | 'stel'
  | 'lembar'
  | 'barang'
  | 'paket'
  | 'm2'
  | 'helai'
  | 'cm'
  | 'gram'
  | 'kg'
  | 'set';

export type DurationUnit = 'JAM' | 'HARI' | 'MINGGU';

export function durationToHours(val: number = 1, unit: DurationUnit = 'HARI'): number {
  if (unit === 'JAM') return Math.max(1, Math.round(val));
  if (unit === 'MINGGU') return Math.max(1, Math.round(val * 24 * 7));
  return Math.max(1, Math.round(val * 24)); // HARI
}

export function formatDurationLabel(val?: number, unit?: DurationUnit): string {
  if (!val) return '-';
  const u = unit ? unit.toLowerCase() : 'hari';
  return `${val} ${u.charAt(0).toUpperCase() + u.slice(1)}`;
}

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
  pricing_unit?: PricingUnit | string; // unit/pc/sepasang/stel/lembar/barang/paket/m2/helai/cm/gram/set
  duration_val?: number; // Nilai durasi fleksibel (bebas diatur owner)
  duration_unit?: DurationUnit; // 'JAM' | 'HARI' | 'MINGGU'
  bahan_baku?: string;
  reminder_days?: number; // Customizable cycle days: 30, 45, 60, 90, or custom days
  stock_alert_threshold?: number; // Min threshold for low stock alert to owner
  stock_qty?: number; // Current on-hand quantity
  duration_hours?: number; // Estimasi Waktu Selesai Pengerjaan dalam Jam
}

const DEFAULT_CATALOG: ServiceCatalogItem[] = [
  {
    id: 'srv-00000000-0000-0000-0000-000000000001',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Cuci Kiloan Reguler (Cuci Kering Setrika)',
    sku: 'SKU-JASA-001',
    base_harga: 8000,
    hpp: 3000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'kg',
    duration_val: 2,
    duration_unit: 'HARI',
    bahan_baku: 'Deterjen Cair 30ml, Pewangi 20ml, Plastik Packing 1 lbr',
    reminder_days: 14,
    duration_hours: 48,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000002',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Cuci Kiloan Express 24 Jam',
    sku: 'SKU-JASA-002',
    base_harga: 12000,
    hpp: 4500,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'kg',
    duration_val: 1,
    duration_unit: 'HARI',
    bahan_baku: 'Deterjen Cepat Bersih, Parfum Laundry Grade A, Plastik',
    reminder_days: 14,
    duration_hours: 24,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000003',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Cuci Bed Cover King / Jumbo',
    sku: 'SKU-JASA-003',
    base_harga: 35000,
    hpp: 12000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'pc',
    duration_val: 2,
    duration_unit: 'HARI',
    bahan_baku: 'Deterjen Khusus Bed Cover + Pelembut Wangi',
    reminder_days: 30,
    duration_hours: 48,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000004',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Dry Clean Jas & Celana Formal',
    sku: 'SKU-JASA-004',
    base_harga: 50000,
    hpp: 15000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'stel',
    duration_val: 3,
    duration_unit: 'HARI',
    bahan_baku: 'Chemical Dry Clean + Hanger Jas + Cover Plastik',
    reminder_days: 30,
    duration_hours: 72,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000005',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Jas Hujan 1 set',
    sku: 'SKU-JASA-005',
    base_harga: 20000,
    hpp: 7000,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'stel',
    duration_val: 2,
    duration_unit: 'HARI',
    bahan_baku: 'Sabun Khusus Parasut',
    reminder_days: 30,
    duration_hours: 48,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000006',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Dress / Blouse Panjang',
    sku: 'SKU-JASA-006',
    base_harga: 30000,
    hpp: 10500,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'pc',
    duration_val: 2,
    duration_unit: 'HARI',
    bahan_baku: 'Deterjen Sutra/Chiffon',
    reminder_days: 30,
    duration_hours: 48,
  },
  {
    id: 'srv-00000000-0000-0000-0000-000000000007',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Cuci Setrika Khusus',
    sku: 'SKU-JASA-007',
    base_harga: 12500,
    hpp: 4375,
    hpp_mode: 'ACTUAL_COST',
    hpp_percent: 0,
    item_type: 'SERVICE',
    pricing_unit: 'kg',
    duration_val: 3,
    duration_unit: 'HARI',
    bahan_baku: 'Deterjen Wangi Premium + Pelicin Setrika',
    reminder_days: 14,
    duration_hours: 72,
  },
  {
    id: 'prod-00000000-0000-0000-0000-000000000008',
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    nama: 'Parfum Laundry Premium 250ml',
    sku: 'SKU-RETAIL-001',
    base_harga: 35000,
    hpp: 18000,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 50,
    item_type: 'PRODUCT',
    pricing_unit: 'pc',
    bahan_baku: 'Botol Spray 250ml + Konsentrat Aroma Lily',
    reminder_days: 45,
    stock_qty: 24,
    stock_alert_threshold: 5,
  },
];

export class ServiceCatalogService {
  private static masterCatalog: ServiceCatalogItem[] = [];
  private static tenantCatalogs: Map<string, ServiceCatalogItem[]> = new Map();

  static resetDefaultCatalogForTest() {
    this.masterCatalog = [...DEFAULT_CATALOG];
    this.tenantCatalogs.clear();
  }

  static getDefaultCatalogForDemo(): ServiceCatalogItem[] {
    return [...DEFAULT_CATALOG];
  }

  private static resolveBusinessId(businessId?: string): string {
    if (businessId && businessId.trim()) return businessId.trim();
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pilin_tenant_onboarding');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.businessId) return parsed.businessId;
        }
      } catch {}
    }
    return '8ec99d6e-3f6f-47d4-910f-265cfe26c609';
  }

  static loadFromStorage(businessId?: string): ServiceCatalogItem[] {
    const bizId = this.resolveBusinessId(businessId);

    if (typeof window !== 'undefined') {
      try {
        // Dedicated namespaced key per tenant to prevent cross-tenant data leakage
        const storageKey = `pilin_master_catalog_${bizId}`;
        const saved = localStorage.getItem(storageKey);

        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Strictly enforce tenant isolation: filter by business_id
            const tenantItems = parsed.filter(item => item.business_id === bizId);
            if (tenantItems.length > 0) {
              this.tenantCatalogs.set(bizId, tenantItems);
              return [...tenantItems];
            }
          }
        }

        const isDemo = localStorage.getItem('pilin_demo_mode') === 'true' || bizId === 'demo-tenant';
        if (isDemo) {
          const demoItems = [...DEFAULT_CATALOG];
          this.tenantCatalogs.set(bizId, demoItems);
          return [...demoItems];
        }

        // Backward compatibility ONLY for Bengkel Tas Sepatu
        if (bizId === '8ec99d6e-3f6f-47d4-910f-265cfe26c609') {
          const legacySaved = localStorage.getItem('pilin_master_catalog');
          if (legacySaved !== null) {
            const parsed = JSON.parse(legacySaved);
            if (Array.isArray(parsed)) {
              const liveItems = parsed
                .filter(item => item.business_id === bizId || (!item.id.startsWith('srv-00000000-') && !item.id.startsWith('prod-00000000-')))
                .map(item => ({ ...item, business_id: bizId }));
              this.tenantCatalogs.set(bizId, liveItems);
              localStorage.setItem(storageKey, JSON.stringify(liveItems));
              return [...liveItems];
            }
          }
          // Seed Bengkel Tas Sepatu default catalog if pristine
          const bengkelItems = DEFAULT_CATALOG.filter(i => i.business_id === bizId);
          this.tenantCatalogs.set(bizId, bengkelItems);
          localStorage.setItem(storageKey, JSON.stringify(bengkelItems));
          return [...bengkelItems];
        }

        // STRICT UNIVERSAL ISOLATION:
        // Any new or other tenant starts 100% EMPTY! ZERO cross-tenant leakage!
        this.tenantCatalogs.set(bizId, []);
        return [];
      } catch (err) {
        console.error('ServiceCatalogService load error:', err);
      }
    }

    // Node / server environment fallback for unit tests
    if (this.tenantCatalogs.has(bizId)) {
      return [...(this.tenantCatalogs.get(bizId) || [])];
    }
    if (this.masterCatalog.length === 0) {
      this.masterCatalog = [...DEFAULT_CATALOG];
    }
    return [...this.masterCatalog];
  }

  static saveToStorage(businessId?: string): void {
    const bizId = this.resolveBusinessId(businessId);
    const items = this.tenantCatalogs.get(bizId) || this.masterCatalog;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pilin_master_catalog_${bizId}`, JSON.stringify(items));
      } catch (err) {
        console.error('ServiceCatalogService save error:', err);
      }
    }
  }

  static getMasterCatalog(businessId?: string): ServiceCatalogItem[] {
    return this.loadFromStorage(businessId);
  }

  static getServiceById(id: string, businessId?: string): ServiceCatalogItem | undefined {
    return this.getMasterCatalog(businessId).find((s) => s.id === id);
  }

  static addMasterService(
    service: Omit<ServiceCatalogItem, 'id' | 'sku' | 'business_id' | 'hpp'> & {
      hpp?: number;
      business_id?: string;
      sku?: string;
    },
    businessId?: string
  ): ServiceCatalogItem {
    const bizId = service.business_id || this.resolveBusinessId(businessId);
    const catalog = this.getMasterCatalog(bizId);
    const prefix = service.item_type === 'PRODUCT' ? 'SKU-RETAIL' : 'SKU-JASA';
    const nextNum = (catalog.length + 1).toString().padStart(3, '0');
    
    let computedHpp = service.hpp ?? 0;
    if (service.hpp === undefined && service.hpp_mode === 'PERCENTAGE' && service.hpp_percent) {
      computedHpp = Math.round((service.base_harga * service.hpp_percent) / 100);
    }

    const durationVal = service.duration_val ?? (service.duration_hours ? Math.max(1, Math.round(service.duration_hours / 24)) : 1);
    const durationUnit = service.duration_unit ?? (service.duration_hours && service.duration_hours < 24 ? 'JAM' : 'HARI');
    const computedHours = service.duration_hours ?? (service.item_type === 'PRODUCT' ? undefined : durationToHours(durationVal, durationUnit));

    const newService: ServiceCatalogItem = {
      ...service,
      id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: bizId,
      sku: service.sku || `${prefix}-${nextNum}`,
      hpp: computedHpp,
      item_type: service.item_type || 'SERVICE',
      pricing_unit: service.pricing_unit || (service.item_type === 'PRODUCT' ? 'pc' : 'sepasang'),
      duration_val: service.item_type === 'PRODUCT' ? undefined : durationVal,
      duration_unit: service.item_type === 'PRODUCT' ? undefined : durationUnit,
      duration_hours: computedHours,
      reminder_days: service.reminder_days || 30,
      stock_qty: service.stock_qty !== undefined ? service.stock_qty : 0,
      stock_alert_threshold: service.stock_alert_threshold !== undefined ? service.stock_alert_threshold : 5,
    };
    catalog.push(newService);
    this.tenantCatalogs.set(bizId, catalog);
    this.masterCatalog = catalog;
    this.saveToStorage(bizId);
    return newService;
  }

  static overrideServicePrice(
    serviceId: string,
    overridePrice: number,
    actorRole: string,
    businessId?: string
  ): { serviceId: string; overridePrice: number; masterBasePrice: number } {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized price override: Tier 3 Manager or Tier 2 Owner authority required (GD-07 / OD-02)');
    }

    const service = this.getMasterCatalog(businessId).find((s) => s.id === serviceId);
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
    updates: Partial<Omit<ServiceCatalogItem, 'id' | 'sku' | 'business_id'>>,
    businessId?: string
  ): ServiceCatalogItem | null {
    const bizId = this.resolveBusinessId(businessId);
    const catalog = this.getMasterCatalog(bizId);
    const idx = catalog.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated = {
      ...catalog[idx],
      ...updates,
      business_id: bizId,
    };
    catalog[idx] = updated;
    this.tenantCatalogs.set(bizId, catalog);
    this.masterCatalog = catalog;
    this.saveToStorage(bizId);
    return updated;
  }

  static deleteMasterService(id: string, businessId?: string): boolean {
    const bizId = this.resolveBusinessId(businessId);
    const catalog = this.getMasterCatalog(bizId);
    const filtered = catalog.filter((s) => s.id !== id);
    if (filtered.length !== catalog.length) {
      this.tenantCatalogs.set(bizId, filtered);
      this.masterCatalog = filtered;
      this.saveToStorage(bizId);
      return true;
    }
    return false;
  }

  static getStockAlertItems(businessId?: string): ServiceCatalogItem[] {
    const catalog = this.getMasterCatalog(businessId);
    return catalog.filter(
      (item) =>
        item.item_type === 'PRODUCT' &&
        item.stock_alert_threshold !== undefined &&
        item.stock_alert_threshold > 0 &&
        (item.stock_qty ?? 0) <= item.stock_alert_threshold
    );
  }
}
