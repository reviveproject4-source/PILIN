import { Customer } from '@/lib/types';
import { normalizePhoneNumber } from '@/lib/normalizePhoneNumber';
import { CustomerImporterEngine } from './importerEngine';

export class CustomerDomainService {
  private static mockCustomers: Customer[] = [];

  static getCustomers(): Customer[] {
    return this.mockCustomers.filter(c => !c.status || c.status === 'ACTIVE');
  }

  static getAllCustomers(): Customer[] {
    return [...this.mockCustomers];
  }

  static getCustomerById(id: string): Customer | undefined {
    return this.mockCustomers.find(c => c.id === id);
  }

  static searchCustomers(query: string): Customer[] {
    const q = query.trim().toLowerCase();
    const active = this.getCustomers();
    if (!q) return active;
    const normalizedQ = normalizePhoneNumber(q);

    return active.filter(c => 
      c.nama.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.no_hp_normalized && c.no_hp_normalized.includes(normalizedQ || q))
    );
  }

  static registerCustomer(data: { nama: string; no_hp: string; email?: string; alamat?: string; branch_id?: string }): Customer {
    const normalized = CustomerImporterEngine.normalizeRow({
      nama: data.nama,
      no_hp: data.no_hp,
      email: data.email,
      alamat: data.alamat,
    });

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      nama: normalized.nama || 'Pelanggan Baru',
      no_hp: data.no_hp,
      no_hp_normalized: normalized.normalized_phone || null,
      email: normalized.email || null,
      alamat: data.alamat ? data.alamat.trim() : null,
      source_system: 'POS_MANUAL',
      source_customer_id: `REG-${Math.floor(1000 + Math.random() * 9000)}`,
      communication_preference: 'ALL',
      created_at_branch_id: data.branch_id || 'BRANCH_001',
      status: 'ACTIVE',
      is_opted_out: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockCustomers.unshift(newCust);
    return newCust;
  }

  // GD-10 Customer Duplicate Merge (Tier 3 Manager / Tier 2 Owner)
  static mergeCustomer(canonicalId: string, duplicateId: string, actorRole: string): { canonical: Customer; duplicate: Customer } {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized customer merge: Tier 3 Manager or Tier 2 Owner required (GD-10)');
    }

    if (canonicalId === duplicateId) {
      throw new Error('Cannot merge customer into itself: canonicalId and duplicateId must be different');
    }

    const canonical = this.mockCustomers.find(c => c.id === canonicalId);
    const duplicate = this.mockCustomers.find(c => c.id === duplicateId);

    if (!canonical || !duplicate) {
      throw new Error('Customer record not found for merge');
    }

    // Non-destructive update: Duplicate becomes MERGED, historical records linked to canonicalId
    duplicate.status = 'MERGED';
    duplicate.merged_into_id = canonicalId;
    duplicate.updated_at = new Date().toISOString();

    canonical.updated_at = new Date().toISOString();

    return { canonical, duplicate };
  }

  // GD-11 Customer Archiving (Soft-Archive)
  static archiveCustomer(customerId: string, actorRole: string): Customer {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized customer archive: Manager or Owner required');
    }

    const customer = this.mockCustomers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error('Customer not found for archiving');
    }

    customer.status = 'ARCHIVED';
    customer.archived_at = new Date().toISOString();
    customer.updated_at = new Date().toISOString();

    return customer;
  }

  // GD-11 Customer Permanent Delete (Owner Only, ARCHIVED status, 5 Years Retention - OD-04)
  static permanentDeleteCustomer(customerId: string, actorRole: string): Customer {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'owner') {
      throw new Error('Unauthorized permanent delete: Owner authority required (GD-11 / OD-04)');
    }

    const customer = this.mockCustomers.find(c => c.id === customerId);
    if (!customer) {
      throw new Error('Customer not found for permanent delete');
    }

    if (customer.status !== 'ARCHIVED') {
      throw new Error('Customer must be ARCHIVED before permanent delete (GD-11)');
    }

    if (!customer.archived_at) {
      throw new Error('Archived timestamp missing');
    }

    const fiveYearsMs = 5 * 365 * 24 * 60 * 60 * 1000;
    const archivedTime = new Date(customer.archived_at).getTime();
    const currentTime = Date.now();

    if (currentTime - archivedTime < fiveYearsMs) {
      throw new Error('Retention period (5 years) has not elapsed for archived customer (GD-11 / OD-04)');
    }

    customer.status = 'PERMANENT_DELETED';
    customer.deleted_at = new Date().toISOString();
    customer.updated_at = new Date().toISOString();

    return customer;
  }
}
