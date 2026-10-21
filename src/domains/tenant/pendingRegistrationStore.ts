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

  static acc(id: string): RegistrationRecord | null {
    const store = this.getStore();
    const target = store.find((r) => r.id === id);
    if (target) {
      target.status = 'CLOSED_WON';
      target.trialStatus = 'ACTIVE';
      this.saveToFile(store);
      return target;
    }

    // Check file
    const fileRecords = this.loadFromFile();
    const fileTarget = fileRecords.find((r) => r.id === id);
    if (fileTarget) {
      fileTarget.status = 'CLOSED_WON';
      fileTarget.trialStatus = 'ACTIVE';
      this.saveToFile(fileRecords);
      globalThis.__PILIN_REGISTRATIONS__ = fileRecords;
      return fileTarget;
    }

    return null;
  }
}
