'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, 
  Trash2, RefreshCw, Users, Tag, ArrowRight, Eye, ShieldCheck, Database, Sparkles
} from 'lucide-react';
import { 
  ImportExportService, 
  CustomerImportRow, 
  ServiceImportRow 
} from '@/domains/commerce/importExportService';
import { PosCustomerItem, DEFAULT_POS_CUSTOMERS } from '@/components/commerce/KasirTransactionWorkspace';
import { ServiceCatalogService, ServiceCatalogItem } from '@/domains/catalog/serviceCatalogService';
import { 
  getLiveCustomersAction, 
  saveImportedCustomersAction, 
  getLiveCatalogAction, 
  saveImportedCatalogAction 
} from '@/app/actions/importActions';

interface DataImportExportManagerProps {
  businessId?: string;
  branchId?: string;
  defaultTab?: 'CUSTOMER' | 'CATALOG';
  onCustomerImportSuccess?: (list: PosCustomerItem[]) => void;
  onCatalogImportSuccess?: (catalog: ServiceCatalogItem[]) => void;
}

export function DataImportExportManager({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  defaultTab = 'CUSTOMER',
  onCustomerImportSuccess,
  onCatalogImportSuccess,
}: DataImportExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'CUSTOMER' | 'CATALOG'>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Customer State
  const [currentCustomers, setCurrentCustomers] = useState<PosCustomerItem[]>([]);
  const [customerRows, setCustomerRows] = useState<CustomerImportRow[]>([]);
  const [customerFileName, setCustomerFileName] = useState<string>('');
  const [isProcessingCustomer, setIsProcessingCustomer] = useState(false);
  const [customerImportMode, setCustomerImportMode] = useState<'FILE' | 'PASTE'>('FILE');
  const [customerPasteText, setCustomerPasteText] = useState<string>('');
  const customerFileInputRef = useRef<HTMLInputElement>(null);

  // Catalog State
  const [currentCatalog, setCurrentCatalog] = useState<ServiceCatalogItem[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceImportRow[]>([]);
  const [serviceFileName, setServiceFileName] = useState<string>('');
  const [isProcessingService, setIsProcessingService] = useState(false);
  const [serviceImportMode, setServiceImportMode] = useState<'FILE' | 'PASTE'>('FILE');
  const [servicePasteText, setServicePasteText] = useState<string>('');
  const serviceFileInputRef = useRef<HTMLInputElement>(null);

  // Notification Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load existing customers and catalog
  const loadExistingData = async () => {
    // 1. Load Customers strictly isolated per tenant
    let loadedCust = false;
    if (typeof window !== 'undefined') {
      try {
        const savedCust = localStorage.getItem(`pilin_kasir_customers_${businessId}`) ||
                          localStorage.getItem('pilin_kasir_customers_master') ||
                          localStorage.getItem('pilin_kasir_customers_global_backup');
        if (savedCust) {
          const parsed = JSON.parse(savedCust);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCurrentCustomers(parsed);
            loadedCust = true;
          }
        }

        if (!loadedCust) {
          const isDemo = localStorage.getItem('pilin_demo_mode') === 'true' || businessId === 'demo-tenant';
          if (isDemo) {
            setCurrentCustomers(DEFAULT_POS_CUSTOMERS);
            loadedCust = true;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!loadedCust) {
      try {
        const serverCustomers = await getLiveCustomersAction(businessId);
        if (serverCustomers && serverCustomers.length > 0) {
          const mapped: PosCustomerItem[] = serverCustomers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            status: c.status || 'ACTIVE',
            totalTrx: c.totalTrx || 1,
            lastVisit: c.lastVisit || new Date().toISOString().substring(0, 10),
          }));
          setCurrentCustomers(mapped);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`pilin_kasir_customers_${businessId}`, JSON.stringify(mapped));
          }
          loadedCust = true;
        }
      } catch {
        // ignore
      }
    }

    if (!loadedCust) {
      // Bengkel Tas Sepatu & demo get default sample if fresh; new tenants start 100% EMPTY!
      if (businessId === '8ec99d6e-3f6f-47d4-910f-265cfe26c609' || businessId === 'demo-tenant') {
        setCurrentCustomers(DEFAULT_POS_CUSTOMERS);
      } else {
        setCurrentCustomers([]);
      }
    }

    // 2. Load Catalog strictly isolated per tenant
    let items = ServiceCatalogService.getMasterCatalog(businessId);
    if (items.length === 0) {
      try {
        const serverCatalog = await getLiveCatalogAction(businessId);
        if (serverCatalog && serverCatalog.length > 0) {
          serverCatalog.forEach(s => {
            ServiceCatalogService.addMasterService({
              business_id: businessId,
              nama: s.nama,
              base_harga: s.base_harga,
              hpp: s.hpp,
              item_type: s.item_type || 'SERVICE',
              pricing_unit: s.pricing_unit,
              duration_val: s.duration_val,
              duration_unit: s.duration_unit,
              duration_hours: s.duration_hours,
              reminder_days: s.reminder_days,
              stock_qty: s.stock_qty,
              bahan_baku: s.bahan_baku,
            }, businessId);
          });
          items = ServiceCatalogService.getMasterCatalog(businessId);
        }
      } catch {
        // ignore
      }
    }
    setCurrentCatalog(items);
  };

  useEffect(() => {
    loadExistingData();
  }, [businessId]);

  // ==========================================
  // CUSTOMER HANDLERS
  // ==========================================
  const handleCustomerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomerFileName(file.name);
    setIsProcessingCustomer(true);
    setFeedback({ type: 'success', message: `Sedang memproses berkas "${file.name}"...` });

    try {
      const parsed = await ImportExportService.parseCustomerFile(file);
      setCustomerRows(parsed);
      
      if (parsed.length === 0) {
        setFeedback({ type: 'error', message: 'Berkas kosong atau tidak ada data yang terbaca.' });
      } else {
        const validRows = parsed.filter(r => r.isValid);
        if (validRows.length > 0) {
          // AUTO-COMMIT: Simpan langsung ke database lokal & server!
          const result = ImportExportService.commitImportCustomers(parsed, businessId, branchId);
          setCurrentCustomers(result.currentList);

          // Sync server-side
          try {
            saveImportedCustomersAction(businessId, result.currentList.map(c => ({
              id: c.id,
              business_id: businessId,
              name: c.name,
              phone: c.phone,
              address: c.address,
              status: c.status,
              totalTrx: c.totalTrx,
              lastVisit: c.lastVisit,
            }))).catch(() => {});
          } catch {
            // non-critical
          }

          setFeedback({ 
            type: 'success', 
            message: `Impor Berhasil! ${result.added} pelanggan baru ditambahkan, ${result.updated} kontak diperbarui.` 
          });

          if (onCustomerImportSuccess) {
            onCustomerImportSuccess(result.currentList);
          }
        } else {
          setFeedback({ 
            type: 'error', 
            message: `Gagal: ${parsed.length} baris terbaca namun nomor WA/Nama tidak valid. Periksa tabel pratinjau di bawah.` 
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal membaca file: ${err?.message || 'Format tidak didukung'}` });
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  const handleImportSampleCustomers = () => {
    setIsProcessingCustomer(true);
    try {
      const sampleRows: CustomerImportRow[] = [
        {
          nama: 'Ibu Anisa Wardani',
          no_hp: '081234567890',
          alamat: 'Apartemen Mediterania Tower B-12, Jakarta',
          email: 'anisa.wardani@gmail.com',
          status: 'LOYAL',
          totalTrx: 8,
          lastVisit: new Date().toISOString().substring(0, 10),
          isValid: true,
          errors: [],
        },
        {
          nama: 'Bapak Dedi Pratama',
          no_hp: '081987654321',
          alamat: 'Jl. Kemang Timur No. 15, Jakarta Selatan',
          email: 'dedi.pratama@yahoo.com',
          status: 'REPEAT',
          totalTrx: 4,
          lastVisit: new Date().toISOString().substring(0, 10),
          isValid: true,
          errors: [],
        },
        {
          nama: 'Kak Citra Lestari',
          no_hp: '085678901234',
          alamat: 'Kos Griya Melati No. 8, Setiabudi',
          email: 'citra.lestari@gmail.com',
          status: 'NEW',
          totalTrx: 1,
          lastVisit: new Date().toISOString().substring(0, 10),
          isValid: true,
          errors: [],
        },
      ];

      const result = ImportExportService.commitImportCustomers(sampleRows, businessId, branchId);
      setCurrentCustomers(result.currentList);
      setCustomerRows(sampleRows);
      setCustomerFileName('Contoh Data Pelanggan PILIN');

      try {
        saveImportedCustomersAction(businessId, result.currentList.map(c => ({
          id: c.id,
          business_id: businessId,
          name: c.name,
          phone: c.phone,
          address: c.address,
          status: c.status,
          totalTrx: c.totalTrx,
          lastVisit: c.lastVisit,
        }))).catch(() => {});
      } catch {
        // non-critical
      }

      setFeedback({
        type: 'success',
        message: `Sukses Memuat Contoh Data! 3 pelanggan contoh berhasil ditambahkan ke database tenant.`,
      });

      if (onCustomerImportSuccess) {
        onCustomerImportSuccess(result.currentList);
      }
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  const handleCustomerPasteSubmit = () => {
    if (!customerPasteText.trim()) {
      setFeedback({ type: 'error', message: 'Teks CSV pelanggan masih kosong. Tempelkan teks CSV terlebih dahulu.' });
      return;
    }

    setIsProcessingCustomer(true);
    setFeedback({ type: 'success', message: 'Sedang memproses teks CSV pelanggan...' });

    try {
      const parsed = ImportExportService.parseCustomerCsvText(customerPasteText);
      setCustomerRows(parsed);
      setCustomerFileName('Teks CSV Pelanggan');

      if (parsed.length === 0) {
        setFeedback({ type: 'error', message: 'Tidak ada baris data pelanggan yang terbaca dari teks CSV.' });
      } else {
        const validRows = parsed.filter(r => r.isValid);
        if (validRows.length > 0) {
          const result = ImportExportService.commitImportCustomers(parsed, businessId, branchId);
          setCurrentCustomers(result.currentList);

          try {
            saveImportedCustomersAction(businessId, result.currentList.map(c => ({
              id: c.id,
              business_id: businessId,
              name: c.name,
              phone: c.phone,
              address: c.address,
              status: c.status,
              totalTrx: c.totalTrx,
              lastVisit: c.lastVisit,
            }))).catch(() => {});
          } catch {
            // non-critical
          }

          setFeedback({
            type: 'success',
            message: `Impor Berhasil! ${result.added} pelanggan baru ditambahkan, ${result.updated} kontak diperbarui.`,
          });

          if (onCustomerImportSuccess) {
            onCustomerImportSuccess(result.currentList);
          }
        } else {
          setFeedback({
            type: 'error',
            message: `Gagal: ${parsed.length} baris terbaca namun nomor WA/Nama tidak valid. Periksa tabel pratinjau di bawah.`,
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal memproses teks: ${err?.message || 'Format tidak didukung'}` });
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  const handleCommitCustomerImport = () => {
    const validRows = customerRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada baris valid untuk diimpor.' });
      return;
    }

    setIsProcessingCustomer(true);
    try {
      const result = ImportExportService.commitImportCustomers(customerRows, businessId, branchId);
      setCurrentCustomers(result.currentList);
      
      try {
        saveImportedCustomersAction(businessId, result.currentList.map(c => ({
          id: c.id,
          business_id: businessId,
          name: c.name,
          phone: c.phone,
          address: c.address,
          status: c.status,
          totalTrx: c.totalTrx,
          lastVisit: c.lastVisit,
        }))).catch(() => {});
      } catch {
        // non-critical
      }

      setFeedback({ 
        type: 'success', 
        message: `Impor Selesai! ${result.added} pelanggan baru ditambahkan, ${result.updated} kontak diperbarui.` 
      });

      if (onCustomerImportSuccess) {
        onCustomerImportSuccess(result.currentList);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menyimpan data: ${err?.message}` });
    } finally {
      setIsProcessingCustomer(false);
    }
  };

  const handleExportCustomers = () => {
    if (currentCustomers.length === 0) {
      setFeedback({ type: 'error', message: 'Belum ada data pelanggan untuk diekspor.' });
      return;
    }
    ImportExportService.exportCustomers(currentCustomers, `data_pelanggan_${businessId}.xlsx`);
    setFeedback({ type: 'success', message: 'File Excel data pelanggan berhasil diunduh.' });
  };

  // ==========================================
  // CATALOG HANDLERS
  // ==========================================
  const handleServiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setServiceFileName(file.name);
    setIsProcessingService(true);
    setFeedback({ type: 'success', message: `Sedang memproses berkas "${file.name}"...` });

    try {
      const parsed = await ImportExportService.parseServiceFile(file);
      setServiceRows(parsed);
      
      if (parsed.length === 0) {
        setFeedback({ type: 'error', message: 'Berkas kosong atau tidak ada data yang terbaca.' });
      } else {
        const validRows = parsed.filter(r => r.isValid);
        if (validRows.length > 0) {
          // AUTO-COMMIT: Simpan langsung ke katalog master!
          const result = ImportExportService.commitImportServices(parsed, businessId);
          setCurrentCatalog(result.currentCatalog);

          // Sync server-side
          try {
            saveImportedCatalogAction(businessId, result.currentCatalog.map(s => ({
              id: s.id,
              business_id: businessId,
              nama: s.nama,
              sku: s.sku,
              base_harga: s.base_harga,
              hpp: s.hpp,
              item_type: s.item_type,
              pricing_unit: s.pricing_unit,
              duration_val: s.duration_val,
              duration_unit: s.duration_unit,
              duration_hours: s.duration_hours,
              reminder_days: s.reminder_days,
              stock_qty: s.stock_qty,
              bahan_baku: s.bahan_baku,
            }))).catch(() => {});
          } catch {
            // non-critical
          }

          setFeedback({ 
            type: 'success', 
            message: `Impor Layanan Berhasil! ${result.added} item baru ditambahkan, ${result.updated} item diperbarui.` 
          });

          if (onCatalogImportSuccess) {
            onCatalogImportSuccess(result.currentCatalog);
          }
        } else {
          setFeedback({ 
            type: 'error', 
            message: `Gagal: ${parsed.length} baris terbaca namun nama/harga tidak valid. Periksa tabel pratinjau di bawah.` 
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal membaca file: ${err?.message || 'Format tidak didukung'}` });
    } finally {
      setIsProcessingService(false);
    }
  };

  const handleImportSampleServices = () => {
    setIsProcessingService(true);
    try {
      const sampleRows: ServiceImportRow[] = [
        {
          nama: 'Cuci Kiloan Reguler (Cuci Kering Setrika)',
          sku: 'SKU-JASA-101',
          item_type: 'SERVICE',
          base_harga: 8000,
          pricing_unit: 'kg',
          hpp: 3000,
          duration_val: 2,
          duration_unit: 'HARI',
          reminder_days: 14,
          stock_qty: 0,
          bahan_baku: 'Deterjen Cair 30ml, Pewangi 20ml, Plastik Packing 1 lbr',
          isValid: true,
          errors: [],
        },
        {
          nama: 'Cuci Kiloan Express 24 Jam',
          sku: 'SKU-JASA-102',
          item_type: 'SERVICE',
          base_harga: 12000,
          pricing_unit: 'kg',
          hpp: 4500,
          duration_val: 1,
          duration_unit: 'HARI',
          reminder_days: 14,
          stock_qty: 0,
          bahan_baku: 'Deterjen Cepat Bersih, Parfum Laundry Grade A, Plastik',
          isValid: true,
          errors: [],
        },
        {
          nama: 'Cuci Bed Cover King / Jumbo',
          sku: 'SKU-JASA-103',
          item_type: 'SERVICE',
          base_harga: 35000,
          pricing_unit: 'pc',
          hpp: 12000,
          duration_val: 2,
          duration_unit: 'HARI',
          reminder_days: 30,
          stock_qty: 0,
          bahan_baku: 'Deterjen Khusus Bed Cover + Pelembut Wangi',
          isValid: true,
          errors: [],
        },
        {
          nama: 'Dry Clean Jas & Celana Formal',
          sku: 'SKU-JASA-104',
          item_type: 'SERVICE',
          base_harga: 50000,
          pricing_unit: 'stel',
          hpp: 15000,
          duration_val: 3,
          duration_unit: 'HARI',
          reminder_days: 30,
          stock_qty: 0,
          bahan_baku: 'Chemical Dry Clean + Hanger Jas + Cover Plastik',
          isValid: true,
          errors: [],
        },
        {
          nama: 'Parfum Laundry Premium 250ml',
          sku: 'SKU-RETAIL-101',
          item_type: 'PRODUCT',
          base_harga: 35000,
          pricing_unit: 'pc',
          hpp: 18000,
          duration_val: undefined,
          duration_unit: undefined,
          reminder_days: 45,
          stock_qty: 20,
          bahan_baku: 'Botol Spray 250ml + Konsentrat Aroma Lily',
          isValid: true,
          errors: [],
        },
      ];

      const result = ImportExportService.commitImportServices(sampleRows, businessId);
      setCurrentCatalog(result.currentCatalog);
      setServiceRows(sampleRows);
      setServiceFileName('Contoh Layanan & Produk PILIN');

      try {
        saveImportedCatalogAction(businessId, result.currentCatalog.map(s => ({
          id: s.id,
          business_id: businessId,
          nama: s.nama,
          sku: s.sku,
          base_harga: s.base_harga,
          hpp: s.hpp,
          item_type: s.item_type,
          pricing_unit: s.pricing_unit,
          duration_val: s.duration_val,
          duration_unit: s.duration_unit,
          duration_hours: s.duration_hours,
          reminder_days: s.reminder_days,
          stock_qty: s.stock_qty,
          bahan_baku: s.bahan_baku,
        }))).catch(() => {});
      } catch {
        // non-critical
      }

      setFeedback({
        type: 'success',
        message: `Sukses Memuat Contoh Layanan! ${sampleRows.length} item layanan & produk berhasil ditambahkan ke katalog master.`,
      });

      if (onCatalogImportSuccess) {
        onCatalogImportSuccess(result.currentCatalog);
      }
    } finally {
      setIsProcessingService(false);
    }
  };

  const handleServicePasteSubmit = () => {
    if (!servicePasteText.trim()) {
      setFeedback({ type: 'error', message: 'Teks CSV layanan masih kosong. Tempelkan teks CSV terlebih dahulu.' });
      return;
    }

    setIsProcessingService(true);
    setFeedback({ type: 'success', message: 'Sedang memproses teks CSV layanan & produk...' });

    try {
      const parsed = ImportExportService.parseServiceCsvText(servicePasteText);
      setServiceRows(parsed);
      setServiceFileName('Teks CSV Layanan');

      if (parsed.length === 0) {
        setFeedback({ type: 'error', message: 'Tidak ada baris layanan/produk yang terbaca dari teks CSV.' });
      } else {
        const validRows = parsed.filter(r => r.isValid);
        if (validRows.length > 0) {
          const result = ImportExportService.commitImportServices(parsed, businessId);
          setCurrentCatalog(result.currentCatalog);

          try {
            saveImportedCatalogAction(businessId, result.currentCatalog.map(s => ({
              id: s.id,
              business_id: businessId,
              nama: s.nama,
              sku: s.sku,
              base_harga: s.base_harga,
              hpp: s.hpp,
              item_type: s.item_type,
              pricing_unit: s.pricing_unit,
              duration_val: s.duration_val,
              duration_unit: s.duration_unit,
              duration_hours: s.duration_hours,
              reminder_days: s.reminder_days,
              stock_qty: s.stock_qty,
              bahan_baku: s.bahan_baku,
            }))).catch(() => {});
          } catch {
            // non-critical
          }

          setFeedback({
            type: 'success',
            message: `Impor Layanan Berhasil! ${result.added} item baru ditambahkan, ${result.updated} item diperbarui.`,
          });

          if (onCatalogImportSuccess) {
            onCatalogImportSuccess(result.currentCatalog);
          }
        } else {
          setFeedback({
            type: 'error',
            message: `Gagal: ${parsed.length} baris terbaca namun nama/harga tidak valid. Periksa tabel pratinjau di bawah.`,
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal memproses teks: ${err?.message || 'Format tidak didukung'}` });
    } finally {
      setIsProcessingService(false);
    }
  };

  const handleCommitServiceImport = () => {
    const validRows = serviceRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setFeedback({ type: 'error', message: 'Tidak ada item valid untuk diimpor.' });
      return;
    }

    setIsProcessingService(true);
    try {
      const result = ImportExportService.commitImportServices(serviceRows, businessId);
      setCurrentCatalog(result.currentCatalog);

      try {
        saveImportedCatalogAction(businessId, result.currentCatalog.map(s => ({
          id: s.id,
          business_id: businessId,
          nama: s.nama,
          sku: s.sku,
          base_harga: s.base_harga,
          hpp: s.hpp,
          item_type: s.item_type,
          pricing_unit: s.pricing_unit,
          duration_val: s.duration_val,
          duration_unit: s.duration_unit,
          duration_hours: s.duration_hours,
          reminder_days: s.reminder_days,
          stock_qty: s.stock_qty,
          bahan_baku: s.bahan_baku,
        }))).catch(() => {});
      } catch {
        // non-critical
      }

      setFeedback({ 
        type: 'success', 
        message: `Impor Katalog Selesai! ${result.added} item baru ditambahkan, ${result.updated} item diperbarui.` 
      });

      if (onCatalogImportSuccess) {
        onCatalogImportSuccess(result.currentCatalog);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Gagal menyimpan katalog: ${err?.message}` });
    } finally {
      setIsProcessingService(false);
    }
  };

  const handleExportCatalog = () => {
    if (currentCatalog.length === 0) {
      setFeedback({ type: 'error', message: 'Belum ada data katalog layanan untuk diekspor.' });
      return;
    }
    ImportExportService.exportServices(currentCatalog, `katalog_master_${businessId}.xlsx`);
    setFeedback({ type: 'success', message: 'File Excel katalog master berhasil diunduh.' });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-indigo-600 text-white flex items-center justify-center shadow-md">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#0F2547] dark:text-white tracking-tight">
              Pusat Impor &amp; Ekspor Data Master
            </h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setActiveTab('CUSTOMER'); setFeedback(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CUSTOMER'
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Data Pelanggan ({currentCustomers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('CATALOG'); setFeedback(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Layanan &amp; Produk ({currentCatalog.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-150 ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75 font-black">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: DATA PELANGGAN                                     */}
      {/* ========================================================= */}
      {activeTab === 'CUSTOMER' && (
        <div className="space-y-6">
          {/* UTAMA: UPLOAD & IMPORT BERKAS PELANGGAN */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#2563EB]" />
                <span>1. Pilih &amp; Import Berkas Pelanggan (Excel / CSV)</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setCustomerImportMode('FILE')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      customerImportMode === 'FILE'
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📁 Unggah Berkas
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerImportMode('PASTE')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      customerImportMode === 'PASTE'
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📝 Tempel Teks CSV
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isProcessingCustomer}
                  onClick={handleImportSampleCustomers}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Isi Contoh Data (1-Klik)</span>
                </button>
              </div>
            </div>

            {customerImportMode === 'FILE' ? (
              <div className="space-y-4">
                {/* Action Button Langsung */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isProcessingCustomer}
                    onClick={() => customerFileInputRef.current?.click()}
                    className="px-5 py-3 bg-[#2563EB] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>PILIH BERKAS EXCEL / CSV DARI PERANGKAT</span>
                  </button>
                  {customerFileName && (
                    <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Berkas: {customerFileName}</span>
                    </div>
                  )}
                </div>

                {/* Kotak Dropzone Interaktif Full-Area Clickable */}
                <div className="relative border-2 border-dashed border-blue-400 dark:border-blue-600 hover:border-[#2563EB] rounded-2xl p-6 text-center bg-blue-50/40 dark:bg-blue-950/20 transition-all cursor-pointer group">
                  <input
                    ref={customerFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,text/plain"
                    onChange={handleCustomerFileChange}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    id="customer-upload-input"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Seret &amp; Lepas berkas (.xlsx / .csv) ke kotak ini atau klik tombol di atas
                    </div>
                  </div>
                </div>

                {/* Alternatif File Selector Standar Peramban */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Atau gunakan tombol peramban bawaan:
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,text/plain"
                    onChange={handleCustomerFileChange}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#2563EB] file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              /* Mode Salin & Tempel (Paste) Teks CSV */
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={customerPasteText}
                  onChange={(e) => setCustomerPasteText(e.target.value)}
                  placeholder={`Nama Pelanggan, No WhatsApp, Alamat, Email\nIbu Anisa Wardani, 081234567890, Apartemen Mediterania Tower B-12, anisa@gmail.com\nBapak Dedi Pratama, 081987654321, Jl. Kemang Timur No. 15, dedi@yahoo.com\nKak Citra Lestari, 085678901234, Kos Griya Melati No. 8, citra@gmail.com`}
                  className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2563EB] text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
                <button
                  type="button"
                  disabled={isProcessingCustomer || !customerPasteText.trim()}
                  onClick={handleCustomerPasteSubmit}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessingCustomer ? 'Memproses...' : 'Proses &amp; Simpan Teks CSV'}</span>
                </button>
              </div>
            )}

            {/* Staging Table Preview */}
            {customerRows.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hasil Pratinjau ({customerRows.length} baris dibaca, {customerRows.filter(r => r.isValid).length} valid)
                  </div>
                  <button
                    type="button"
                    disabled={isProcessingCustomer || customerRows.filter(r => r.isValid).length === 0}
                    onClick={handleCommitCustomerImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessingCustomer ? 'Menyimpan...' : 'Simpan Ulang ke Database'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Status</th>
                        <th className="p-3">Nama Pelanggan</th>
                        <th className="p-3">No. WhatsApp</th>
                        <th className="p-3">Alamat</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Status CRM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customerRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-950/60' : 'bg-rose-50/50 dark:bg-rose-950/30'}>
                          <td className="p-3 font-bold">
                            {row.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold" title={row.errors.join(', ')}>
                                ✕ {row.errors[0]}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.nama}</td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{row.no_hp}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{row.alamat || '-'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{row.email || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* TEMPLATE & EKSPOR PELANGGAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#2563EB]" />
                  <span>2. Unduh Format Template Pelanggan</span>
                </span>
                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  Format Standar
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => ImportExportService.downloadCustomerTemplate('xlsx')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => ImportExportService.downloadCustomerTemplate('csv')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* Quick Export Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>3. Ekspor Database Pelanggan</span>
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                  {currentCustomers.length} Terdaftar
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleExportCustomers}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-[#2563EB] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Semua Pelanggan ke Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DATA LAYANAN & PRODUK (CATALOG)                    */}
      {/* ========================================================= */}
      {activeTab === 'CATALOG' && (
        <div className="space-y-6">
          {/* UTAMA: UPLOAD & IMPORT BERKAS LAYANAN */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#F26522]" />
                <span>1. Pilih &amp; Import Berkas Layanan &amp; Produk (Excel / CSV)</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setServiceImportMode('FILE')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      serviceImportMode === 'FILE'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📁 Unggah Berkas
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceImportMode('PASTE')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      serviceImportMode === 'PASTE'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    📝 Tempel Teks CSV
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isProcessingService}
                  onClick={handleImportSampleServices}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Isi Contoh Layanan (1-Klik)</span>
                </button>
              </div>
            </div>

            {serviceImportMode === 'FILE' ? (
              <div className="space-y-4">
                {/* Action Button Langsung */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={isProcessingService}
                    onClick={() => serviceFileInputRef.current?.click()}
                    className="px-5 py-3 bg-[#F26522] hover:bg-[#d95416] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>PILIH BERKAS EXCEL / CSV DARI PERANGKAT</span>
                  </button>
                  {serviceFileName && (
                    <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Berkas: {serviceFileName}</span>
                    </div>
                  )}
                </div>

                {/* Kotak Dropzone Interaktif Full-Area Clickable */}
                <div className="relative border-2 border-dashed border-[#F26522]/50 hover:border-[#F26522] rounded-2xl p-6 text-center bg-orange-50/40 dark:bg-orange-950/20 transition-all cursor-pointer group">
                  <input
                    ref={serviceFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,text/plain"
                    onChange={handleServiceFileChange}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    id="service-upload-input"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-[#F26522] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      Seret &amp; Lepas berkas (.xlsx / .csv) ke kotak ini atau klik tombol di atas
                    </div>
                  </div>
                </div>

                {/* Alternatif File Selector Standar Peramban */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Atau gunakan tombol peramban bawaan:
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,text/csv,text/plain"
                    onChange={handleServiceFileChange}
                    onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                    className="text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:bg-[#F26522] file:text-white hover:file:bg-[#d95416] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              /* Mode Salin & Tempel (Paste) Teks CSV */
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={servicePasteText}
                  onChange={(e) => setServicePasteText(e.target.value)}
                  placeholder={`Nama Layanan / Produk, Harga Jual, Tipe, Satuan, Durasi\nCuci Kiloan Reguler (Cuci Kering Setrika), 8000, SERVICE, kg, 2 HARI\nCuci Kiloan Express 24 Jam, 12000, SERVICE, kg, 1 HARI\nCuci Bed Cover King / Jumbo, 35000, SERVICE, pc, 2 HARI\nDry Clean Jas & Celana Formal, 50000, SERVICE, stel, 3 HARI\nParfum Laundry Premium 250ml, 35000, PRODUCT, pc, 0`}
                  className="w-full font-mono text-xs p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#F26522] text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
                <button
                  type="button"
                  disabled={isProcessingService || !servicePasteText.trim()}
                  onClick={handleServicePasteSubmit}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isProcessingService ? 'Memproses...' : 'Proses &amp; Simpan Teks CSV'}</span>
                </button>
              </div>
            )}

            {/* Staging Table Preview */}
            {serviceRows.length > 0 && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Hasil Pratinjau ({serviceRows.length} item dibaca, {serviceRows.filter(r => r.isValid).length} valid)
                  </div>
                  <button
                    type="button"
                    disabled={isProcessingService || serviceRows.filter(r => r.isValid).length === 0}
                    onClick={handleCommitServiceImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isProcessingService ? 'Menyimpan...' : 'Simpan Ulang ke Katalog Master'}</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Status</th>
                        <th className="p-3">Tipe</th>
                        <th className="p-3">Nama Layanan / Produk</th>
                        <th className="p-3">Harga Jual</th>
                        <th className="p-3">Satuan</th>
                        <th className="p-3">HPP</th>
                        <th className="p-3">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {serviceRows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 dark:hover:bg-slate-950/60' : 'bg-rose-50/50 dark:bg-rose-950/30'}>
                          <td className="p-3 font-bold">
                            {row.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Valid
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold" title={row.errors.join(', ')}>
                                ✕ {row.errors[0]}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              row.item_type === 'PRODUCT'
                                ? 'bg-[#F26522]/10 text-[#F26522]'
                                : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                            }`}>
                              {row.item_type}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{row.nama}</td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {row.base_harga.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">per {row.pricing_unit}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">Rp {(row.hpp || 0).toLocaleString('id-ID')}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {row.duration_val ? `${row.duration_val} ${row.duration_unit}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* TEMPLATE & EKSPOR LAYANAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Download Template Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#F26522]" />
                  <span>2. Unduh Format Template Layanan</span>
                </span>
                <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                  Format Standar
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => ImportExportService.downloadServiceTemplate('xlsx')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Template Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => ImportExportService.downloadServiceTemplate('csv')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Template CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* Quick Export Card */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#F26522]" />
                  <span>3. Ekspor Katalog Master</span>
                </span>
                <span className="text-[10px] font-bold bg-[#F26522]/20 text-[#F26522] px-2 py-0.5 rounded">
                  {currentCatalog.length} Item
                </span>
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleExportCatalog}
                  className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-[#F26522] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Semua Item ke Excel (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
