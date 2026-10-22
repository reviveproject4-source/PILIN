export interface TenantFeatureFlagItem {
  feature_code: string;
  name: string;
  category: 'Operasional' | 'CRM WhatsApp' | 'Keuangan' | 'HR & SDM' | 'Alat & AI' | string;
  description: string;
  enabled: boolean;
}

export const PILIN_STANDARD_FEATURES: Omit<TenantFeatureFlagItem, 'enabled'>[] = [
  // 1. Operasional & POS
  { feature_code: 'nota_transaksi', name: 'Kasir & Cetak Nota POS', category: 'Operasional', description: 'Transaksi kasir cepat, barcode scan, diskon, dan cetak struk nota.' },
  { feature_code: 'spk', name: 'SPK & Tracking Pekerjaan', category: 'Operasional', description: 'Surat Perintah Kerja pencucian, antrean proses, dan serah terima.' },
  { feature_code: 'service_catalog', name: 'Katalog Layanan & Harga Cabang', category: 'Operasional', description: 'Katalog jasa, varian layanan, dan penyesuaian tarif per cabang.' },
  
  // 2. CRM WhatsApp
  { feature_code: 'sapaan', name: 'WhatsApp Sapaan Otomatis', category: 'CRM WhatsApp', description: 'Kirim sapaan selamat datang dan ucapan otomatis ke nomor pelanggan.' },
  { feature_code: 'reminder', name: 'Pengingat Retensi & Cucian Jadi', category: 'CRM WhatsApp', description: 'Notifikasi otomatis cucian selesai diambil dan ajakan cuci kembali.' },
  { feature_code: 'broadcast', name: 'Broadcast Promo WhatsApp Massal', category: 'CRM WhatsApp', description: 'Kirim penawaran promo dan diskon massal ke segmen pelanggan.' },
  
  // 3. Keuangan
  { feature_code: 'finance', name: 'Pencatatan Kas & Beban Operasional', category: 'Keuangan', description: 'Catat pengeluaran harian cabang, operasional toko, dan arus kas.' },
  { feature_code: 'revenue', name: 'Laporan Omzet, HPP & Laba Kotor', category: 'Keuangan', description: 'Analitik pendapatan harian/bulanan, perhitungan HPP, dan margin laba.' },
  { feature_code: 'sales_commission', name: 'Komisi Penjualan Kasir & Sales', category: 'Keuangan', description: 'Perhitungan otomatis bagi hasil dan bonus komisi staf kasir.' },
  
  // 4. HR & SDM
  { feature_code: 'attendance', name: 'Presensi GPS & Foto Selfie Pegawai', category: 'HR & SDM', description: 'Check-in/out staf dengan validasi geofencing lokasi dan bukti foto.' },
  { feature_code: 'gamification', name: 'Poin Kinerja & Peringkat Pegawai', category: 'HR & SDM', description: 'Reward poin produktivitas, pencapaian target, dan leaderboard staf.' },
  
  // 5. Alat & AI
  { feature_code: 'intelligence', name: 'AI Insights & Analitik Prediktif', category: 'Alat & AI', description: 'Rekomendasi pertumbuhan bisnis otomatis berbasis data transaksi.' },
  { feature_code: 'importer', name: 'Import & Migrasi Data Excel/CSV', category: 'Alat & AI', description: 'Upload data master pelanggan dan layanan lama secara instan.' }
];
