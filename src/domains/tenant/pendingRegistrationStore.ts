import os from 'os';
import path from 'path';
import fs from 'fs';

export interface RegistrationRecord {
  id: string;
  name: string;
  ownerName: string;
  whatsapp: string;
  email: string;
  employeeCount: string;
  createdAt: string;
  status: 'NEW' | 'CLOSED_WON' | 'REJECTED';
  trialStatus: string;
  temporaryPin?: string;
  password?: string;
}

const TMP_FILE = path.join(os.tmpdir(), 'pilin_pending_registrations.json');

declare global {
  // eslint-disable-next-line no-var
  var __PILIN_REGISTRATIONS__: RegistrationRecord[] | undefined;
}

export class PendingRegistrationStore {
  private static loadFromFile(): RegistrationRecord[] {
    try {
      if (fs.existsSync(TMP_FILE)) {
        const raw = fs.readFileSync(TMP_FILE, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to read from tmp registrations file', e);
    }
    return [];
  }

  private static saveToFile(records: RegistrationRecord[]) {
    try {
      fs.writeFileSync(TMP_FILE, JSON.stringify(records, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to write to tmp registrations file', e);
    }
  }

  private static getStore(): RegistrationRecord[] {
    if (!globalThis.__PILIN_REGISTRATIONS__) {
      globalThis.__PILIN_REGISTRATIONS__ = this.loadFromFile();
    }
    return globalThis.__PILIN_REGISTRATIONS__;
  }

  static add(data: {
    name: string;
    ownerName: string;
    whatsapp: string;
    email: string;
    employeeCount?: string;
  }): RegistrationRecord {
    const store = this.getStore();
    const id = `reg-${Date.now()}`;
    const newRecord: RegistrationRecord = {
      id,
      name: data.name,
      ownerName: data.ownerName,
      whatsapp: data.whatsapp,
      email: data.email,
      employeeCount: data.employeeCount || '1 Cabang',
      createdAt: new Date().toISOString(),
      status: 'NEW',
      trialStatus: 'PENDING_APPROVAL',
    };

    // Prepend to top
    store.unshift(newRecord);
    this.saveToFile(store);
    return newRecord;
  }

  static getAll(): RegistrationRecord[] {
    const store = this.getStore();
    const fileRecords = this.loadFromFile();
    // Merge without duplicates by ID
    const map = new Map<string, RegistrationRecord>();
    for (const r of [...fileRecords, ...store]) {
      map.set(r.id, r);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static acc(id: string, temporaryPin?: string): RegistrationRecord | null {
    const store = this.getStore();
    const target = store.find((r) => r.id === id);
    if (target) {
      target.status = 'CLOSED_WON';
      target.trialStatus = 'ACTIVE';
      if (temporaryPin) {
        target.temporaryPin = temporaryPin;
      }
      this.saveToFile(store);
      return target;
    }

    // Check file
    const fileRecords = this.loadFromFile();
    const fileTarget = fileRecords.find((r) => r.id === id);
    if (fileTarget) {
      fileTarget.status = 'CLOSED_WON';
      fileTarget.trialStatus = 'ACTIVE';
      if (temporaryPin) {
        fileTarget.temporaryPin = temporaryPin;
      }
      this.saveToFile(fileRecords);
      globalThis.__PILIN_REGISTRATIONS__ = fileRecords;
      return fileTarget;
    }

    return null;
  }

  private static normalizePhone(phone: string): string {
    const digits = (phone || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('62')) return digits.slice(2);
    if (digits.startsWith('0')) return digits.slice(1);
    return digits;
  }

  static findByPhoneOrEmail(identifier: string): RegistrationRecord | null {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    const cleanPhone = this.normalizePhone(cleanId);

    const all = this.getAll();
    return (
      all.find((r) => {
        if (r.email && r.email.toLowerCase() === cleanId) return true;
        if (r.whatsapp) {
          const recPhone = this.normalizePhone(r.whatsapp);
          if (recPhone && cleanPhone && (recPhone === cleanPhone || recPhone.endsWith(cleanPhone) || cleanPhone.endsWith(recPhone))) {
            return true;
          }
        }
        return false;
      }) || null
    );
  }

  static setPassword(identifier: string, newPassword: string): boolean {
    const target = this.findByPhoneOrEmail(identifier);
    if (!target) return false;

    const store = this.getStore();
    const match = store.find((r) => r.id === target.id);
    if (match) {
      match.password = newPassword;
      this.saveToFile(store);
      return true;
    }

    const fileRecords = this.loadFromFile();
    const fileMatch = fileRecords.find((r) => r.id === target.id);
    if (fileMatch) {
      fileMatch.password = newPassword;
      this.saveToFile(fileRecords);
      globalThis.__PILIN_REGISTRATIONS__ = fileRecords;
      return true;
    }

    return false;
  }

  static verifyCredentials(
    identifier: string,
    passwordInput: string
  ): { valid: boolean; record?: RegistrationRecord; reason?: string } {
    const record = this.findByPhoneOrEmail(identifier);
    if (!record) {
      return { valid: false, reason: 'Akun atau nomor WhatsApp tidak terdaftar.' };
    }

    // If tenant has not been ACC'd yet
    if (record.status !== 'CLOSED_WON' && record.trialStatus !== 'ACTIVE') {
      return { valid: false, record, reason: 'Pendaftaran akun sedang menunggu persetujuan (ACC) Super Admin.' };
    }

    const cleanInput = passwordInput?.trim() || '';

    // If explicit password set
    if (record.password) {
      if (record.password === cleanInput) {
        return { valid: true, record };
      }
      return { valid: false, record, reason: 'Kata sandi atau PIN salah.' };
    }

    // If temporary PIN exists
    if (record.temporaryPin) {
      if (record.temporaryPin === cleanInput) {
        return { valid: true, record };
      }
    }

    // Fallback: 4-digit last phone digits
    const normPhone = this.normalizePhone(record.whatsapp);
    if (normPhone.length >= 4 && normPhone.endsWith(cleanInput)) {
      return { valid: true, record };
    }

    return { valid: false, record, reason: 'Kata sandi atau PIN salah. Silakan gunakan menu Reset Password via WhatsApp.' };
  }

  static delete(id: string): boolean {
    let store = this.getStore();
    store = store.filter((r) => r.id !== id);
    globalThis.__PILIN_REGISTRATIONS__ = store;
    this.saveToFile(store);
    return true;
  }
}
