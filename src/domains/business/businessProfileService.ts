import { saveLiveBusinessProfileAction } from '@/app/actions/businessActions';

export interface BusinessProfileConfig {
  business_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  logo_url?: string | null;
  terms_and_conditions: string;
  updated_at: string;
}

export class BusinessProfileService {
  private static defaultProfile: BusinessProfileConfig = {
    business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    business_name: 'Bengkel Tas Sepatu',
    business_address: 'Bengkel Tas Sepatu, Indonesia',
    business_phone: '081280320505',
    logo_url: '/logo.png',
    terms_and_conditions: '1. Barang yang telah diserahkan wajib dicek kembali saat pengambilan.\n2. Garansi pengerjaan berlaku 3 hari setelah pengambilan barang.\n3. Pengambilan barang wajib membawa nota fisik atau nota WhatsApp resmi.',
    updated_at: new Date().toISOString(),
  };

  private static inMemoryStore = new Map<string, BusinessProfileConfig>();

  static getProfile(businessId: string = '8ec99d6e-3f6f-47d4-910f-265cfe26c609'): BusinessProfileConfig {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pilin_business_profile_${businessId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.inMemoryStore.set(businessId, parsed);
          return parsed;
        }
      } catch (e) {
        console.error('Failed to read business profile from localStorage', e);
      }
    }

    const inMem = this.inMemoryStore.get(businessId);
    if (inMem) return { ...inMem };

    return { ...this.defaultProfile, business_id: businessId };
  }

  static updateProfile(
    businessId: string = '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
    updates: Partial<Omit<BusinessProfileConfig, 'business_id'>>
  ): BusinessProfileConfig {
    const current = this.getProfile(businessId);
    const updated: BusinessProfileConfig = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.inMemoryStore.set(businessId, updated);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pilin_business_profile_${businessId}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save business profile to localStorage', e);
      }
    }

    // Background server sync to Supabase
    try {
      saveLiveBusinessProfileAction(businessId, updates).catch(() => {});
    } catch {}

    return updated;
  }
}
