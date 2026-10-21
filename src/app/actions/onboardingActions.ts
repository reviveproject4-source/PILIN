'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { PendingRegistrationStore } from '@/domains/tenant/pendingRegistrationStore';

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
  const cleanEmployeeCount = employeeCount || '1 Cabang';

  if (!cleanOwnerName) {
    return { success: false, message: 'Nama Pemilik / PIC wajib diisi.' };
  }
  if (!cleanBusinessName) {
    return { success: false, message: 'Nama Usaha / Bisnis wajib diisi.' };
  }
  if (!cleanContactNumber) {
    return { success: false, message: 'Nomor WhatsApp wajib diisi.' };
  }
  if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
    return { success: false, message: 'Format email usaha tidak valid.' };
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // 1. Immediately store in resilient persistent server store
  const persistentRecord = PendingRegistrationStore.add({
    name: cleanBusinessName,
    ownerName: cleanOwnerName,
    whatsapp: cleanContactNumber,
    email: cleanEmail,
    employeeCount: cleanEmployeeCount,
  });

  const prospectId = persistentRecord.id;

  // 2. Also attempt sync to Supabase if database credentials are live
  try {
    const supabaseAdmin = createAdminClient();

    try {
      const { data: existingProspect } = await supabaseAdmin
        .from('pilin_prospects')
        .select('id')
        .or(`email.eq.${cleanEmail},whatsapp.eq.${cleanContactNumber}`)
        .maybeSingle();

      if (existingProspect?.id) {
        await supabaseAdmin
          .from('pilin_prospects')
          .update({
            name: cleanBusinessName,
            owner_name: cleanOwnerName,
            whatsapp: cleanContactNumber,
            email: cleanEmail,
            employee_count: cleanEmployeeCount,
            source: 'WELCOME_REGISTER',
            trial_start: now.toISOString(),
            trial_end: trialEnd.toISOString(),
          })
          .eq('id', existingProspect.id);
      } else {
        await supabaseAdmin
          .from('pilin_prospects')
          .insert({
            name: cleanBusinessName,
            owner_name: cleanOwnerName,
            whatsapp: cleanContactNumber,
            email: cleanEmail,
            employee_count: cleanEmployeeCount,
            source: 'WELCOME_REGISTER',
            status: 'NEW',
            trial_start: now.toISOString(),
            trial_end: trialEnd.toISOString(),
            trial_status: 'PENDING_APPROVAL',
          });
      }
    } catch (dbErr: any) {
      console.warn('Notice syncing to pilin_prospects:', dbErr.message);
    }

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
            status: 'TRIAL',
          });
      }
    } catch (e: any) {
      console.warn('Notice syncing to platform_customers:', e.message);
    }
  } catch (err: any) {
    console.warn('Notice database client initialization:', err.message);
  }

  return {
    success: true,
    message: 'Pendaftaran usaha berhasil dikirim. Menunggu verifikasi & ACC Super Admin.',
    prospectId,
    businessId: `tenant-${prospectId.slice(0, 8)}`,
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    businessName: cleanBusinessName,
  };
}
