'use server';

import fs from 'fs';
import path from 'path';
import { createAdminClient } from '@/lib/supabase/admin';

export interface LiveBusinessProfile {
  business_id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  logo_url?: string | null;
  terms_and_conditions: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PROFILE_FILE = path.join(DATA_DIR, 'pilin_business_profile.json');

export async function getLiveBusinessProfileAction(businessId: string): Promise<LiveBusinessProfile> {
  const profile: LiveBusinessProfile = {
    business_id: businessId,
    business_name: 'Trio R Laundry',
    business_address: 'Trio R Laundry, Indonesia',
    business_phone: '081218388131',
    logo_url: '/logo.png',
    terms_and_conditions: '1. Perhitungan nota dihitung berdasarkan nota resmi saat penyerahan pakaian.\n2. Komplain maksimal 1x24 jam setelah cucian diambil dengan membawa nota ini.\n3. Pakaian yang tidak diambil lebih dari 30 hari di luar tanggung jawab kami.',
    updated_at: new Date().toISOString(),
  };

  try {
    if (fs.existsSync(PROFILE_FILE)) {
      const raw = fs.readFileSync(PROFILE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.business_phone) {
        return {
          ...profile,
          ...parsed,
          business_id: businessId,
        };
      }
    }
  } catch {}

  try {
    const supabase = createAdminClient();

    // Check platform_customers first
    const { data: cust } = await supabase
      .from('platform_customers')
      .select('*')
      .or(`tenant_id.eq.${businessId},id.eq.${businessId}`)
      .maybeSingle();

    if (cust) {
      profile.business_name = cust.name || profile.business_name;
      profile.business_phone = cust.phone || profile.business_phone;
    }

    // Check tenants
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', businessId)
      .maybeSingle();

    if (tenant) {
      profile.business_name = tenant.name || profile.business_name;
    }

    // Check branch address
    const { data: branch } = await supabase
      .from('branches')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (branch && branch.address) {
      profile.business_address = branch.address;
    }
  } catch (err) {
    // offline fallback
  }

  return profile;
}

export async function saveLiveBusinessProfileAction(
  businessId: string,
  updates: Partial<LiveBusinessProfile>
): Promise<{ success: boolean; message?: string }> {
  try {
    // 1. Save to local data/pilin_business_profile.json
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      let existing: any = {};
      if (fs.existsSync(PROFILE_FILE)) {
        try {
          existing = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
        } catch {}
      }
      const merged = {
        ...existing,
        ...updates,
        business_id: businessId,
        updated_at: new Date().toISOString(),
      };
      fs.writeFileSync(PROFILE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch {}

    // 2. Try Supabase
    try {
      const supabase = createAdminClient();

      if (updates.business_name) {
        await supabase
          .from('tenants')
          .update({ name: updates.business_name, updated_at: new Date().toISOString() })
          .eq('id', businessId);

        await supabase
          .from('platform_customers')
          .update({ name: updates.business_name, updated_at: new Date().toISOString() })
          .or(`tenant_id.eq.${businessId},id.eq.${businessId}`);
      }

      if (updates.business_phone || updates.business_address) {
        await supabase
          .from('branches')
          .update({
            address: updates.business_address,
            phone: updates.business_phone,
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId);
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err?.message };
  }
}
