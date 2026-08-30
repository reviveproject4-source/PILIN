import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DealsClient from './DealsClient';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sales/login');
  }

  // Fetch all deals owned by the sales agent
  const { data: deals, error: dealsError } = await supabase
    .from('platform_sales_applications')
    .select(`
      *,
      platform_customers (id, name),
      platform_products (id, name),
      platform_invoices (id, status)
    `)
    .eq('sales_user_id', user.id)
    .order('created_at', { ascending: false });

  if (dealsError) {
    console.error('Failed to load deals:', dealsError.message);
  }

  // Fetch prospects for option selector
  const { data: prospects } = await supabase
    .from('platform_customers')
    .select('id, name')
    .eq('sales_owner_user_id', user.id)
    .order('name');

  // Fetch products for option selector
  const { data: products } = await supabase
    .from('platform_products')
    .select('id, name')
    .order('name');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Active Deals
        </h1>
      </div>

      <DealsClient
        initialDeals={deals || []}
        prospects={prospects || []}
        products={products || []}
      />
    </div>
  );
}
