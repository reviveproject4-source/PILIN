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
    <aside className="w-64 bg-[#0F2547] text-white flex flex-col justify-between h-full border-r border-slate-800 shadow-md">
      <div className="flex flex-col">
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#F26522]"></span>
            <span className="text-xl font-bold tracking-tight text-white">
              PILIN <span className="text-[#F26522] text-sm uppercase font-semibold">Sales</span>
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-6 px-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-[#F26522] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
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
      <div className="p-4 border-t border-slate-800 flex flex-col space-y-3 bg-[#0B1A32]">
        <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-xs font-medium text-slate-300 block truncate">
            {userEmail}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-300 hover:bg-white/10 rounded-lg transition-colors duration-150"
        >
          <LogOut className="mr-3 h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
