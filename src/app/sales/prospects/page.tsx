import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProspectsClient from './ProspectsClient';

export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sales/login');
  }

  // Fetch all prospects owned by this user
  const { data: prospects, error } = await supabase
    .from('platform_customers')
    .select('*')
    .eq('sales_owner_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load prospects:', error.message);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Prospect CRM
        </h1>
      </div>

      <ProspectsClient initialProspects={prospects || []} />
    </div>
  );
}
