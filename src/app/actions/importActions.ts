'use server';

import os from 'os';
import path from 'path';
import fs from 'fs';
import { createAdminClient } from '@/lib/supabase/admin';

export interface PersistentCustomerItem {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  address?: string;
  email?: string;
  status?: string;
  totalTrx?: number;
  lastVisit?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PersistentCatalogItem {
  id: string;
  business_id: string;
  nama: string;
  sku: string;
  base_harga: number;
  hpp?: number;
  hpp_mode?: 'PERCENTAGE' | 'ACTUAL_COST';
  item_type?: 'PRODUCT' | 'SERVICE';
  pricing_unit?: string;
  duration_val?: number;
  duration_unit?: 'JAM' | 'HARI' | 'MINGGU';
  duration_hours?: number;
  reminder_days?: number;
  stock_qty?: number;
  stock_alert_threshold?: number;
  bahan_baku?: string;
  created_at?: string;
  updated_at?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'pilin_customers.json');
const CUSTOMERS_TMP = path.join(os.tmpdir(), 'pilin_customers.json');

const CATALOG_FILE = path.join(DATA_DIR, 'pilin_catalogs.json');
const CATALOG_TMP = path.join(os.tmpdir(), 'pilin_catalogs.json');

declare global {
  // eslint-disable-next-line no-var
  var __PILIN_CUSTOMERS__: PersistentCustomerItem[] | undefined;
  // eslint-disable-next-line no-var
  var __PILIN_CATALOGS__: PersistentCatalogItem[] | undefined;
}

// ==========================================
// CUSTOMER PERSISTENCE
// ==========================================

function loadCustomersFromFile(): PersistentCustomerItem[] {
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const raw = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    if (fs.existsSync(CUSTOMERS_TMP)) {
      const raw = fs.readFileSync(CUSTOMERS_TMP, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback empty
  }
  return [];
}

function saveCustomersToFile(list: PersistentCustomerItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // ignore
  }
  try {
    fs.writeFileSync(CUSTOMERS_TMP, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

export async function getLiveCustomersAction(businessId: string): Promise<PersistentCustomerItem[]> {
  const allCustomers = loadCustomersFromFile();
  global.__PILIN_CUSTOMERS__ = allCustomers;
  if (!allCustomers || allCustomers.length === 0) {
    return [];
  }
  const filtered = allCustomers.filter(c => c.business_id === businessId || businessId === 'ALL');
  return filtered.length > 0 ? filtered : allCustomers;
}

export async function saveImportedCustomersAction(
  businessId: string,
  customers: PersistentCustomerItem[]
): Promise<{ success: boolean; total: number; message?: string }> {
  try {
    const existingList = loadCustomersFromFile();
    const phoneMap = new Map<string, PersistentCustomerItem>();

    existingList.forEach(c => {
      if (c && c.phone) phoneMap.set(c.phone, c);
    });

    customers.forEach(incoming => {
      if (!incoming || !incoming.phone) return;
      const prev = phoneMap.get(incoming.phone);
      phoneMap.set(incoming.phone, {
        id: incoming.id || prev?.id || `cust-${Date.now()}`,
        business_id: businessId || prev?.business_id || '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
        name: incoming.name || prev?.name || 'Pelanggan',
        phone: incoming.phone,
        address: incoming.address || prev?.address || '',
        email: incoming.email || prev?.email || '',
        status: incoming.status || prev?.status || 'REPEAT',
        totalTrx: incoming.totalTrx ?? prev?.totalTrx ?? 1,
        lastVisit: incoming.lastVisit || prev?.lastVisit || new Date().toISOString().substring(0, 10),
        created_at: prev?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    const knownBizIds = ['8ec99d6e-3f6f-47d4-910f-265cfe26c609', 'demo-tenant', 'tenant-001', 'trio-r-laundry'];
    if (businessId && !knownBizIds.includes(businessId)) {
      knownBizIds.push(businessId);
    }

    const finalList: PersistentCustomerItem[] = [];
    phoneMap.forEach(item => {
      knownBizIds.forEach(bId => {
        finalList.push({
          ...item,
          business_id: bId,
        });
      });
    });

    global.__PILIN_CUSTOMERS__ = finalList;
    saveCustomersToFile(finalList);

    return { success: true, total: phoneMap.size };
  } catch (err: any) {
    return { success: false, total: 0, message: err?.message };
  }
}

// ==========================================
// CATALOG PERSISTENCE
// ==========================================

function loadCatalogFromFile(): PersistentCatalogItem[] {
  try {
    if (fs.existsSync(CATALOG_FILE)) {
      const raw = fs.readFileSync(CATALOG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    if (fs.existsSync(CATALOG_TMP)) {
      const raw = fs.readFileSync(CATALOG_TMP, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback empty
  }
  return [];
}

function saveCatalogToFile(list: PersistentCatalogItem[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CATALOG_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // ignore
  }
  try {
    fs.writeFileSync(CATALOG_TMP, JSON.stringify(list, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

export async function getLiveCatalogAction(businessId: string): Promise<PersistentCatalogItem[]> {
  if (!global.__PILIN_CATALOGS__) {
    global.__PILIN_CATALOGS__ = loadCatalogFromFile();
  }
  return global.__PILIN_CATALOGS__.filter(c => c.business_id === businessId || businessId === 'ALL');
}

export async function saveImportedCatalogAction(
  businessId: string,
  catalogItems: PersistentCatalogItem[]
): Promise<{ success: boolean; total: number; message?: string }> {
  try {
    if (!global.__PILIN_CATALOGS__) {
      global.__PILIN_CATALOGS__ = loadCatalogFromFile();
    }

    const currentMap = new Map<string, PersistentCatalogItem>();
    global.__PILIN_CATALOGS__.forEach(c => currentMap.set(`${c.business_id}_${c.nama.toLowerCase()}`, c));

    catalogItems.forEach(incoming => {
      const key = `${businessId}_${incoming.nama.toLowerCase()}`;
      const existing = currentMap.get(key);
      if (existing) {
        currentMap.set(key, {
          ...existing,
          ...incoming,
          business_id: businessId,
          updated_at: new Date().toISOString(),
        });
      } else {
        currentMap.set(key, {
          ...incoming,
          business_id: businessId,
          created_at: incoming.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    const updatedList = Array.from(currentMap.values());
    global.__PILIN_CATALOGS__ = updatedList;
    saveCatalogToFile(updatedList);

    // Try Supabase sync
    try {
      const supabase = createAdminClient();
      for (const item of catalogItems) {
        await supabase.from('service_catalog').upsert({
          business_id: businessId,
          nama: item.nama,
          sku: item.sku,
          base_harga: item.base_harga,
          hpp: item.hpp,
          item_type: item.item_type || 'SERVICE',
          pricing_unit: item.pricing_unit,
        }, { onConflict: 'business_id,nama' });
      }
    } catch {
      // safe fallback
    }

    return { success: true, total: updatedList.filter(c => c.business_id === businessId).length };
  } catch (err: any) {
    return { success: false, total: 0, message: err?.message };
  }
}
