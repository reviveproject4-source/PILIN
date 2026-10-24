'use server';

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

export async function getLiveBusinessProfileAction(businessId: string): Promise<LiveBusinessProfile> {
  const profile: LiveBusinessProfile = {
    business_id: businessId,
    business_name: 'Bengkel Tas Sepatu',
    business_address: 'Bengkel Tas Sepatu, Indonesia',
    business_phone: '081280320505',
    logo_url: '/logo.png',
    terms_and_conditions: '1. Barang yang telah diserahkan wajib dicek kembali saat pengambilan.\n2. Garansi pengerjaan berlaku 3 hari setelah pengambilan barang.\n3. Pengambilan barang wajib membawa nota fisik atau nota WhatsApp resmi.',
    updated_at: new Date().toISOString(),
  };

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
    console.error('getLiveBusinessProfileAction error:', err);
  }

  return profile;
}

export async function saveLiveBusinessProfileAction(
  businessId: string,
  updates: Partial<LiveBusinessProfile>
): Promise<{ success: boolean; message?: string }> {
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

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
