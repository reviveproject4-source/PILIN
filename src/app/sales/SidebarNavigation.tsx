'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Users, FolderKanban, CalendarRange, LogOut } from 'lucide-react';

interface SidebarProps {
  userEmail: string;
}

export default function SidebarNavigation({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // If we are on the login page, do not render the sidebar
  if (pathname === '/sales/login') {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/sales', icon: LayoutDashboard },
    { name: 'Prospect CRM', href: '/sales/prospects', icon: Users },
    { name: 'Active Deals', href: '/sales/deals', icon: FolderKanban },
    { name: 'Demo Calendar', href: '/sales/demos', icon: CalendarRange },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sales/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col justify-between h-full">
      <div className="flex flex-col">
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-slate-700">
          <span className="text-xl font-bold text-white tracking-wide">
            MINARA CRM
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / User Profile Section */}
      <div className="p-4 border-t border-slate-700 flex flex-col space-y-3 bg-slate-850">
        <div className="px-3 py-2 bg-slate-700/50 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-sm font-medium text-slate-200 block truncate">
            {userEmail}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-700 rounded-lg transition-colors duration-150"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
