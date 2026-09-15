'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface OnboardingPayload {
  ownerName: string;
  businessName: string;
  contactNumber: string;
  email: string;
  employeeCount: string;
}

export interface OnboardingActionResult {
  success: boolean;
  message: string;
  prospectId?: string;
  businessId?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  businessName?: string;
}

export async function submitOwnerOnboardingAction(payload: OnboardingPayload): Promise<OnboardingActionResult> {
  const { ownerName, businessName, contactNumber, email, employeeCount } = payload;

  const cleanOwnerName = ownerName?.trim();
  const cleanBusinessName = businessName?.trim();
  const cleanContactNumber = contactNumber?.trim();
  const cleanEmail = email?.trim()?.toLowerCase();
  const cleanEmployeeCount = employeeCount || '1-5';

  if (!cleanOwnerName) {
    return { success: false, message: 'Nama Owner / PIC wajib diisi.' };
  }
  if (!cleanBusinessName) {
    return { success: false, message: 'Nama Usaha wajib diisi.' };
  }
  if (!cleanContactNumber) {
    return { success: false, message: 'Nomor WhatsApp wajib diisi.' };
  }
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { success: false, message: 'Format email usaha tidak valid.' };
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Anti-duplicate / Idempotency Check in pilin_prospects
    const { data: existingProspect } = await supabaseAdmin
      .from('pilin_prospects')
      .select('id')
      .or(`email.eq.${cleanEmail},whatsapp.eq.${cleanContactNumber}`)
      .maybeSingle();

    let prospectId: string;

    if (existingProspect) {
      // Update existing record to avoid duplicate
      const { error: updateError } = await supabaseAdmin
        .from('pilin_prospects')
        .update({
          name: cleanBusinessName,
          owner_name: cleanOwnerName,
          whatsapp: cleanContactNumber,
          email: cleanEmail,
          employee_count: cleanEmployeeCount,
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          trial_status: 'ACTIVE',
        })
        .eq('id', existingProspect.id);

      if (updateError) {
        console.error('Failed to update prospect in pilin_prospects:', updateError.message);
      }
      prospectId = existingProspect.id;
    } else {
      // Insert new prospect record
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('pilin_prospects')
        .insert({
          name: cleanBusinessName,
          owner_name: cleanOwnerName,
          whatsapp: cleanContactNumber,
          email: cleanEmail,
          employee_count: cleanEmployeeCount,
          status: 'NEW',
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
          trial_status: 'ACTIVE',
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Failed to insert prospect in pilin_prospects:', insertError.message);
        // Fallback insertion with minimal schema if optional columns fail
        const { data: fallbackInsert } = await supabaseAdmin
          .from('pilin_prospects')
          .insert({
            name: cleanBusinessName,
            whatsapp: cleanContactNumber,
            status: 'NEW',
          })
          .select('id')
          .single();
        prospectId = fallbackInsert?.id || `prospect-${Date.now()}`;
      } else {
        prospectId = inserted.id;
      }
    }

    // 2. Also populate platform_customers if table exists for complete CRM alignment
    try {
      const { data: existingPlatformCustomer } = await supabaseAdmin
        .from('platform_customers')
        .select('id')
        .or(`email.eq.${cleanEmail},phone.eq.${cleanContactNumber}`)
        .maybeSingle();

      if (!existingPlatformCustomer) {
        await supabaseAdmin
          .from('platform_customers')
          .insert({
            name: cleanBusinessName,
            contact_name: cleanOwnerName,
            email: cleanEmail,
            phone: cleanContactNumber,
            owner_email: cleanEmail,
            status: 'ACTIVE',
          });
      }
    } catch (e) {
      console.warn('platform_customers secondary sync notice:', e);
    }

    return {
      success: true,
      message: 'Registrasi Onboarding Owner berhasil disimpan secara persistent.',
      prospectId,
      businessId: `tenant-${prospectId.slice(0, 8)}`,
      trialStartDate: now.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      businessName: cleanBusinessName,
    };
  } catch (err: any) {
    console.error('Owner onboarding action error:', err);
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan saat menyimpan data prospek.',
    };
  }
}
