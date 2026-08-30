import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DemosClient from './DemosClient';

export const dynamic = 'force-dynamic';

export default async function DemosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sales/login');
  }

  // Fetch all demos owned by this user
  const { data: demos, error } = await supabase
    .from('platform_demos')
    .select(`
      *,
      platform_sales_applications!inner (
        id,
        status,
        platform_customers (name),
        platform_products (name)
      )
    `)
    .eq('platform_sales_applications.sales_user_id', user.id)
    .order('demo_date', { ascending: false });

  if (error) {
    console.error('Failed to load demos:', error.message);
  }

  // Fetch active sales applications for selector
  const { data: activeApplications } = await supabase
    .from('platform_sales_applications')
    .select(`
      id,
      platform_customers (name),
      platform_products (name)
    `)
    .eq('sales_user_id', user.id)
    .order('created_at', { ascending: false });

  // Map the structures to match the single object structure expected by client
  const mappedApplications = (activeApplications || []).map((app: any) => ({
    id: app.id,
    platform_customers: Array.isArray(app.platform_customers)
      ? app.platform_customers[0]
      : app.platform_customers,
    platform_products: Array.isArray(app.platform_products)
      ? app.platform_products[0]
      : app.platform_products
  }));

  const mappedDemos = (demos || []).map((d: any) => {
    const app = Array.isArray(d.platform_sales_applications)
      ? d.platform_sales_applications[0]
      : d.platform_sales_applications;
    
    return {
      id: d.id,
      status: d.status,
      demo_result: d.demo_result,
      demo_date: d.demo_date,
      notes: d.notes,
      platform_sales_applications: {
        id: app?.id,
        platform_customers: Array.isArray(app?.platform_customers)
          ? app.platform_customers[0]
          : app?.platform_customers,
        platform_products: Array.isArray(app?.platform_products)
          ? app.platform_products[0]
          : app?.platform_products
      }
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Demo Management
        </h1>
      </div>

      <DemosClient
        initialDemos={mappedDemos as any}
        activeApplications={mappedApplications as any}
      />
    </div>
  );
}
