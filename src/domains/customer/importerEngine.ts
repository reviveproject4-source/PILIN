import { normalizePhoneNumber } from '@/lib/normalizePhoneNumber';
import { Customer, ImportUpdatePolicy } from '@/lib/types';

export interface RawImportRow {
  [key: string]: any;
}

export interface MappedImportRow {
  source_customer_id?: string;
  nama?: string;
  no_hp?: string;
  email?: string;
  alamat?: string;
  tags?: string[];
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedPhone?: string;
}

export interface DeduplicationMatch {
  action: 'CREATE_NEW' | 'MATCH_EXTERNAL_ID' | 'MATCH_PHONE' | 'MATCH_EMAIL' | 'POSSIBLE_DUPLICATE';
  existingCustomerId?: string;
  confidence: number;
}

/**
 * Universal Customer Importer Staging & Normalization Engine — PILIN Methodology
 */
export class CustomerImporterEngine {

  /**
   * Normalizes incoming mapped row fields
   */
  static normalizeRow(mappedRow: MappedImportRow): MappedImportRow & { normalized_phone?: string } {
    const normalizedPhone = normalizePhoneNumber(mappedRow.no_hp);
    return {
      ...mappedRow,
      nama: mappedRow.nama ? mappedRow.nama.trim() : '',
      email: mappedRow.email ? mappedRow.email.trim().toLowerCase() : undefined,
      normalized_phone: normalizedPhone || undefined
    };
  }

  /**
   * Validates a normalized import row
   */
  static validateRow(normalizedRow: MappedImportRow & { normalized_phone?: string }): ImportValidationResult {
    const errors: string[] = [];

    if (!normalizedRow.nama || normalizedRow.nama.length < 2) {
      errors.push('Nama pelanggan wajib diisi (minimal 2 karakter).');
    }

    if (normalizedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedRow.email)) {
      errors.push('Format email tidak valid.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      normalizedPhone: normalizedRow.normalized_phone
    };
  }

  /**
   * 5-Step Identity Matching Order (Section 16 & Artifact 9)
   */
  static matchExistingCustomer(
    incomingRow: MappedImportRow & { normalized_phone?: string },
    sourceSystem: string,
    existingCustomers: Customer[]
  ): DeduplicationMatch {
    // 1. Exact Identity Lookup: business_id + source_system + source_customer_id
    if (incomingRow.source_customer_id) {
      const matchExt = existingCustomers.find(
        c => c.source_system === sourceSystem && c.source_customer_id === incomingRow.source_customer_id
      );
      if (matchExt) {
        return { action: 'MATCH_EXTERNAL_ID', existingCustomerId: matchExt.id, confidence: 1.0 };
      }
    }

    // 2. Normalized Phone Lookup: business_id + normalized_phone
    if (incomingRow.normalized_phone) {
      const matchPhone = existingCustomers.find(
        c => c.no_hp_normalized === incomingRow.normalized_phone
      );
      if (matchPhone) {
        return { action: 'MATCH_PHONE', existingCustomerId: matchPhone.id, confidence: 0.95 };
      }
    }

    // 3. Email Lookup: business_id + email
    if (incomingRow.email) {
      const matchEmail = existingCustomers.find(
        c => c.email && c.email.toLowerCase() === incomingRow.email?.toLowerCase()
      );
      if (matchEmail) {
        return { action: 'MATCH_EMAIL', existingCustomerId: matchEmail.id, confidence: 0.90 };
      }
    }

    // 4. Composite Candidate Match: Name exact match + Phone suffix match
    if (incomingRow.nama && incomingRow.normalized_phone) {
      const matchComposite = existingCustomers.find(c => {
        const nameMatch = c.nama.toLowerCase() === incomingRow.nama?.toLowerCase();
        const suffixMatch = c.no_hp_normalized && incomingRow.normalized_phone && 
                            c.no_hp_normalized.slice(-4) === incomingRow.normalized_phone.slice(-4);
        return nameMatch && suffixMatch;
      });
      if (matchComposite) {
        return { action: 'POSSIBLE_DUPLICATE', existingCustomerId: matchComposite.id, confidence: 0.70 };
      }
    }

    // 5. No match -> Create New Customer
    return { action: 'CREATE_NEW', confidence: 0.0 };
  }

  /**
   * Executes UPDATE_EMPTY_ONLY policy on existing customer record
   * Rule: Must NEVER overwrite populated Minara values with NULL/empty source values.
   */
  static applyUpdatePolicy(
    existing: Customer,
    incoming: MappedImportRow & { normalized_phone?: string },
    policy: ImportUpdatePolicy
  ): Partial<Customer> {
    if (policy === 'SKIP') {
      return {};
    }

    if (policy === 'OVERWRITE_EXPLICIT') {
      return {
        nama: incoming.nama || existing.nama,
        no_hp: incoming.no_hp || existing.no_hp,
        no_hp_normalized: incoming.normalized_phone || existing.no_hp_normalized,
        email: incoming.email || existing.email,
        alamat: incoming.alamat || existing.alamat,
      };
    }

    // Default & Preferred Policy: UPDATE_EMPTY_ONLY
    const updates: Partial<Customer> = {};

    if (!existing.email && incoming.email) {
      updates.email = incoming.email;
    }
    if (!existing.no_hp && incoming.no_hp) {
      updates.no_hp = incoming.no_hp;
      updates.no_hp_normalized = incoming.normalized_phone;
    }
    if (!existing.alamat && incoming.alamat) {
      updates.alamat = incoming.alamat;
    }
    if (incoming.tags && incoming.tags.length > 0) {
      const existingTags = existing.tags || [];
      const combinedTags = Array.from(new Set([...existingTags, ...incoming.tags]));
      updates.tags = combinedTags;
    }

    return updates;
  }
}
