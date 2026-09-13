'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors border shadow-sm ${
        theme === 'dark'
          ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
      } ${className}`}
      title={theme === 'dark' ? 'Ganti ke Mode Terang (Light)' : 'Ganti ke Mode Gelap (Dark)'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
          {showLabel && <span className="ml-2 text-slate-200 text-xs">Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-slate-600 flex-shrink-0" />
          {showLabel && <span className="ml-2 text-slate-700 text-xs">Dark Mode</span>}
        </>
      )}
    </button>
  );
}
