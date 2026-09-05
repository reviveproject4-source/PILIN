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
    { name: 'Total Prospects', value: prospectsCount || 0, icon: Users, color: 'text-[#0F2547]' },
    { name: 'Total Sales Deals', value: dealsCount || 0, icon: FolderKanban, color: 'text-[#F26522]' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F2547]">
          Sales Dashboard
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.name} className="overflow-hidden rounded-xl bg-white px-5 py-5 shadow-sm border border-slate-200 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-slate-100 p-3 rounded-lg">
                  <Icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    {card.name}
                  </span>
                  <span className="text-3xl font-bold text-[#0F2547] block mt-1">
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0F2547] mb-4">
            Recent Prospects
          </h2>
          <div className="flow-root">
            <ul className="-my-4 divide-y divide-slate-100">
              {recentProspects && recentProspects.length > 0 ? (
                recentProspects.map((prospect) => (
                  <li key={prospect.id} className="py-3.5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {prospect.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {prospect.email} • {prospect.phone}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-4">Belum ada prospek terdaftar.</p>
              )}
            </ul>
          </div>
        </div>

        {/* Recent Deals List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-[#0F2547] mb-4">
            Recent Sales Deals
          </h2>
          <div className="flow-root">
            <ul className="-my-4 divide-y divide-slate-100">
              {recentDeals && recentDeals.length > 0 ? (
                recentDeals.map((deal: any) => (
                  <li key={deal.id} className="py-3.5">
                    <div className="flex items-center justify-between space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {deal.platform_customers?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          Produk: {deal.platform_products?.name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          deal.status === 'CLOSED_WON' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          deal.status === 'DEMO' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          deal.status === 'CLOSED_LOST' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {deal.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-sm text-slate-400 py-4">Belum ada deal aktif.</p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
