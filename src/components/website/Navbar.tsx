'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ArrowRight, ExternalLink } from 'lucide-react';

export function PilinLogo({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Icon Mark SVG */}
      <svg className="h-full w-auto aspect-square" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M250 50C285 50 315 70 330 100L250 250V50Z" fill="#0F2547" />
        <path d="M370 130C395 155 410 190 410 225L250 250L370 130Z" fill="#0F2547" />
        <path d="M430 270C435 285 435 300 430 315L375 290L430 270Z" fill="#F26522" />
        <path d="M420 340C400 380 365 410 320 425L250 250L420 340Z" fill="#0F2547" />
        <path d="M270 445C255 450 240 450 225 445L250 250L270 445Z" fill="#0F2547" />
        <path d="M175 430C135 410 105 375 90 330L250 250L175 430Z" fill="#0F2547" />
        <path d="M75 280C70 250 75 220 90 190L250 250L75 280Z" fill="#0F2547" />
        <path d="M110 150C135 110 175 80 220 70L250 250L110 150Z" fill="#0F2547" />
      </svg>
      <div className="flex flex-col justify-center">
        <span className="text-2xl font-black tracking-tight text-[#0F2547] leading-none">Pilin</span>
        <span className="text-[11px] font-bold text-[#F26522] tracking-wide mt-0.5 leading-none">Banyak operasi. Satu irama.</span>
      </div>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Service', href: '/service' },
    { label: 'Free Feature', href: '/free-feature' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Business Check', href: '/business-check' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <PilinLogo className="h-10" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 lg:space-x-8 text-sm font-semibold text-slate-700">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'text-[#F26522] border-[#F26522]'
                    : 'border-transparent hover:text-[#F26522]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          <Link
            href="/dashboard?demo=true"
            className="text-xs font-bold text-[#0F2547] bg-slate-100 hover:bg-slate-200 px-3.5 py-2.5 rounded-lg transition-all flex items-center space-x-1.5"
          >
            <span>Portal ERP</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <a
            href="https://bit.ly/konsultasipilin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-[#F26522] hover:bg-[#d95516] text-white text-sm font-bold px-5 py-2.5 rounded-lg shadow-md shadow-[#F26522]/20 transition-all hover:scale-[1.02]"
          >
            <span>Bicarakan Bisnis Anda</span>
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isActive ? 'bg-[#F26522]/10 text-[#F26522]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            <Link
              href="/dashboard?demo=true"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center bg-slate-100 text-[#0F2547] text-xs font-bold py-2.5 rounded-lg"
            >
              Portal ERP
            </Link>
            <a
              href="https://bit.ly/konsultasipilin"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-[#F26522] text-white text-sm font-bold py-2.5 rounded-lg shadow-md"
            >
              Bicarakan Bisnis Anda
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
