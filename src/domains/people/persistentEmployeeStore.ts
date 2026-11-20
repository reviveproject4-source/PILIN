import os from 'os';
import path from 'path';
import fs from 'fs';
import { Employee } from './people.types';
import { createAdminClient } from '@/lib/supabase/admin';

const DATA_DIR = path.join(process.cwd(), 'data');
const PERSISTENT_FILE = path.join(DATA_DIR, 'pilin_employees.json');
const TMP_FILE = path.join(os.tmpdir(), 'pilin_employees.json');

declare global {
  // eslint-disable-next-line no-var
  var __PILIN_PERSISTENT_EMPLOYEES__: Employee[] | undefined;
}

export class PersistentEmployeeStore {
  private static loadFromFile(): Employee[] {
    const map = new Map<string, Employee>();

    // 1. Try persistent file
    try {
      if (fs.existsSync(PERSISTENT_FILE)) {
        const raw = fs.readFileSync(PERSISTENT_FILE, 'utf8');
        const parsed: Employee[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(e => map.set(e.id, e));
        }
      }
    } catch (err) {
      console.warn('Failed reading persistent employees file:', err);
    }

    // 2. Try tmp file
    try {
      if (fs.existsSync(TMP_FILE)) {
        const raw = fs.readFileSync(TMP_FILE, 'utf8');
        const parsed: Employee[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(e => {
            if (!map.has(e.id)) map.set(e.id, e);
          });
        }
      }
    } catch (err) {
      console.warn('Failed reading tmp employees file:', err);
    }

    // Default Seed for Bengkel Tas Sepatu & Registered Salon Spokat Kasir
    const bengkelBusinessId = '8ec99d6e-3f6f-47d4-910f-265cfe26c609';

    if (!Array.from(map.values()).some(e => e.email?.toLowerCase() === 'salonspokat@gmail.com')) {
      const salonSpokatKasir: Employee = {
        id: 'emp-kasir-salonspokat',
        business_id: bengkelBusinessId,
        employee_code: 'KASIR-SPOKAT',
        full_name: 'Kasir Salon Spokat',
        nickname: 'Kasir Spokat',
        phone: '081280320999',
        email: 'salonspokat@gmail.com',
        employment_status: 'ACTIVE',
        branch_name: 'Cabang Utama Bengkel Tas Sepatu',
        division_name: 'Operasional Kasir',
        position_name: 'Kasir',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      map.set(salonSpokatKasir.id, salonSpokatKasir);
    } else {
      // Pastikan nomor HP kasir tidak bertabrakan dengan nomor HP Owner (081280320505)
      for (const emp of map.values()) {
        if (emp.email?.toLowerCase() === 'salonspokat@gmail.com' && emp.phone?.includes('081280320505')) {
          emp.phone = '081280320999';
        }
      }
    }

    // Pastikan akun Owner (bengkeltassepatu@gmail.com) TIDAK terdaftar di Master Pegawai
    for (const [id, emp] of map.entries()) {
      if (emp.email?.toLowerCase() === 'bengkeltassepatu@gmail.com') {
        map.delete(id);
      }
    }

    const result = Array.from(map.values());
    this.saveToFile(result);
    return result;
  }

  private static saveToFile(records: Employee[]) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PERSISTENT_FILE, JSON.stringify(records, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed writing persistent employees file:', e);
    }

    try {
      fs.writeFileSync(TMP_FILE, JSON.stringify(records, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed writing tmp employees file:', e);
    }
  }

  private static getStore(): Employee[] {
    if (!globalThis.__PILIN_PERSISTENT_EMPLOYEES__) {
      globalThis.__PILIN_PERSISTENT_EMPLOYEES__ = this.loadFromFile();
    }
    return globalThis.__PILIN_PERSISTENT_EMPLOYEES__;
  }

  static listAll(): Employee[] {
    return this.getStore();
  }

  static listByBusinessId(businessId: string): Employee[] {
    const all = this.getStore();
    return all.filter(e => e.business_id === businessId || businessId === 'all');
  }

  static findByIdentifier(identifier: string, businessId?: string): Employee | null {
    const clean = (identifier || '').trim().toLowerCase();
    if (!clean) return null;

    const digits = clean.replace(/[^0-9]/g, '');
    const all = this.getStore();

    return all.find(e => {
      if (businessId && e.business_id !== businessId && businessId !== 'all') {
        // allow fallback match if email is exact
      }
      if (e.email && e.email.trim().toLowerCase() === clean) return true;
      if (e.employee_code && e.employee_code.trim().toLowerCase() === clean) return true;
      if (e.phone) {
        const pDigits = e.phone.replace(/[^0-9]/g, '');
        if (digits && (pDigits === digits || pDigits.endsWith(digits) || digits.endsWith(pDigits))) return true;
      }
      return false;
    }) || null;
  }

  static save(emp: Employee): Employee {
    const store = this.getStore();
    const cleanEmail = (emp.email || '').trim().toLowerCase();
    const cleanCode = (emp.employee_code || '').trim().toUpperCase();

    const idx = store.findIndex(e => 
      e.id === emp.id || 
      (cleanCode && e.employee_code === cleanCode) ||
      (cleanEmail && e.email && e.email.toLowerCase() === cleanEmail)
    );

    if (idx >= 0) {
      store[idx] = { ...store[idx], ...emp, updated_at: new Date().toISOString() };
    } else {
      store.unshift({ ...emp, updated_at: new Date().toISOString() });
    }

    this.saveToFile(store);
    return emp;
  }

  static delete(id: string, businessId?: string): boolean {
    const store = this.getStore();
    const filtered = store.filter(e => {
      if (e.id === id) {
        if (!businessId || e.business_id === businessId) return false;
      }
      return true;
    });
    globalThis.__PILIN_PERSISTENT_EMPLOYEES__ = filtered;
    this.saveToFile(filtered);
    return true;
  }
}
