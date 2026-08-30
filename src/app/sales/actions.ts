'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface ActionResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export async function checkSalesAccess(): Promise<{ authenticated: boolean; isSales: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { authenticated: false, isSales: false };
  }

  // Check if super admin
  const { data: isSuperAdmin } = await supabase.rpc('auth_is_super_admin');
  if (isSuperAdmin) {
    return { authenticated: true, isSales: true };
  }

  // Check if sales role
  const { data: isSales } = await supabase.rpc('auth_has_platform_role', { p_role: 'sales' });
  return { authenticated: true, isSales: !!isSales };
}

export async function createProspectAction(payload: {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  ownerEmail: string;
}): Promise<ActionResponse> {
  const { name, contactName, email, phone, ownerEmail } = payload;
  const supabase = createClient();

  // Guard access
  const access = await checkSalesAccess();
  if (!access.isSales) {
    return { success: false, message: 'Forbidden: Insufficient privileges.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const { error } = await supabase
    .from('platform_customers')
    .insert({
      name: name.trim(),
      contact_name: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      owner_email: ownerEmail.trim().toLowerCase(),
      sales_owner_user_id: user.id
    });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/sales/prospects');
  return { success: true, message: 'Prospect successfully created.' };
}

export async function createDealAction(payload: {
  customerId: string;
  productId: string;
}): Promise<ActionResponse> {
  const { customerId, productId } = payload;
  const supabase = createClient();

  const access = await checkSalesAccess();
  if (!access.isSales) {
    return { success: false, message: 'Forbidden: Insufficient privileges.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'Unauthorized' };

  const { error } = await supabase
    .from('platform_sales_applications')
    .insert({
      customer_id: customerId,
      product_id: productId,
      sales_user_id: user.id,
      status: 'PROSPECT'
    });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/sales/deals');
  return { success: true, message: 'Sales application successfully created.' };
}

export async function updateDealStatusAction(payload: {
  dealId: string;
  status: 'PROSPECT' | 'DEMO' | 'CLOSED_WON' | 'CLOSED_LOST';
}): Promise<ActionResponse> {
  const { dealId, status } = payload;
  const supabase = createClient();

  const access = await checkSalesAccess();
  if (!access.isSales) {
    return { success: false, message: 'Forbidden: Insufficient privileges.' };
  }

  const { error } = await supabase
    .from('platform_sales_applications')
    .update({ status })
    .eq('id', dealId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/sales/deals');
  return { success: true, message: `Deal status updated to ${status}.` };
}

export async function createDemoAction(payload: {
  salesApplicationId: string;
  demoDate: string;
  notes?: string;
}): Promise<ActionResponse> {
  const { salesApplicationId, demoDate, notes } = payload;
  const supabase = createClient();

  const access = await checkSalesAccess();
  if (!access.isSales) {
    return { success: false, message: 'Forbidden: Insufficient privileges.' };
  }

  const { error } = await supabase
    .from('platform_demos')
    .insert({
      sales_application_id: salesApplicationId,
      demo_date: new Date(demoDate).toISOString(),
      notes: notes?.trim() || null,
      status: 'SCHEDULED'
    });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/sales/demos');
  return { success: true, message: 'Demo successfully scheduled.' };
}

export async function updateDemoAction(payload: {
  demoId: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  result?: 'INTERESTED' | 'NOT_INTERESTED' | 'FOLLOW_UP';
  notes?: string;
}): Promise<ActionResponse> {
  const { demoId, status, result, notes } = payload;
  const supabase = createClient();

  const access = await checkSalesAccess();
  if (!access.isSales) {
    return { success: false, message: 'Forbidden: Insufficient privileges.' };
  }

  const { error } = await supabase
    .from('platform_demos')
    .update({
      status,
      demo_result: result || null,
      notes: notes?.trim() || null
    })
    .eq('id', demoId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath('/sales/demos');
  revalidatePath('/sales/deals');
  return { success: true, message: 'Demo successfully updated.' };
}
