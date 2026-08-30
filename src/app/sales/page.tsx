import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Users, FolderKanban, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SalesDashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sales/login');
  }

  // 1. Fetch count totals
  const { count: prospectsCount } = await supabase
    .from('platform_customers')
    .select('*', { count: 'exact', head: true })
    .eq('sales_owner_user_id', user.id);

  const { count: dealsCount } = await supabase
    .from('platform_sales_applications')
    .select('*', { count: 'exact', head: true })
    .eq('sales_user_id', user.id);

  // Fetch recent prospects
  const { data: recentProspects } = await supabase
    .from('platform_customers')
    .select('*')
    .eq('sales_owner_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Fetch recent deals
  const { data: recentDeals } = await supabase
    .from('platform_sales_applications')
    .select(`
      id,
      status,
      created_at,
      platform_customers (name),
      platform_products (name)
    `)
    .eq('sales_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const cards = [
    { name: 'Total Prospects', value: prospectsCount || 0, icon: Users, color: 'text-blue-500' },
    { name: 'Total Sales Deals', value: dealsCount || 0, icon: FolderKanban, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Sales Dashboard
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="overflow-hidden rounded-lg bg-slate-800 px-4 py-5 shadow border border-slate-700 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className={`h-8 w-8 ${card.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <span className="truncate text-sm font-medium text-slate-400 block">
                    {card.name}
                  </span>
                  <span className="text-3xl font-semibold text-white block mt-1">
                    {card.value}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Prospects List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Recent Prospects
          </h2>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-slate-700">
              {recentProspects && recentProspects.length > 0 ? (
                recentProspects.map((prospect) => (
                  <li key={prospect.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {prospect.name}
                        </p>
                        <p className="text-sm text-slate-400 truncate mt-1">
                          {prospect.email} • {prospect.phone}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-slate-500 py-4">No prospects registered yet.</p>
              )}
            </ul>
          </div>
        </div>

        {/* Recent Deals List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Recent Sales Deals
          </h2>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-slate-700">
              {recentDeals && recentDeals.length > 0 ? (
                recentDeals.map((deal: any) => (
                  <li key={deal.id} className="py-4">
                    <div className="flex items-center justify-between space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {deal.platform_customers?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-400 truncate mt-1">
                          Product: {deal.platform_products?.name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          deal.status === 'CLOSED_WON' ? 'bg-green-900 text-green-200' :
                          deal.status === 'DEMO' ? 'bg-yellow-900 text-yellow-200' :
                          deal.status === 'CLOSED_LOST' ? 'bg-red-900 text-red-200' :
                          'bg-slate-700 text-slate-200'
                        }`}>
                          {deal.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-slate-500 py-4">No active deals found.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
