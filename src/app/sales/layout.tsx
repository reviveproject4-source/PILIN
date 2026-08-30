import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkSalesAccess } from './actions';
import SidebarNavigation from './SidebarNavigation';

export const dynamic = 'force-dynamic';

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If path is login, bypass check here to prevent redirect loop
  // (In Next.js layout runs at segment level, but we can verify session)
  const access = await checkSalesAccess();

  if (!access.authenticated) {
    // Return children directly if rendering login
    return <>{children}</>;
  }

  if (!access.isSales) {
    // Logged in but not a sales user
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white p-8">
        <div className="max-w-md bg-slate-800 p-8 rounded-lg border border-slate-700 text-center space-y-4">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-slate-300">You do not have permission to access the Sales Portal.</p>
          <a
            href="/sales/login"
            className="inline-block bg-indigo-600 px-4 py-2 rounded text-sm font-semibold hover:bg-indigo-500"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar Navigation */}
      <SidebarNavigation userEmail={user?.email || 'sales@minara.id'} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-900">
        <div className="py-6 px-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
