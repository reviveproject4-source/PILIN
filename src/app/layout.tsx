import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PILIN — Sistem Operasional & Manajemen Cabang Terintegrasi',
  description: 'Sistem Operasional & Manajemen Cabang Terintegrasi PILIN',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
