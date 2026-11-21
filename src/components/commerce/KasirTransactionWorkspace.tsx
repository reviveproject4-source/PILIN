'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  ShoppingCart, DollarSign, CreditCard, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Send, FileText, UserCheck, Users, MessageSquare, 
  Sparkles, Camera, Image as ImageIcon, Search, Phone, Printer, X, Filter,
  Home, Settings, Edit3, Bookmark, LogOut, HelpCircle, Info, User, Save, PhoneCall, ChevronRight, ChevronDown, Sun, Moon,
  PlusCircle, Wrench, BarChart3, UserPlus, ArrowRight, Trash2, Plus, MapPin, Edit2, FileSpreadsheet, RotateCcw,
  Gift, Percent, Wallet, Award, Share2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import { PresensiModule } from '../people/PresensiModule';
import { BroadcastCameraModal } from '../broadcast/BroadcastCameraModal';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { RetentionDomainService, SapaanLogRecord } from '@/domains/retention/retentionDomainService';
import { BusinessProfileService } from '@/domains/business/businessProfileService';
import { ServiceCatalogService, ServiceCatalogItem, formatDurationLabel } from '@/domains/catalog/serviceCatalogService';
import { CustomerDomainService } from '@/domains/customer/customerService';
import { BluetoothPrinterService } from '@/domains/printer/bluetoothPrinterService';
import { ImportExportService } from '@/domains/commerce/importExportService';
import { DataImportExportManager } from '@/components/admin/DataImportExportManager';
import { getLiveCustomersAction, saveImportedCustomersAction } from '@/app/actions/importActions';
import { ServiceOrderStatus } from '@/lib/types';
import { Salutation, extractSalutation, formatCustomerName } from '@/lib/salutationHelper';
import { normalizePhoneNumber } from '@/lib/normalizePhoneNumber';
import { IndustryTemplateService, IndustryCategory, IndustryTemplate } from '@/domains/retention/industryTemplateService';
import { TransactionManagementService, RegularTransactionItem, DepositTopupItem } from '@/domains/commerce/transactionManagementService';
import { PromoManagementService, PromoBundleConfig, PromoBasicItem, PromoGeneralItem, PromoVoucherItem } from '@/domains/promo/promoManagementService';

interface KasirTransactionWorkspaceProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorName?: string;
  isDemo?: boolean;
  onLogout?: () => void;
}

export interface PosOrderItem {
  id: string;
  catalog_id?: string;
  service: string;
  qty: number;
  price: number;
  pricing_unit: string;
  item_type: 'PRODUCT' | 'SERVICE';
  duration_val?: number;
  duration_unit?: 'JAM' | 'HARI' | 'MINGGU';
  estimatedCompletion?: string;
  subtotal: number;
}

interface TransactionRecord {
  id: string;
  customer: string;
  phone: string;
  customerAddress?: string;
  service: string;
  qty: number;
  pricing_unit?: string;
  price: number;
  subtotal?: number;
  discount_amount?: number;
  promo_name?: string;
  points_used?: number;
  points_discount?: number;
  points_earned?: number;
  deposit_used?: number;
  remaining_deposit_balance?: number;
  total: number;
  payment_type?: 'LUNAS' | 'DP';
  dp_amount?: number;
  remaining_amount?: number;
  method: 'CASH' | 'QRIS_TRANSFER' | 'DEPOSIT';
  status: string;
  time: string;
  estimatedCompletion?: string;
  itemPhotoUrl?: string | null;
  items?: PosOrderItem[];
}

export interface PosCustomerItem {
  id: string;
  name: string;
  phone: string;
  address?: string;
  status: string;
  totalTrx: number;
  lastVisit: string;
  depositBalance?: number;
  loyaltyPoints?: number;
}

export const DEFAULT_POS_CUSTOMERS: PosCustomerItem[] = [
  { id: 'cust-sl-081218388131', name: 'Pak cece', phone: '081218388131', address: '', status: 'REPEAT', totalTrx: 2, lastVisit: '2026-09-03', depositBalance: 200000, loyaltyPoints: 20 },
  { id: 'cust-sl-081283164785', name: 'Bu Reynanda', phone: '081283164785', address: '', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-28', depositBalance: 175000, loyaltyPoints: 12 },
  { id: 'cust-sl-085694206061', name: 'Bu sonya', phone: '085694206061', address: '', status: 'REPEAT', totalTrx: 2, lastVisit: '2026-08-27', depositBalance: 0, loyaltyPoints: 15 },
  { id: 'cust-sl-081387654321', name: 'Pak abdul', phone: '081387654321', address: '', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-26', depositBalance: 50000, loyaltyPoints: 8 },
  { id: 'cust-sl-081298765432', name: 'Bu maya', phone: '081298765432', address: '', status: 'REPEAT', totalTrx: 3, lastVisit: '2026-08-25', depositBalance: 100000, loyaltyPoints: 30 },
  { id: 'cust-sl-081311223344', name: 'Bu dewi', phone: '081311223344', address: '', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-24', depositBalance: 0, loyaltyPoints: 5 },
  { id: 'cust-sl-081233445566', name: 'Pak roni', phone: '081233445566', address: '', status: 'REPEAT', totalTrx: 2, lastVisit: '2026-08-23', depositBalance: 25000, loyaltyPoints: 18 },
  { id: 'cust-sl-081255667788', name: 'Bu siti', phone: '081255667788', address: '', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-22', depositBalance: 0, loyaltyPoints: 6 },
];

export function KasirTransactionWorkspace({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  actorUserId = 'user-kasir-01',
  actorName = 'Kasir',
  isDemo = false,
  onLogout,
}: KasirTransactionWorkspaceProps) {
  const { theme, setTheme } = useTheme();
  
  // Navigation State for Bottom Nav (BERANDA | Konsumen | CRM | Pengaturan)
  const [activeBottomNav, setActiveBottomNav] = useState<'BERANDA' | 'KONSUMEN' | 'CRM' | 'PENGATURAN'>('BERANDA');

  // Modal Views for Beranda Quick Actions & Menu Items
  const [showPosModal, setShowPosModal] = useState<boolean>(false);
  const [showSpkModal, setShowSpkModal] = useState<boolean>(false);
  const [showPickupModal, setShowPickupModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [showImportExportModal, setShowImportExportModal] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'POS' | 'SPK' | 'CUSTOMER' | 'WA_ENGINE' | 'BROADCAST' | 'OPERASIONAL' | 'PRESENSI' | 'PENGATURAN' | null>(null);

  // Kasir Settings State (Edit Profil, Printer, Theme & About Modals)
  const [profileName, setProfileName] = useState<string>(actorName || 'Kasir');
  const [profilePhone, setProfilePhone] = useState<string>('08123456789');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showPrinterModal, setShowPrinterModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

  // Bluetooth Direct Thermal Printer State
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState<string | null>(() => {
    return BluetoothPrinterService.getConnectedDeviceName();
  });
  const [isConnectingBt, setIsConnectingBt] = useState<boolean>(false);
  const [isPrintingBt, setIsPrintingBt] = useState<boolean>(false);

  const handleConnectBluetooth = async () => {
    setIsConnectingBt(true);
    const res = await BluetoothPrinterService.connect();
    setIsConnectingBt(false);
    if (res.success && res.deviceName) {
      setBluetoothDeviceName(res.deviceName);
      setFeedback({ type: 'success', text: `Printer Bluetooth '${res.deviceName}' berhasil tersambung!` });
    } else if (res.error) {
      setFeedback({ type: 'error', text: res.error });
    }
  };

  const handleDisconnectBluetooth = () => {
    BluetoothPrinterService.disconnect();
    setBluetoothDeviceName(null);
    setFeedback({ type: 'success', text: 'Koneksi printer Bluetooth telah diputuskan.' });
  };

  // Business Profile State (Standard PILIN: No WA Pengirim Nota = No WA Kontak Resmi dari Menu Identitas Usaha & Nota)
  const [businessProfile, setBusinessProfile] = useState(() => BusinessProfileService.getProfile(businessId));

  React.useEffect(() => {
    const handleProfileUpdate = () => {
      setBusinessProfile(BusinessProfileService.getProfile(businessId));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pilin_business_profile_updated', handleProfileUpdate);
      window.addEventListener('storage', handleProfileUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pilin_business_profile_updated', handleProfileUpdate);
        window.removeEventListener('storage', handleProfileUpdate);
      }
    };
  }, [businessId]);

  // Promo & Loyalty State
  const [promoBundle, setPromoBundle] = useState<PromoBundleConfig>(() => PromoManagementService.getConfig(businessId));
  const [selectedPromoBasicId, setSelectedPromoBasicId] = useState<string>('');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState<boolean>(false);
  const [redeemedPointsQty, setRedeemedPointsQty] = useState<number>(0);
  const [useDeposit, setUseDeposit] = useState<boolean>(true);

  // CRM Promo Sub-Tab State
  const [promoCrmSubTab, setPromoCrmSubTab] = useState<'PROMO_GENERAL' | 'VOUCHER' | 'OVERDUE_WA'>('PROMO_GENERAL');
  const [promoGeneralCustomerTarget, setPromoGeneralCustomerTarget] = useState<string>('');

  // Top-Up Deposit Modal State (Transaksi Terpisah dari Nota Reguler)
  const [showTopupModal, setShowTopupModal] = useState<boolean>(false);
  const [topupTargetCustomer, setTopupTargetCustomer] = useState<PosCustomerItem | null>(null);
  const [topupCustSearch, setTopupCustSearch] = useState<string>('');
  const [showTopupCustSuggestions, setShowTopupCustSuggestions] = useState<boolean>(false);
  const [isNewTopupCustomer, setIsNewTopupCustomer] = useState<boolean>(false);
  const [topupCustName, setTopupCustName] = useState<string>('');
  const [topupCustPhone, setTopupCustPhone] = useState<string>('');
  const [topupAmount, setTopupAmount] = useState<number | ''>(100000);
  const [topupMethod, setTopupMethod] = useState<'CASH' | 'QRIS_TRANSFER'>('CASH');
  const [topupNotes, setTopupNotes] = useState<string>('Top-up deposit saldo laundry');
  const topupCustomerDropdownRef = useRef<HTMLDivElement>(null);

  // Listen to Promo Updates from Owner
  React.useEffect(() => {
    const handlePromoUpdate = () => {
      setPromoBundle(PromoManagementService.getConfig(businessId));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pilin_promos_updated', handlePromoUpdate);
      window.addEventListener('storage', handlePromoUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pilin_promos_updated', handlePromoUpdate);
        window.removeEventListener('storage', handlePromoUpdate);
      }
    };
  }, [businessId]);

  const handlePrintBluetooth = async (trx: TransactionRecord) => {
    if (!BluetoothPrinterService.isConnected()) {
      setIsConnectingBt(true);
      const conn = await BluetoothPrinterService.connect();
      setIsConnectingBt(false);
      if (!conn.success) {
        if (conn.error) setFeedback({ type: 'error', text: conn.error });
        return;
      }
      setBluetoothDeviceName(conn.deviceName || 'Printer Bluetooth POS');
    }

    setIsPrintingBt(true);
    const profile = businessProfile || BusinessProfileService.getProfile(businessId);
    const res = await BluetoothPrinterService.printReceipt(trx, profile, actorName || 'Kasir');
    setIsPrintingBt(false);

    if (res.success) {
      setFeedback({ type: 'success', text: `Nota ${trx.id} berhasil dicetak via printer Bluetooth!` });
    } else {
      setFeedback({ type: 'error', text: res.error || 'Gagal mencetak ke printer Bluetooth.' });
    }
  };

  const handleSaveKasirProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setShowEditProfileModal(false);
    setFeedback({ type: 'success', text: `Profil Kasir '${profileName}' (${profilePhone}) berhasil diperbarui.` });
  };

  const handleKasirLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      // Fallback
    }
    window.location.href = '/';
  };

  // Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastTargetPhone, setBroadcastTargetPhone] = useState<string>(isDemo ? '08123456789' : '');
  const [broadcastTargetName, setBroadcastTargetName] = useState<string>(isDemo ? 'Bapak Budi Santoso' : '');

  // Thermal Receipt Modal State
  const [activeReceiptTrx, setActiveReceiptTrx] = useState<TransactionRecord | null>(null);

  // Multi-tier customer initial loader (searches tenant key, global backups, and all local keys)
  const loadInitialCustomers = (bizId: string): PosCustomerItem[] => {
    if (typeof window === 'undefined') return DEFAULT_POS_CUSTOMERS;
    try {
      // 1. Direct tenant match
      const saved = localStorage.getItem(`pilin_kasir_customers_${bizId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      // 2. Master / Global Backup key
      const master = localStorage.getItem('pilin_kasir_customers_master') ||
                     localStorage.getItem('pilin_kasir_customers_global_backup');
      if (master) {
        const parsed = JSON.parse(master);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      // 3. Scan all localStorage keys for any customer list with valid data
      let bestList: PosCustomerItem[] | null = null;
      let maxLen = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('pilin_kasir_customers_') || key.includes('customer'))) {
          try {
            const val = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(val) && val.length > maxLen) {
              maxLen = val.length;
              bestList = val;
            }
          } catch {}
        }
      }
      if (bestList && bestList.length > 0) return bestList;

      // 4. Fallback default key
      const def = localStorage.getItem('pilin_kasir_customers_default');
      if (def) {
        const parsed = JSON.parse(def);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_POS_CUSTOMERS;
  };

  // Customer DB Local State with Multi-Tier LocalStorage & Server Persistence
  const [customerList, setCustomerList] = useState<PosCustomerItem[]>(() => loadInitialCustomers(businessId));

  const saveCustomers = (list: PosCustomerItem[]) => {
    setCustomerList(list);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pilin_kasir_customers_${businessId}`, JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_master', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_global_backup', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_default', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_trio-r-laundry', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_8ec99d6e-3f6f-47d4-910f-265cfe26c609', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_tenant-001', JSON.stringify(list));
        localStorage.setItem('pilin_kasir_customers_demo-tenant', JSON.stringify(list));
      } catch {
        // ignore
      }
    }
    try {
      saveImportedCustomersAction(businessId, list.map(c => ({
        id: c.id,
        business_id: businessId,
        name: c.name,
        phone: c.phone,
        address: c.address,
        status: c.status,
        totalTrx: c.totalTrx,
        lastVisit: c.lastVisit,
      }))).catch(() => {});
    } catch {}
  };

  // Auto-sync with Server Persistent Store (pilin_customers.json) on mount
  React.useEffect(() => {
    getLiveCustomersAction(businessId).then(serverList => {
      if (serverList && serverList.length > 0) {
        setCustomerList(prev => {
          const phoneMap = new Map<string, PosCustomerItem>();
          serverList.forEach(s => phoneMap.set(s.phone, {
            id: s.id,
            name: s.name,
            phone: s.phone,
            address: s.address,
            status: s.status || 'NEW',
            totalTrx: s.totalTrx || 1,
            lastVisit: s.lastVisit || new Date().toISOString().substring(0, 10),
          }));
          prev.forEach(p => phoneMap.set(p.phone, p));
          const merged = Array.from(phoneMap.values());
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`pilin_kasir_customers_${businessId}`, JSON.stringify(merged));
              localStorage.setItem('pilin_kasir_customers_master', JSON.stringify(merged));
              localStorage.setItem('pilin_kasir_customers_global_backup', JSON.stringify(merged));
              localStorage.setItem('pilin_kasir_customers_default', JSON.stringify(merged));
            } catch {}
          }
          return merged;
        });
      }
    }).catch(() => {});
  }, [businessId]);

  // Helper: Format duration to milliseconds
  const getDurationMs = (durationVal?: number, durationUnit?: 'JAM' | 'HARI' | 'MINGGU', hoursFallback?: number): number => {
    if (durationVal && durationUnit) {
      if (durationUnit === 'JAM') return durationVal * 3600000;
      if (durationUnit === 'MINGGU') return durationVal * 7 * 86400000;
      return durationVal * 86400000; // HARI
    }
    if (hoursFallback) {
      return hoursFallback * 3600000;
    }
    return 24 * 3600000; // default 1 hari
  };

  const formatCompletionDate = (ms: number): string => {
    const d = new Date(Date.now() + ms);
    return d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
  };

  // Helper: Format completion time based on duration value & unit
  const calculateDefaultCompletion = (durationVal?: number, durationUnit?: 'JAM' | 'HARI' | 'MINGGU', hoursFallback?: number): string => {
    return formatCompletionDate(getDurationMs(durationVal, durationUnit, hoursFallback));
  };

  // Helper: Calculate completion date taking the longest duration among non-product services
  const calculateLongestCompletion = (items: PosOrderItem[]): string | undefined => {
    const serviceItems = items.filter(it => it.item_type !== 'PRODUCT');
    if (serviceItems.length === 0) return undefined;

    let maxDurationMs = 0;
    for (const it of serviceItems) {
      let itemMs = 0;
      if (it.duration_val && it.duration_unit) {
        itemMs = getDurationMs(it.duration_val, it.duration_unit);
      } else {
        const cat = catalog.find(c => c.id === it.catalog_id || c.nama === it.service);
        itemMs = getDurationMs(cat?.duration_val, cat?.duration_unit, cat?.duration_hours);
      }
      if (itemMs > maxDurationMs) {
        maxDurationMs = itemMs;
      }
    }

    if (maxDurationMs <= 0) {
      maxDurationMs = 24 * 3600000;
    }

    return formatCompletionDate(maxDurationMs);
  };

  // Catalog & POS Form State
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>(() => {
    return isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
  });
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedSalutation, setSelectedSalutation] = useState<Salutation>('Kak');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);

  // Sync customer details only if an ID was explicitly chosen/set
  React.useEffect(() => {
    if (customerList.length > 0 && selectedCustomerId && selectedCustomerId !== 'NEW_CUSTOMER') {
      const found = customerList.find(c => c.id === selectedCustomerId);
      if (found) {
        setSelectedCustomerId(found.id);
        const ext = extractSalutation(found.name);
        setSelectedSalutation(ext.salutation || 'Kak');
        setCustomerName(ext.cleanName || found.name);
        setCustomerPhone(found.phone);
        setCustomerAddress(found.address || '');
      }
    }
  }, [customerList, selectedCustomerId]);

  // Multi-Item Order State (Bisa Tambah Lebih dari 1 Layanan)
  const [orderItems, setOrderItems] = useState<PosOrderItem[]>([]);

  // Item Picker State (Untuk Menambahkan Item ke Nota) — Default kosong, kasir mengetik terlebih dahulu
  const [selectedService, setSelectedService] = useState<string>('');
  const [servicePrice, setServicePrice] = useState<number>(0);
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>('');
  const [qty, setQty] = useState<number>(1);

  // Customer Smart Search Combobox State — Default tertutup sampai diketik
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Service Smart Search Combobox State — Default kosong, kasir mengetik terlebih dahulu
  const [serviceSearchText, setServiceSearchText] = useState<string>('');
  const [showServiceSuggestions, setShowServiceSuggestions] = useState<boolean>(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for suggestions
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerSuggestions(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceSuggestions(false);
      }
      if (topupCustomerDropdownRef.current && !topupCustomerDropdownRef.current.contains(event.target as Node)) {
        setShowTopupCustSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filtered customers for Top-Up Search
  const matchingTopupCustomers = useMemo(() => {
    const q = topupCustSearch.toLowerCase().trim();
    if (!q) return customerList.slice(0, 8);
    const cleanDigits = q.replace(/[^0-9]/g, '');
    return customerList.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = cleanDigits.length >= 3 && c.phone.replace(/[^0-9]/g, '').includes(cleanDigits);
      return matchName || matchPhone;
    });
  }, [customerList, topupCustSearch]);

  // Filtered customers matching typed name or phone (hanya keluar jika ditulis)
  const matchingCustomers = useMemo(() => {
    const q = customerName.toLowerCase().trim();
    if (!q) return [];
    const cleanDigits = q.replace(/[^0-9]/g, '');
    return customerList.filter(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = cleanDigits.length >= 3 && c.phone.replace(/[^0-9]/g, '').includes(cleanDigits);
      return matchName || matchPhone;
    });
  }, [customerList, customerName]);

  const handleSelectCustomerFromSuggestion = (c: PosCustomerItem) => {
    setSelectedCustomerId(c.id);
    setIsNewCustomerMode(false);
    const { salutation, cleanName } = extractSalutation(c.name);
    setSelectedSalutation(salutation || 'Kak');
    setCustomerName(cleanName || c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    if (c.depositBalance && c.depositBalance > 0) {
      setUseDeposit(true);
    }
    setShowCustomerSuggestions(false);
  };

  // Filtered services matching search text (hanya keluar jika ditulis)
  const matchingServices = useMemo(() => {
    const q = serviceSearchText.toLowerCase().trim();
    if (!q) return [];
    return catalog.filter(item => 
      item.nama.toLowerCase().includes(q) || 
      (item.sku && item.sku.toLowerCase().includes(q))
    );
  }, [catalog, serviceSearchText]);

  const handleSelectServiceFromSuggestion = (item: ServiceCatalogItem) => {
    setSelectedService(item.nama);
    setServiceSearchText(item.nama);
    setServicePrice(item.base_harga);
    if (item.item_type !== 'PRODUCT') {
      setEstimatedCompletion(calculateDefaultCompletion(item.duration_val, item.duration_unit, item.duration_hours));
    } else {
      setEstimatedCompletion('');
    }
    setShowServiceSuggestions(false);
  };

  // Photo Evidence State (Kamera atau Galeri)
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Payment & DP State
  const [paymentType, setPaymentType] = useState<'LUNAS' | 'DP'>('LUNAS');
  const [dpAmount, setDpAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS_TRANSFER'>('CASH');

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setItemPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOrderItem = () => {
    const targetName = selectedService || serviceSearchText;
    if (!targetName.trim()) return;
    const found = catalog.find(c => c.nama.toLowerCase() === targetName.toLowerCase()) || catalog.find(c => c.nama === targetName);

    const finalPrice = found ? found.base_harga : (servicePrice || 0);
    const finalQty = Math.max(1, qty);
    const itemSubtotal = finalPrice * finalQty;
    const isService = found ? found.item_type !== 'PRODUCT' : true;

    const newItem: PosOrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      catalog_id: found ? found.id : `custom-${Date.now()}`,
      service: found ? found.nama : targetName,
      qty: finalQty,
      price: finalPrice,
      pricing_unit: (found?.pricing_unit || (isService ? 'sepasang' : 'pc')) as string,
      item_type: found?.item_type || 'SERVICE',
      duration_val: isService ? (found?.duration_val || 1) : undefined,
      duration_unit: isService ? (found?.duration_unit || 'HARI') : undefined,
      estimatedCompletion: isService ? (estimatedCompletion || (found ? calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours) : '')) : undefined,
      subtotal: itemSubtotal,
    };

    setOrderItems(prev => [...prev, newItem]);
    setQty(1);
    setSelectedService('');
    setServiceSearchText('');
    setServicePrice(0);
    setEstimatedCompletion('');
    setShowServiceSuggestions(false);
    setFeedback({ type: 'success', text: `Layanan '${newItem.service}' (${newItem.qty} ${newItem.pricing_unit}) berhasil ditambahkan ke daftar nota.` });
  };

  const handleRemoveOrderItem = (itemId: string) => {
    setOrderItems(prev => prev.filter(it => it.id !== itemId));
  };

  // Subtotal before discounts
  const subtotalBill = useMemo(() => {
    if (orderItems.length > 0) {
      return orderItems.reduce((acc, it) => acc + it.subtotal, 0);
    }
    return (servicePrice || 0) * (qty || 1);
  }, [orderItems, servicePrice, qty]);

  // Selected promo basic item
  const selectedPromoBasic = useMemo(() => {
    return promoBundle.basics.find(b => b.id === selectedPromoBasicId && b.is_active) || null;
  }, [promoBundle.basics, selectedPromoBasicId]);

  // Selected customer object
  const currentSelectedCustomer = useMemo(() => {
    return customerList.find(c => c.id === selectedCustomerId || (customerPhone && c.phone === customerPhone.trim()));
  }, [customerList, selectedCustomerId, customerPhone]);

  const customerLoyaltyPoints = currentSelectedCustomer?.loyaltyPoints || 0;
  const customerDepositBalance = currentSelectedCustomer?.depositBalance || 0;

  // Promo Basic Discount in Rp
  const promoDiscountAmount = useMemo(() => {
    if (!selectedPromoBasicId || customDiscountPercent <= 0) return 0;
    return Math.round((subtotalBill * customDiscountPercent) / 100);
  }, [subtotalBill, selectedPromoBasicId, customDiscountPercent]);

  const afterPromoSubtotal = Math.max(0, subtotalBill - promoDiscountAmount);

  // Loyalty Points Discount in Rp
  const pointsDiscountAmount = useMemo(() => {
    if (!useLoyaltyPoints || redeemedPointsQty <= 0) return 0;
    const calc = PromoManagementService.calculatePointsDiscount(redeemedPointsQty, promoBundle.poin);
    return Math.min(afterPromoSubtotal, calc);
  }, [useLoyaltyPoints, redeemedPointsQty, promoBundle.poin, afterPromoSubtotal]);

  // Final Total Bill after all discounts
  const totalBill = Math.max(0, afterPromoSubtotal - pointsDiscountAmount);

  // Projected points earned on this transaction
  const projectedPointsEarned = useMemo(() => {
    return PromoManagementService.calculatePointsEarned(totalBill, promoBundle.poin);
  }, [totalBill, promoBundle.poin]);

  // Overall transaction estimated completion: longest duration among services
  const longestEstimatedCompletion = useMemo(() => {
    if (orderItems.length > 0) {
      return calculateLongestCompletion(orderItems);
    }
    const found = catalog.find(c => c.nama === selectedService);
    if (found && found.item_type !== 'PRODUCT') {
      return estimatedCompletion || calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours);
    }
    return undefined;
  }, [orderItems, catalog, selectedService, estimatedCompletion]);

  // Saldo Deposit Deduction: deposit berkurang dari total transaksi pada nota
  const depositDeductionAmount = useMemo(() => {
    if (!useDeposit || customerDepositBalance <= 0) return 0;
    return Math.min(totalBill, customerDepositBalance);
  }, [useDeposit, customerDepositBalance, totalBill]);

  const payableBillAfterDeposit = Math.max(0, totalBill - depositDeductionAmount);
  const remainingDepositBalance = Math.max(0, customerDepositBalance - depositDeductionAmount);

  const finalDpAmount = paymentType === 'LUNAS' || payableBillAfterDeposit === 0
    ? payableBillAfterDeposit
    : (dpAmount === '' ? 0 : Number(dpAmount));
  const remainingAmount = Math.max(0, payableBillAfterDeposit - finalDpAmount);

  const handlePromoBasicChange = (promoId: string) => {
    setSelectedPromoBasicId(promoId);
    if (!promoId) {
      setCustomDiscountPercent(0);
      return;
    }
    const found = promoBundle.basics.find(b => b.id === promoId);
    if (found) {
      setCustomDiscountPercent(found.percentage);
    }
  };

  // Open Standalone Top-Up Deposit Modal (Terpisah dari Transaksi Reguler)
  const handleOpenStandaloneTopup = (target?: PosCustomerItem) => {
    if (target) {
      setTopupTargetCustomer(target);
      setTopupCustSearch(target.name);
    } else {
      setTopupTargetCustomer(null);
      setTopupCustSearch('');
    }
    setIsNewTopupCustomer(false);
    setTopupCustName('');
    setTopupCustPhone('');
    setTopupAmount(100000);
    setTopupMethod('CASH');
    setTopupNotes('Top-up deposit saldo laundry');
    setShowTopupCustSuggestions(false);
    setShowTopupModal(true);
  };

  // Top-Up Deposit Execution Handler (Terpisah dari Transaksi Reguler)
  const handleExecuteTopup = (e: React.FormEvent) => {
    e.preventDefault();
    let target = topupTargetCustomer;
    if (!target) {
      if (!topupCustName.trim() || !topupCustPhone.trim()) {
        setFeedback({ type: 'error', text: 'Silakan pilih atau masukkan data pelanggan terlebih dahulu untuk top-up deposit.' });
        return;
      }
      const cleanPhone = topupCustPhone.trim();
      const existing = customerList.find(c => c.phone === cleanPhone);
      if (existing) {
        target = existing;
      } else {
        const newCust: PosCustomerItem = {
          id: `cust-${Date.now()}`,
          name: formatCustomerName(topupCustName.trim(), 'Kak'),
          phone: cleanPhone,
          status: 'REGULAR',
          totalTrx: 0,
          lastVisit: new Date().toISOString().substring(0, 10),
          depositBalance: 0,
          loyaltyPoints: 0,
        };
        const updated = [newCust, ...customerList];
        saveCustomers(updated);
        target = newCust;
      }
    }

    const numAmount = Number(topupAmount) || 0;
    if (numAmount <= 0) {
      setFeedback({ type: 'error', text: 'Nominal top-up harus lebih besar dari 0.' });
      return;
    }

    const prevBal = target.depositBalance || 0;
    const newBal = prevBal + numAmount;
    const newTopupId = `DEP-2026-${Date.now().toString().slice(-4)}`;

    TransactionManagementService.addDepositTopup(businessId, {
      id: newTopupId,
      business_id: businessId,
      customer_id: target.id,
      customer_name: target.name,
      customer_phone: target.phone,
      amount: numAmount,
      previous_balance: prevBal,
      current_balance: newBal,
      payment_method: topupMethod,
      status: 'SUCCESS',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      date: new Date().toISOString().substring(0, 10),
      notes: topupNotes || 'Top up deposit saldo laundry',
    });

    const updated = customerList.map(c => {
      if (c.id === target!.id || c.phone === target!.phone) {
        return {
          ...c,
          depositBalance: newBal,
        };
      }
      return c;
    });
    saveCustomers(updated);

    setShowTopupModal(false);
    setTopupTargetCustomer(null);
    setTopupCustSearch('');
    setIsNewTopupCustomer(false);
    setTopupCustName('');
    setTopupCustPhone('');
    setFeedback({
      type: 'success',
      text: `Top-up deposit Rp ${numAmount.toLocaleString('id-ID')} (${topupMethod === 'CASH' ? 'Tunai' : 'QRIS/Transfer'}) untuk ${target.name} berhasil disimpan! Saldo sekarang: Rp ${newBal.toLocaleString('id-ID')}.`,
    });
  };

  React.useEffect(() => {
    const refreshCatalog = () => {
      const items = isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
      setCatalog(items);
      if (items.length > 0) {
        setSelectedService(prev => {
          if (prev && !items.some(i => i.nama === prev)) {
            setServicePrice(0);
            setEstimatedCompletion('');
            return '';
          }
          return prev;
        });
      } else {
        setSelectedService('');
        setServicePrice(0);
        setEstimatedCompletion('');
      }
    };

    refreshCatalog();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', refreshCatalog);
      return () => window.removeEventListener('storage', refreshCatalog);
    }
  }, [isDemo]);

  // Approvals State (Pembatalan Nota ke Kepala Cabang)
  const [cancelNotaNumber, setCancelNotaNumber] = useState<string>(isDemo ? 'NOT-2026-0885' : '');
  const [cancelReason, setCancelReason] = useState<string>('Pelanggan membatalkan pesanan');

  // Customer DB Form
  const [newCustSalutation, setNewCustSalutation] = useState<Salutation>('Kak');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // WA Engine / CRM State
  const [waSelectedCustomerId, setWaSelectedCustomerId] = useState<string>(isDemo ? 'cust-101' : '');
  const [waTargetName, setWaTargetName] = useState<string>(isDemo ? 'Bapak Budi Santoso' : '');
  const [waTargetPhone, setWaTargetPhone] = useState<string>(isDemo ? '08123456789' : '');
  const [waCategory, setWaCategory] = useState<'KABAR_BERKALA' | 'QUOTE' | 'REMINDER' | 'MANUAL'>('KABAR_BERKALA');
  const [waTemplateText, setWaTemplateText] = useState<string>(
    isDemo ? 'Halo Bapak Budi Santoso, ini kabar berkala dari PILIN ERP. Terima kasih telah setia menggunakan layanan kami! Salam hangat.' : ''
  );

  // WA Retention Logs & Mandate Execution State
  const [waLogs, setWaLogs] = useState<SapaanLogRecord[]>(() => RetentionDomainService.getSapaanLogs(isDemo));

  // Reminder H+X Per Nota State
  const [reminderNotaNumber, setReminderNotaNumber] = useState<string>(isDemo ? 'NOT-2026-0891' : '');
  const [reminderCustomerName, setReminderCustomerName] = useState<string>(isDemo ? 'Ibu Dewi Lestari' : '');
  const [reminderCustomerPhone, setReminderCustomerPhone] = useState<string>(isDemo ? '08212345678' : '');
  const [reminderHPlusDays, setReminderHPlusDays] = useState<number>(30);

  const refreshWaLogs = () => {
    setWaLogs(RetentionDomainService.getSapaanLogs(isDemo));
  };

  const handleExecuteMandateOrReminder = (logRecord: SapaanLogRecord) => {
    const executed = RetentionDomainService.executeWaByKasir(logRecord.id);
    if (executed) {
      refreshWaLogs();
      RetentionDomainService.openDirectWhatsApp(executed.customer_phone, executed.message_text);
      setFeedback({ 
        type: 'success', 
        text: `Membuka WhatsApp langsung (WA Cepat) ke nomor tujuan ${executed.customer_name} (${executed.customer_phone}). Pesan siap dikirim.` 
      });
    }
  };

  const handleCreateNotaReminder = (e: React.FormEvent) => {
    e.preventDefault();
    RetentionDomainService.createReminderByNota({
      nota_number: reminderNotaNumber,
      customer_name: reminderCustomerName,
      customer_phone: reminderCustomerPhone,
      h_plus_days: reminderHPlusDays,
    });
    refreshWaLogs();
    setFeedback({ type: 'success', text: `Pengingat/Reminder H+${reminderHPlusDays} untuk Nota ${reminderNotaNumber} (${reminderCustomerName}) berhasil dibuat dan tersimpan secara persisten.` });
  };

  // SPK Orders State
  const [spkOrders] = useState<WorkOrderQueueItem[]>(() => WorkQueueService.getOrders(branchId, isDemo));

  // Kumulatif Notifikasi Operasional Nota Kasir
  const dueTodayOrders = useMemo(() => {
    return spkOrders.filter(o => (o.status as any) !== 'CLOSED' && (o.status as any) !== 'DELIVERED');
  }, [spkOrders]);

  const overdueOrders = useMemo(() => {
    return spkOrders.filter(o => (o.status as any) !== 'CLOSED' && (o.status as any) !== 'DELIVERED' && o.elapsed_minutes > o.target_minutes);
  }, [spkOrders]);

  const readyPickupOrders = useMemo(() => {
    return spkOrders.filter(o => (o.status as any) === 'READY_FOR_PICKUP' || (o.status as any) === 'READY_FOR_DELIVERY');
  }, [spkOrders]);

  // Transactions State with LocalStorage Persistence
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`pilin_kasir_recent_trx_${businessId}`) || localStorage.getItem('pilin_kasir_recent_trx_master');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    if (isDemo) {
      return [
        { id: 'NOT-2026-0892', customer: 'Pak cece', phone: '081218388131', service: 'Cuci Kiloan Reguler', qty: 5, price: 10000, total: 50000, method: 'CASH', status: 'COMPLETED', time: '11:05 WIB' },
        { id: 'NOT-2026-0891', customer: 'Bu Reynanda', phone: '081283164785', service: 'Bed Cover Jumbo', qty: 1, price: 35000, total: 35000, method: 'QRIS_TRANSFER', status: 'COMPLETED', time: '10:45 WIB' },
        { id: 'NOT-2026-0890', customer: 'Bu sonya', phone: '085694206061', service: 'Cuci Kiloan Express', qty: 3, price: 15000, total: 45000, method: 'CASH', status: 'COMPLETED', time: '09:30 WIB' },
      ];
    }
    return [];
  });

  const saveRecentTransactions = (list: TransactionRecord[]) => {
    setRecentTransactions(list);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pilin_kasir_recent_trx_${businessId}`, JSON.stringify(list));
        localStorage.setItem('pilin_kasir_recent_trx_master', JSON.stringify(list));
      } catch {}
    }
  };

  const [requestedApprovals, setRequestedApprovals] = useState(() => {
    if (isDemo) {
      return [
        { id: 'req-01', type: 'CANCELLATION', title: 'Permintaan Pembatalan Nota NOT-2026-0891', nota: 'NOT-2026-0891', status: 'MENUNGGU_SETUJU_KC', time: '10:15 WIB' },
      ];
    }
    return [];
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Switch to Existing Registered Customer Mode
  const handleSwitchToExistingCustomer = () => {
    setIsNewCustomerMode(false);
    setIsEditingContact(false);
    const target = customerList.find(c => c.id === selectedCustomerId) || customerList[0];
    if (target) {
      handlePOSCustomerSelect(target.id);
    }
  };

  // Switch to New Customer Mode
  const handleSwitchToNewCustomer = () => {
    setIsNewCustomerMode(true);
    setSelectedCustomerId('NEW_CUSTOMER');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedSalutation('Kak');
    setIsEditingContact(false);
    setUseDeposit(false);
  };

  // Customer Selector Change Handler in POS Form
  const handlePOSCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsEditingContact(false);
    if (customerId === 'NEW_CUSTOMER') {
      setIsNewCustomerMode(true);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setSelectedSalutation('Kak');
      setUseDeposit(false);
    } else {
      setIsNewCustomerMode(false);
      const found = customerList.find(c => c.id === customerId);
      if (found) {
        const { salutation, cleanName } = extractSalutation(found.name);
        setSelectedSalutation(salutation || 'Kak');
        setCustomerName(cleanName || found.name);
        setCustomerPhone(found.phone);
        setCustomerAddress(found.address || '');
        if (found.depositBalance && found.depositBalance > 0) {
          setUseDeposit(true);
        }
      }
    }
  };

  // Update existing customer contact (Phone / Address) directly
  const handleUpdateCurrentCustomerContact = () => {
    if (!customerPhone.trim()) {
      setFeedback({ type: 'error', text: 'Nomor WhatsApp tidak boleh kosong.' });
      return;
    }
    const updated = customerList.map(c => {
      if (c.id === selectedCustomerId) {
        return {
          ...c,
          name: formatCustomerName(customerName, selectedSalutation),
          phone: customerPhone.trim(),
          address: customerAddress.trim() || undefined,
        };
      }
      return c;
    });
    saveCustomers(updated);
    setIsEditingContact(false);
    setFeedback({ type: 'success', text: 'Data kontak pelanggan (No. WA / Alamat) berhasil diperbarui.' });
  };

  // Create Transaction Handler (Mendukung Multi-Layanan, Foto Kamera/Galeri, dan Lunas/DP)
  const handleCreateTransaction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      setFeedback({ type: 'error', text: 'Nama dan Nomor WhatsApp Pelanggan wajib diisi.' });
      return;
    }

    // Determine final items to include in this nota
    let finalItems: PosOrderItem[] = [...orderItems];
    if (finalItems.length === 0) {
      const targetName = selectedService || serviceSearchText;
      if (!targetName.trim()) {
        setFeedback({ type: 'error', text: 'Silakan pilih atau ketik layanan / produk terlebih dahulu.' });
        return;
      }
      const found = catalog.find(c => c.nama.toLowerCase() === targetName.toLowerCase()) || catalog.find(c => c.nama === targetName);
      const isService = found ? found.item_type !== 'PRODUCT' : true;
      const finalPrice = found ? found.base_harga : (servicePrice || 0);
      const finalQty = Math.max(1, qty);
      finalItems = [{
        id: `item-${Date.now()}`,
        catalog_id: found ? found.id : `custom-${Date.now()}`,
        service: found ? found.nama : targetName,
        qty: finalQty,
        price: finalPrice,
        pricing_unit: (found?.pricing_unit || (isService ? 'sepasang' : 'pc')) as string,
        item_type: found?.item_type || 'SERVICE',
        duration_val: isService ? (found?.duration_val || 1) : undefined,
        duration_unit: isService ? (found?.duration_unit || 'HARI') : undefined,
        estimatedCompletion: isService ? (estimatedCompletion || (found ? calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours) : '')) : undefined,
        subtotal: finalPrice * finalQty,
      }];
    }

    if (finalItems.length === 0) {
      setFeedback({ type: 'error', text: 'Nota harus memiliki minimal satu layanan atau produk.' });
      return;
    }

    const subtotal = finalItems.reduce((acc, it) => acc + it.subtotal, 0);
    const promoDisc = selectedPromoBasicId && customDiscountPercent > 0
      ? Math.round((subtotal * customDiscountPercent) / 100)
      : 0;
    const afterPromo = Math.max(0, subtotal - promoDisc);
    const ptsDisc = useLoyaltyPoints && redeemedPointsQty > 0
      ? Math.min(afterPromo, PromoManagementService.calculatePointsDiscount(redeemedPointsQty, promoBundle.poin))
      : 0;
    const finalTotal = Math.max(0, afterPromo - ptsDisc);

    // Deposit Deduction: deposit berkurang dari total transaksi pada nota
    const depositUsed = useDeposit ? Math.min(finalTotal, customerDepositBalance) : 0;
    const payableAfterDeposit = Math.max(0, finalTotal - depositUsed);
    const remainingDepositBal = Math.max(0, customerDepositBalance - depositUsed);

    const isFullyPaidByDeposit = depositUsed > 0 && payableAfterDeposit === 0;
    const effectivePaymentType = isFullyPaidByDeposit ? 'LUNAS' : paymentType;
    const effectivePaymentMethod = isFullyPaidByDeposit ? 'DEPOSIT' : paymentMethod;

    const computedDp = effectivePaymentType === 'LUNAS' ? payableAfterDeposit : (Number(dpAmount) || 0);
    const computedRemaining = Math.max(0, payableAfterDeposit - computedDp);

    if (effectivePaymentType === 'DP' && computedDp <= 0 && payableAfterDeposit > 0) {
      setFeedback({ type: 'error', text: 'Silakan masukkan nominal DP (Uang Muka) lebih besar dari 0.' });
      return;
    }

    const pointsEarned = PromoManagementService.calculatePointsEarned(finalTotal, promoBundle.poin);
    const pointsDeducted = useLoyaltyPoints ? Math.min(customerLoyaltyPoints, redeemedPointsQty) : 0;

    const finalCustomerName = formatCustomerName(customerName, selectedSalutation);
    const finalPhone = customerPhone.trim();
    const finalAddress = customerAddress.trim();
    const serviceSummary = finalItems.length === 1 
      ? finalItems[0].service 
      : `${finalItems[0].service} + ${finalItems.length - 1} layanan lain`;
    
    // Calculate estimated completion taking the longest duration among all services
    const finalEstimatedCompletion = calculateLongestCompletion(finalItems) 
      || (orderItems.length === 0 && estimatedCompletion ? estimatedCompletion : undefined);

    const newTrx: TransactionRecord = {
      id: `NOT-2026-0${recentTransactions.length + 893}`,
      customer: finalCustomerName,
      phone: finalPhone,
      customerAddress: finalAddress || undefined,
      service: serviceSummary,
      qty: finalItems.reduce((sum, it) => sum + it.qty, 0),
      pricing_unit: finalItems[0]?.pricing_unit || 'unit',
      price: finalItems[0]?.price || 0,
      subtotal: subtotal,
      discount_amount: promoDisc,
      promo_name: selectedPromoBasic ? `${selectedPromoBasic.name} (${customDiscountPercent}%)` : undefined,
      points_used: pointsDeducted,
      points_discount: ptsDisc,
      points_earned: pointsEarned,
      deposit_used: depositUsed,
      remaining_deposit_balance: (customerDepositBalance > 0 || depositUsed > 0) ? remainingDepositBal : undefined,
      total: finalTotal,
      payment_type: effectivePaymentType,
      dp_amount: computedDp,
      remaining_amount: computedRemaining,
      method: effectivePaymentMethod,
      status: effectivePaymentType === 'LUNAS' ? 'COMPLETED' : 'DP_PAID',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      estimatedCompletion: finalEstimatedCompletion,
      itemPhotoUrl: itemPhotoUrl,
      items: finalItems,
    };

    saveRecentTransactions([newTrx, ...recentTransactions]);

    // Register into TransactionManagementService for Owner Rekap & Pembatalan
    try {
      TransactionManagementService.addRegularTransaction(businessId, {
        id: newTrx.id,
        business_id: businessId,
        customer: finalCustomerName,
        phone: finalPhone,
        customerAddress: finalAddress || undefined,
        service: serviceSummary,
        qty: newTrx.qty,
        pricing_unit: newTrx.pricing_unit,
        price: newTrx.price,
        subtotal: subtotal,
        discount_amount: promoDisc,
        promo_name: newTrx.promo_name,
        points_used: pointsDeducted,
        points_discount: ptsDisc,
        deposit_used: depositUsed,
        remaining_deposit_balance: (customerDepositBalance > 0 || depositUsed > 0) ? remainingDepositBal : undefined,
        total: finalTotal,
        payment_type: effectivePaymentType,
        dp_amount: computedDp,
        remaining_amount: computedRemaining,
        method: effectivePaymentMethod,
        status: 'COMPLETED',
        time: newTrx.time,
        date: new Date().toISOString().substring(0, 10),
        items: finalItems.map(it => ({
          id: it.id,
          service: it.service,
          qty: it.qty,
          price: it.price,
          pricing_unit: it.pricing_unit,
          subtotal: it.subtotal,
        })),
      });
    } catch (err) {
      console.error('Failed to sync to TransactionManagementService', err);
    }

    setActiveReceiptTrx(newTrx); // Buka Thermal Receipt Modal
    setShowPosModal(false); // Tutup Form Buat Nota Pop-up

    // Auto-save new customer to customerList or update existing customer totalTrx & loyalty points
    if (isNewCustomerMode || !customerList.some(c => c.phone === finalPhone)) {
      const newC: PosCustomerItem = {
        id: `cust-${Date.now()}`,
        name: finalCustomerName,
        phone: finalPhone,
        address: finalAddress || undefined,
        status: 'NEW',
        totalTrx: 1,
        lastVisit: new Date().toISOString().substring(0, 10),
        depositBalance: remainingDepositBal,
        loyaltyPoints: pointsEarned,
      };
      const updatedList = [newC, ...customerList.filter(c => c.phone !== finalPhone)];
      saveCustomers(updatedList);
      setSelectedCustomerId(newC.id);
      setIsNewCustomerMode(false);
    } else {
      const updatedList = customerList.map(c => {
        if (c.id === selectedCustomerId || c.phone === finalPhone) {
          const currentPts = c.loyaltyPoints || 0;
          const nextPts = Math.max(0, currentPts - pointsDeducted) + pointsEarned;
          return {
            ...c,
            name: finalCustomerName,
            phone: finalPhone,
            address: finalAddress || c.address,
            totalTrx: (c.totalTrx || 0) + 1,
            lastVisit: new Date().toISOString().substring(0, 10),
            loyaltyPoints: nextPts,
            depositBalance: remainingDepositBal,
          };
        }
        return c;
      });
      saveCustomers(updatedList);
    }

    try {
      CustomerDomainService.registerCustomer({
        nama: finalCustomerName,
        no_hp: finalPhone,
        alamat: finalAddress || undefined,
        branch_id: branchId,
      });
    } catch {
      // safe ignore
    }

    // Auto-schedule sharp CRM reminder & decrement retail stock for each item in nota
    try {
      const masterCatalog = ServiceCatalogService.getMasterCatalog();
      finalItems.forEach(it => {
        const matched = masterCatalog.find(c => c.nama.toLowerCase() === it.service.toLowerCase());
        const itemType = it.item_type || matched?.item_type || 'SERVICE';
        const reminderDays = matched?.reminder_days || 30;

        if (itemType === 'SERVICE') {
          RetentionDomainService.createMaintenanceReminderForJasa({
            nota_number: newTrx.id,
            customer_name: finalCustomerName,
            customer_phone: customerPhone.trim(),
            item_name: it.service,
            due_days: reminderDays,
          });
        } else {
          RetentionDomainService.createRefillReminderForRetail({
            nota_number: newTrx.id,
            customer_name: finalCustomerName,
            customer_phone: customerPhone.trim(),
            item_name: it.service,
            due_days: reminderDays,
          });

          // Decrement stock for retail product
          if (matched) {
            const currentStock = matched.stock_qty ?? 10;
            const newStock = Math.max(0, currentStock - it.qty);
            ServiceCatalogService.updateMasterService(matched.id, { stock_qty: newStock });
          }
        }
      });

      setWaLogs(RetentionDomainService.getSapaanLogs(isDemo));
    } catch (err) {
      console.error('Failed to process item CRM reminders:', err);
    }

    // Reset Form for next transaction — kembali ke form bersih tanpa default
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setSelectedSalutation('Kak');
    setSelectedService('');
    setServiceSearchText('');
    setServicePrice(0);
    setEstimatedCompletion('');
    setShowCustomerSuggestions(false);
    setShowServiceSuggestions(false);
    setOrderItems([]);
    setItemPhotoUrl(null);
    setPaymentType('LUNAS');
    setDpAmount('');
    setQty(1);
    setSelectedPromoBasicId('');
    setCustomDiscountPercent(0);
    setUseLoyaltyPoints(false);
    setRedeemedPointsQty(0);

    const paymentFeedback = paymentType === 'LUNAS'
      ? `LUNAS (Rp ${finalTotal.toLocaleString('id-ID')})`
      : `DP Rp ${computedDp.toLocaleString('id-ID')} (Sisa: Rp ${computedRemaining.toLocaleString('id-ID')})`;

    setFeedback({
      type: 'success',
      text: `Nota '${newTrx.id}' untuk ${finalCustomerName} berhasil dibuat (${paymentFeedback}). Struk siap dicetak atau dikirim via WA.`,
    });
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setFeedback({ type: 'error', text: 'Nama dan Nomor HP Pelanggan wajib diisi.' });
      return;
    }
    const finalFormattedName = formatCustomerName(newCustName, newCustSalutation);
    const newC: PosCustomerItem = {
      id: `cust-${Date.now()}`,
      name: finalFormattedName,
      phone: newCustPhone.trim(),
      status: 'NEW',
      totalTrx: 1,
      lastVisit: new Date().toISOString().substring(0, 10),
    };
    const updatedList = [newC, ...customerList.filter(c => c.phone !== newC.phone)];
    saveCustomers(updatedList);
    try {
      saveImportedCustomersAction('ALL', [{
        id: newC.id,
        business_id: businessId,
        name: newC.name,
        phone: newC.phone,
        status: newC.status,
        totalTrx: newC.totalTrx,
        lastVisit: newC.lastVisit,
      }]).catch(() => {});
    } catch {}
    setSelectedCustomerId(newC.id);
    setCustomerName(newCustName.trim());
    setSelectedSalutation(newCustSalutation);
    setCustomerPhone(newC.phone);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustSalutation('Kak');
    setFeedback({ type: 'success', text: `Pelanggan baru '${newC.name}' berhasil disimpan permanen ke Database Pelanggan.` });
  };

  const handleRestoreCustomersBackup = async () => {
    let restoredCount = 0;
    const phoneMap = new Map<string, PosCustomerItem>();

    // 1. Current list
    customerList.forEach(c => phoneMap.set(c.phone, c));

    // 2. Scan all localStorage keys
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('pilin_kasir_customers_') || key.includes('customer'))) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(list)) {
              list.forEach((c: PosCustomerItem) => {
                if (c && c.name && c.phone && c.name.length >= 2) {
                  if (!phoneMap.has(c.phone)) {
                    phoneMap.set(c.phone, c);
                    restoredCount++;
                  }
                }
              });
            }
          } catch {}
        }
      }
    }

    // 3. Scan server persistent file
    try {
      const serverList = await getLiveCustomersAction('ALL');
      if (serverList && serverList.length > 0) {
        serverList.forEach(s => {
          if (!phoneMap.has(s.phone)) {
            phoneMap.set(s.phone, {
              id: s.id,
              name: s.name,
              phone: s.phone,
              address: s.address,
              status: s.status || 'NEW',
              totalTrx: s.totalTrx || 1,
              lastVisit: s.lastVisit || new Date().toISOString().substring(0, 10),
            });
            restoredCount++;
          }
        });
      }
    } catch {}

    const allRestored = Array.from(phoneMap.values());
    if (allRestored.length > 0) {
      saveCustomers(allRestored);
      setFeedback({
        type: 'success',
        text: `Sukses memulihkan database! Saat ini terdapat total ${allRestored.length} data pelanggan aman tersimpan (${restoredCount} kontak dipulihkan dari cadangan).`,
      });
    } else {
      setFeedback({
        type: 'error',
        text: 'Tidak ditemukan berkas cadangan tambahan di browser atau server.',
      });
    }
  };

  // CSV Import & Export Handlers for Bulk Customers
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadCustomerTemplate = () => {
    const csvContent = 'Nama Pelanggan,Nomor WhatsApp,Email,Alamat\n' +
      'Bapak Budi Santoso,08123456789,budi@email.com,Jl. Merdeka No. 10\n' +
      'Ibu Siti Rahma,08198765432,siti@email.com,Jl. Sudirman No. 5\n' +
      'Kak Kevin Pratama,08567890123,kevin@email.com,Jl. Anggrek No. 12\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Template_Import_Pelanggan_PILIN.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      text: 'Template CSV berhasil diunduh. Silakan buka di Excel, isi daftar pelanggan Mami, lalu upload kembali ke PILIN.',
    });
  };

  const handleExportCustomersToCsv = () => {
    if (customerList.length === 0) {
      setFeedback({ type: 'error', text: 'Belum ada data pelanggan untuk diunduh.' });
      return;
    }

    const header = 'ID Pelanggan,Nama Pelanggan,Nomor WhatsApp,Total Transaksi,Kunjungan Terakhir,Status\n';
    const rows = customerList.map(c => 
      `"${c.id}","${c.name}","${c.phone}","${c.totalTrx}","${c.lastVisit}","${c.status}"`
    ).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Pelanggan_PILIN_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedback({
      type: 'success',
      text: `Berhasil mengekspor ${customerList.length} data pelanggan ke file CSV.`,
    });
  };

  const handleImportCsvCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedRows = await ImportExportService.parseCustomerFile(file);
      if (parsedRows.length === 0) {
        setFeedback({
          type: 'error',
          text: 'File kosong atau baris data pelanggan tidak dapat ditemukan. Pastikan format tabel memiliki kolom Nama dan No Telpon/WA.',
        });
        return;
      }

      const validRows = parsedRows.filter(r => r.isValid);
      if (validRows.length === 0) {
        setFeedback({
          type: 'error',
          text: `Ditemukan ${parsedRows.length} baris, namun tidak ada nomor telepon dan nama yang valid.`,
        });
        return;
      }

      const result = ImportExportService.commitImportCustomers(validRows, businessId, branchId);
      saveCustomers(result.currentList);
      if (result.currentList.length > 0 && (!selectedCustomerId || selectedCustomerId === 'NEW_CUSTOMER')) {
        handlePOSCustomerSelect(result.currentList[0].id);
      }

      setFeedback({
        type: 'success',
        text: `Sukses mengimpor dari ${file.name}! ${result.added} pelanggan baru ditambahkan, ${result.updated} data diperbarui.`,
      });
    } catch (err) {
      console.error('Failed to import customer file:', err);
      setFeedback({
        type: 'error',
        text: 'Gagal memproses file. Pastikan format file berupa spreadsheet Excel (.xlsx/.xls) atau CSV yang valid.',
      });
    } finally {
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // WA Engine Target Customer Change Handler
  // Selected Industry Template state for template picker
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCategory>('LAUNDRY_CLOTHES');

  const handleWaCustomerSelect = (customerId: string) => {
    setWaSelectedCustomerId(customerId);
    const found = customerList.find(c => c.id === customerId);
    if (found) {
      setWaTargetName(found.name);
      setWaTargetPhone(found.phone);
      updateWaTemplateText(found.name, waCategory, selectedIndustry);
    }
  };

  // Update WA Template Text based on Category, Customer & Industry
  const updateWaTemplateText = (
    custName: string, 
    category: typeof waCategory, 
    indCategory: IndustryCategory = selectedIndustry
  ) => {
    const tmpl = IndustryTemplateService.getTemplate(indCategory);
    const politeName = formatCustomerName(custName);
    if (category === 'KABAR_BERKALA') {
      const text = tmpl.template_sapaan || tmpl.template_hypnoselling;
      setWaTemplateText(IndustryTemplateService.renderMessage(text, { nama: politeName, item: 'Layanan Usaha' }));
    } else if (category === 'REMINDER') {
      setWaTemplateText(IndustryTemplateService.renderMessage(tmpl.template_reminder, { nama: politeName, item: 'Layanan Usaha' }));
    } else if (category === 'QUOTE') {
      setWaTemplateText(IndustryTemplateService.renderMessage(tmpl.template_sapaan, { nama: politeName, item: 'Layanan Usaha' }));
    } else if (category === 'MANUAL') {
      setWaTemplateText(`Halo ${politeName}, `);
    }
  };

  const handleSendWaMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waTemplateText.trim()) return;
    RetentionDomainService.openDirectWhatsApp(waTargetPhone, waTemplateText);
    RetentionDomainService.scheduleSapaan({
      customer_name: waTargetName,
      customer_phone: waTargetPhone,
      category: waCategory === 'MANUAL' || waCategory === 'REMINDER' ? 'SAPAAN' : (waCategory === 'KABAR_BERKALA' ? 'SAPAAN' : waCategory),
      message_text: waTemplateText,
    });
    setFeedback({ 
      type: 'success', 
      text: `Membuka WhatsApp langsung (WA Cepat) ke nomor tujuan ${waTargetName} (${waTargetPhone}). Pesan siap dikirim.` 
    });
  };

  const handleRequestCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq = {
      id: `req-${Date.now()}`,
      type: 'CANCELLATION',
      title: `Permintaan Pembatalan Nota ${cancelNotaNumber}`,
      nota: cancelNotaNumber,
      status: 'MENUNGGU_SETUJU_KC',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    setRequestedApprovals([newReq, ...requestedApprovals]);
    setFeedback({ type: 'success', text: `Permintaan Pembatalan Nota ${cancelNotaNumber} telah dikirim ke Kepala Cabang.` });
  };

  // Generate WA Nota Text with official business sender sign-off
  const generateWaReceiptText = (trx: TransactionRecord) => {
    const profile = businessProfile || BusinessProfileService.getProfile(businessId);
    const completionSection = trx.estimatedCompletion
      ? `TANGGAL SELESAI:\n*${trx.estimatedCompletion}*\n--------------------------------\n`
      : '';

    const itemsLines = trx.items && trx.items.length > 0
      ? trx.items.map(it => `• ${it.service} (${it.qty} ${it.pricing_unit || 'x'}) : Rp ${it.subtotal.toLocaleString('id-ID')}`).join('\n')
      : `• ${trx.service} (${trx.qty} ${trx.pricing_unit || 'x'}) : Rp ${(trx.subtotal || trx.total).toLocaleString('id-ID')}`;

    const discountLines: string[] = [];
    if (trx.discount_amount && trx.discount_amount > 0) {
      discountLines.push(`Diskon Promo (${trx.promo_name || 'Promo'}) : -Rp ${trx.discount_amount.toLocaleString('id-ID')}`);
    }
    if (trx.points_discount && trx.points_discount > 0) {
      discountLines.push(`Diskon Poin Loyalty (${trx.points_used || 0} Poin) : -Rp ${trx.points_discount.toLocaleString('id-ID')}`);
    }
    const discountText = discountLines.length > 0 ? `\n${discountLines.join('\n')}` : '';

    const subtotalText = trx.subtotal && (trx.discount_amount || trx.points_discount)
      ? `Subtotal      : Rp ${trx.subtotal.toLocaleString('id-ID')}${discountText}\n`
      : '';

    const pointsEarnedText = trx.points_earned && trx.points_earned > 0
      ? `\nPoin Diperoleh: +${trx.points_earned} Poin`
      : '';

    const depositDeductionText = trx.deposit_used && trx.deposit_used > 0
      ? `\nPotong Deposit: -Rp ${trx.deposit_used.toLocaleString('id-ID')}`
      : '';

    const remainingDepositText = trx.remaining_deposit_balance !== undefined
      ? `\n--------------------------------\n*SISA SALDO DEPOSIT: Rp ${trx.remaining_deposit_balance.toLocaleString('id-ID')}*`
      : '';

    const methodDisplay = trx.method === 'DEPOSIT'
      ? 'SALDO DEPOSIT (LUNAS)'
      : `${trx.method} (LUNAS)`;

    const paymentLines = trx.payment_type === 'DP'
      ? `${subtotalText}Total Tagihan : Rp ${trx.total.toLocaleString('id-ID')}${depositDeductionText}
DP Diterima   : Rp ${(trx.dp_amount || 0).toLocaleString('id-ID')} (${trx.method})
SISA TAGIHAN  : Rp ${(trx.remaining_amount || 0).toLocaleString('id-ID')} (Pelunasan saat pengambilan)${pointsEarnedText}${remainingDepositText}`
      : `${subtotalText}Total Tagihan : Rp ${trx.total.toLocaleString('id-ID')}${depositDeductionText}
Pembayaran    : ${methodDisplay}${pointsEarnedText}${remainingDepositText}`;

    return `*${profile.business_name.toUpperCase()}*
${profile.business_address}
No. WA Resmi Toko: ${profile.business_phone}
--------------------------------
No. Nota : ${trx.id}
Waktu    : ${trx.time}
Kasir    : ${actorName}
Pelanggan: ${trx.customer} (${trx.phone})
--------------------------------
${completionSection}DAFTAR LAYANAN:
${itemsLines}
--------------------------------
STATUS PEMBAYARAN:
${paymentLines}
--------------------------------
Syarat & Ketentuan:
${profile.terms_and_conditions}

--------------------------------
Pesan nota ini dikirim resmi dari No. WA Toko: ${profile.business_phone}`;
  };

  const handleSendDirectWaReceipt = (trx: TransactionRecord) => {
    const profile = businessProfile || BusinessProfileService.getProfile(businessId);
    const text = generateWaReceiptText(trx);
    RetentionDomainService.openDirectWhatsApp(trx.phone, text);
    setFeedback({
      type: 'success',
      text: `Membuka WhatsApp resmi Toko (${profile.business_phone}) ke pelanggan ${trx.customer} (${trx.phone}). Silakan langsung tekan kirim di WhatsApp.`,
    });
  };

  const generateWaReceiptLink = (trx: TransactionRecord) => {
    const text = generateWaReceiptText(trx);
    return RetentionDomainService.generateDirectWaLink(trx.phone, text);
  };

  return (
    <div className="w-full space-y-6 font-sans text-slate-900 dark:text-slate-100 transition-colors pb-24">
      {/* Notification Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold hover:opacity-80 cursor-pointer">✕</button>
        </div>
      )}

      {/* BERANDA MAIN VIEW */}
      {activeBottomNav === 'BERANDA' && (
        <div className="space-y-6">

          {/* MAIN ACTION BUTTONS: [Buat Nota Reguler] [Top-Up Deposit] [SPK Kerja] [Pengambilan Barang] */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => {
                if (orderItems.length === 0) {
                  setSelectedCustomerId('');
                  setCustomerName('');
                  setCustomerPhone('');
                  setCustomerAddress('');
                  setSelectedSalutation('Kak');
                  setSelectedService('');
                  setServiceSearchText('');
                  setServicePrice(0);
                  setEstimatedCompletion('');
                }
                setShowCustomerSuggestions(false);
                setShowServiceSuggestions(false);
                setShowPosModal(true);
              }}
              className="p-3.5 sm:p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              <span>Buat Nota Reguler</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenStandaloneTopup()}
              className="p-3.5 sm:p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
            >
              <Wallet className="w-5 h-5 shrink-0" />
              <span>Top-Up Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSpkModal(true)}
              className="p-3.5 sm:p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
            >
              <Wrench className="w-5 h-5 shrink-0" />
              <span>SPK ({spkOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPickupModal(true)}
              className="p-3.5 sm:p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm flex flex-col sm:flex-row items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 text-center"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Pengambilan</span>
            </button>
          </div>

          {/* NOTIFIKASI OPERASIONAL NOTA (KUMULATIF) */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">
              Notifikasi Operasional Nota
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Nota Harus Selesai Hari Ini */}
              <div
                onClick={() => setShowSpkModal(true)}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 hover:border-amber-500 rounded-2xl p-4 shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Nota Harus Selesai
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                      {dueTodayOrders.length} <span className="text-xs font-normal text-slate-500">Nota</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>

              {/* Card 2: Nota Terlambat (Overdue SLA) */}
              <div
                onClick={() => setShowSpkModal(true)}
                className={`border rounded-2xl p-4 shadow-sm transition-all cursor-pointer flex items-center justify-between group ${
                  overdueOrders.length > 0
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60 hover:border-rose-500'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    overdueOrders.length > 0
                      ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Nota Terlambat
                    </div>
                    <div className={`text-2xl font-black ${overdueOrders.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {overdueOrders.length} <span className="text-xs font-normal text-slate-500">Nota</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors" />
              </div>

              {/* Card 3: Pesanan Siap Diambil */}
              <div
                onClick={() => setShowPickupModal(true)}
                className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 hover:border-blue-500 rounded-2xl p-4 shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Siap Diambil
                    </div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      {readyPickupOrders.length} <span className="text-xs font-normal text-slate-500">Pesanan</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>

          {/* RINGKASAN TRANSAKSI HARI INI CARD */}
          <div
            onClick={() => setShowHistoryModal(true)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-extrabold text-base text-slate-900 dark:text-white">Transaksi Hari Ini</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>Riwayat Nota</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Transaksi Hari Ini</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">{recentTransactions.length} <span className="text-xs font-normal text-slate-500">Transaksi</span></div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Nota</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white pt-1">{recentTransactions.length} <span className="text-xs font-normal text-slate-500">Nota</span></div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 text-center font-medium pt-1">
              Klik untuk membuka Riwayat Nota Transaksi →
            </div>
          </div>

          {/* MENU UTAMA KASIR */}
          <div className="space-y-3">
            <div className="text-xs font-extrabold text-slate-500 uppercase tracking-wider px-1">Menu Utama</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setShowStatsModal(true)}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Statistik</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => setShowMemberModal(true)}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Pendaftaran Member</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => RetentionDomainService.openDirectWhatsApp('6281215566630', 'Halo CS PILIN ERP, saya butuh bantuan kasir')}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-500 shadow-sm transition-all text-left flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Bantuan</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold hover:opacity-80">✕</button>
        </div>
      )}

      {/* TAB 1: KASIR & TRANSAKSI BARU (POS) */}
      {activeTab === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleCreateTransaction} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Input Transaksi Pelanggan (POS Kasir)</span>
            </h3>

            {/* TAHAP 1: IDENTIFIKASI PELANGGAN */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
                  <span>Identifikasi Pelanggan</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportExportModal(true)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
                    title="Impor / Ekspor Excel Pelanggan"
                  >
                    <span>📊 Impor / Ekspor</span>
                  </button>

                  <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={handleSwitchToExistingCustomer}
                      className={`px-3 py-1 font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        !isNewCustomerMode
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Pilih Pelanggan ({customerList.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToNewCustomer}
                      className={`px-3 py-1 font-bold rounded-md transition-all flex items-center gap-1.5 ${
                        isNewCustomerMode
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Pelanggan Baru</span>
                    </button>
                  </div>
                </div>
              </div>

              {!isNewCustomerMode ? (
                /* Mode Pelanggan Terdaftar: Pilih & Tampil Otomatis Tanpa Perlu Input Ulang */
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                      Pilih Pelanggan dari Database:
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={e => handlePOSCustomerSelect(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {customerList.map(c => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} ({c.phone}) — {c.status}
                        </option>
                      ))}
                      <option value="NEW_CUSTOMER">✏️ + Input Pelanggan Baru / Unregistered</option>
                    </select>
                  </div>

                  {/* Profil Pelanggan Terpilih: No WA & Alamat Langsung Siap Pakai */}
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {formatCustomerName(customerName, selectedSalutation)}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                          {customerList.find(c => c.id === selectedCustomerId)?.status || 'ACTIVE'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingContact(!isEditingContact)}
                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{isEditingContact ? 'Selesai Edit' : 'Perbarui No. WA / Alamat'}</span>
                      </button>
                    </div>

                    {!isEditingContact ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-mono font-bold">{customerPhone || '-'}</span>
                          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-1 py-0.2 rounded font-semibold">Nota WA</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{customerAddress || '(Alamat belum dicatat)'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-emerald-200 dark:border-emerald-900 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Update No. WhatsApp:</label>
                            <input
                              type="text"
                              value={customerPhone}
                              onChange={e => setCustomerPhone(e.target.value)}
                              placeholder="08xxxxxxxxxx"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Update Alamat:</label>
                            <input
                              type="text"
                              value={customerAddress}
                              onChange={e => setCustomerAddress(e.target.value)}
                              placeholder="Alamat pelanggan"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleUpdateCurrentCustomerContact}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all"
                        >
                          Simpan Pembaruan Kontak
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode Input Pelanggan Baru */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Nama Pelanggan:</label>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800">
                          {(['Bapak', 'Ibu', 'Kak'] as const).map(sal => (
                            <button
                              key={sal}
                              type="button"
                              onClick={() => setSelectedSalutation(sal)}
                              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                                selectedSalutation === sal
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              {sal}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 select-none">
                          {selectedSalutation}
                        </span>
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={e => {
                            const val = e.target.value;
                            const { salutation, cleanName } = extractSalutation(val);
                            if (salutation) {
                              setSelectedSalutation(salutation);
                              setCustomerName(cleanName);
                            } else {
                              setCustomerName(val);
                            }
                          }}
                          placeholder="Nama Pelanggan Baru"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-14 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">No. HP WhatsApp (Target Nota):</label>
                      <input
                        type="text"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Contoh: 08123456789"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Alamat Pelanggan (Opsional):</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      placeholder="Alamat domisili atau pengantaran (jika ada)"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {customerPhone && (
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Nota WA akan dikirim ke:</span>
                      </span>
                      <span className="font-mono font-bold bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded">
                        {customerPhone}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TAHAP 2: PILIH LAYANAN & BUAT TRANSAKSI */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 pt-1">
              <span className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-black">2</span>
              <span>Pilih Layanan / Produk &amp; Buat Transaksi</span>
            </div>

            {catalog.length === 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Katalog layanan/produk masih kosong. Owner belum menambahkan jenis layanan atau produk di Master Data.</span>
              </div>
            )}

            {/* Service & Item Condition Photo Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Layanan Jasa / Produk:</label>
                {catalog.length === 0 ? (
                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-500 font-semibold">
                    (Belum ada layanan/produk terdaftar)
                  </div>
                ) : (
                  <select
                    value={selectedService}
                    onChange={e => {
                      const chosen = e.target.value;
                      setSelectedService(chosen);
                      const found = catalog.find(c => c.nama === chosen);
                      setServicePrice(found ? found.base_harga : 0);
                      if (found && found.item_type !== 'PRODUCT') {
                        setEstimatedCompletion(calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours));
                      } else {
                        setEstimatedCompletion('');
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>-- Pilih Layanan / Produk --</option>
                    {catalog.map(item => (
                      <option key={item.id} value={item.nama}>
                        {item.nama} (Rp {item.base_harga.toLocaleString('id-ID')} / {item.pricing_unit || (item.item_type === 'PRODUCT' ? 'unit' : 'sepasang')}) {item.item_type === 'PRODUCT' ? `[Stok: ${item.stock_qty ?? 0}]` : `[Est. ${formatDurationLabel(item.duration_val, item.duration_unit) || ((item.duration_hours || 24) + ' Jam')}]`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                  Jumlah ({catalog.find(c => c.nama === selectedService)?.pricing_unit || 'Qty'}):
                </label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  disabled={catalog.length === 0}
                  onChange={e => setQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* JASA: Target Waktu Selesai Pengerjaan (Target SLA) */}
            {catalog.find(c => c.nama === selectedService)?.item_type !== 'PRODUCT' && selectedService && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-2">
                <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Target Waktu Selesai Pengerjaan (SLA Layanan Jasa)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={estimatedCompletion}
                    onChange={e => setEstimatedCompletion(e.target.value)}
                    placeholder="Contoh: Besok, 30 Okt 2026, 17:00 WIB"
                    className="flex-1 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const matched = catalog.find(c => c.nama === selectedService);
                      setEstimatedCompletion(calculateDefaultCompletion(matched?.duration_val, matched?.duration_unit, matched?.duration_hours));
                    }}
                    className="px-2.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-[11px] cursor-pointer shrink-0"
                  >
                    Reset SLA
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Metode Pembayaran:</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="CASH">Tunai (Cash / Laci Kasir)</option>
                <option value="QRIS_TRANSFER">Nontunai (QRIS / Bank Transfer)</option>
              </select>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Total Pembayaran:</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rp {(servicePrice * qty).toLocaleString('id-ID')}</span>
            </div>

            <button
              type="submit"
              disabled={catalog.length === 0 || !selectedService}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{catalog.length === 0 ? 'LAYANAN BELUM DITAMBAHKAN' : 'PROSES PEMBAYARAN & CETAK NOTA THERMAL'}</span>
            </button>
          </form>

          {/* Recent Transactions List & Approval Forms */}
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Transaksi Terakhir (Cetak & Kirim WA)</span>
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {recentTransactions.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    Belum ada riwayat transaksi hari ini.
                  </div>
                ) : (
                  recentTransactions.map(t => (
                    <div key={t.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{t.id} — {t.customer}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.service} ({t.qty}x) • Rp {t.total.toLocaleString('id-ID')} • {t.method}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveReceiptTrx(t)}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-500" />
                          <span>Nota</span>
                        </button>
                        <button
                          onClick={() => handleSendDirectWaReceipt(t)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>[Kirim]</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Approval Requests to KC */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Kirim Permintaan Ke Kepala Cabang</span>
              </h3>

              <div className="max-w-md">
                <form onSubmit={handleRequestCancellation} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Permintaan Pembatalan Nota</div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cancelNotaNumber}
                      onChange={e => setCancelNotaNumber(e.target.value)}
                      placeholder="Nomor Nota"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="Alasan Pembatalan..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer">
                    Kirim Pembatalan Nota
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LAYANAN & SPK */}
      {activeTab === 'SPK' && (
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Antrian & Status Layanan SPK Transaksi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                  <th className="p-3">No. SPK / Order</th>
                  <th className="p-3">Nama Pelanggan</th>
                  <th className="p-3">Layanan Jasa</th>
                  <th className="p-3">Estimasi Selesai</th>
                  <th className="p-3">Status Pengerjaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {spkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Belum ada antrian SPK pengerjaan.
                    </td>
                  </tr>
                ) : (
                  spkOrders.map(o => (
                    <tr key={o.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{o.order_number || o.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{o.customer_name || 'Pelanggan Umum'}</td>
                      <td className="p-3">{o.service_name || '-'}</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{o.target_minutes || 60} Menit</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded font-bold text-[10px] uppercase">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE PELANGGAN */}
      {activeBottomNav === 'KONSUMEN' && (
        <div className="space-y-6">
          {/* BAR AKSI: IMPORT & EXPORT EXCEL/CSV MASSAL */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-extrabold text-sm text-slate-900 dark:text-white">Kelola Pelanggan Massal (Excel/CSV)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Hidden File Input for Excel / CSV Import */}
              <input
                ref={csvInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,text/plain"
                onChange={handleImportCsvCustomers}
                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleDownloadCustomerTemplate}
                className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Unduh Template CSV</span>
              </button>

              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Pilih file Excel (.xlsx) atau CSV dari komputer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Impor Cepat File</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportExportModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Upload &amp; Import Pelanggan</span>
              </button>

              <button
                type="button"
                onClick={handleExportCustomersToCsv}
                disabled={customerList.length === 0}
                className="px-3.5 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white disabled:opacity-50 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Export Data ({customerList.length})</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleAddCustomer} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-[#F26522] flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Tambah Pelanggan Baru Ke Database</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Nama Lengkap Pelanggan:</label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800">
                    {(['Bapak', 'Ibu', 'Kak'] as const).map(sal => (
                      <button
                        key={sal}
                        type="button"
                        onClick={() => setNewCustSalutation(sal)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                          newCustSalutation === sal
                            ? 'bg-[#F26522] text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {sal}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-[#F26522] select-none">
                    {newCustSalutation}
                  </span>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={e => {
                      const val = e.target.value;
                      const { salutation, cleanName } = extractSalutation(val);
                      if (salutation) {
                        setNewCustSalutation(salutation);
                        setNewCustName(cleanName);
                      } else {
                        setNewCustName(val);
                      }
                    }}
                    placeholder="Nama pelanggan..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-14 text-xs text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nomor WhatsApp HP:</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="Nomor WhatsApp HP..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-[#F26522] hover:bg-[#d95516] text-white font-bold text-xs rounded-lg shadow-md">
              + Simpan Pelanggan Baru
            </button>
          </form>

          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Database Pelanggan Kasir</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                    <th className="p-3">ID Pelanggan</th>
                    <th className="p-3">Nama Pelanggan</th>
                    <th className="p-3">No. WhatsApp</th>
                    <th className="p-3">Total Transaksi</th>
                    <th className="p-3">Poin Loyalty</th>
                    <th className="p-3">Saldo Deposit</th>
                    <th className="p-3">Kunjungan Terakhir</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {customerList.map(c => (
                    <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{c.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{c.phone}</td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{c.totalTrx} Trx</td>
                      <td className="p-3 font-bold text-purple-600 dark:text-purple-400">{c.loyaltyPoints ?? 0} Pts</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        Rp {(c.depositBalance ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{c.lastVisit}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenStandaloneTopup(c)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Top-up Deposit Pelanggan"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>+ Top-Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWaSelectedCustomerId(c.id);
                              setWaTargetName(c.name);
                              setWaTargetPhone(c.phone);
                              updateWaTemplateText(c.name, waCategory);
                              setActiveBottomNav('CRM');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CRM — PROMO GENERAL, VOUCHER LOYAL, REMINDER & WA ENGINE */}
      {activeBottomNav === 'CRM' && (
        <div className="space-y-6">
          {/* Sub-Nav Pill Switcher for CRM */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPromoCrmSubTab('PROMO_GENERAL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                promoCrmSubTab === 'PROMO_GENERAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Promo General &amp; Gajian ({promoBundle.generals.filter(g => g.is_active).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setPromoCrmSubTab('VOUCHER')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                promoCrmSubTab === 'VOUCHER'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>Voucher Konsumen Loyal ({promoBundle.vouchers.filter(v => v.is_active).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setPromoCrmSubTab('OVERDUE_WA')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                promoCrmSubTab === 'OVERDUE_WA'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Pengingat &amp; WA Engine</span>
            </button>
          </div>

          {/* SUB-TAB 1: PROMO GENERAL & GAJIAN */}
          {promoCrmSubTab === 'PROMO_GENERAL' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>Daftar Promo General &amp; Awal Bulan / Gajian</span>
                </h3>
              </div>

              {promoBundle.generals.filter(g => g.is_active).length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  Belum ada promo general yang diaktifkan oleh Owner.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promoBundle.generals.filter(g => g.is_active).map(gen => {
                    const profile = businessProfile || BusinessProfileService.getProfile(businessId);
                    return (
                      <div
                        key={gen.id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {gen.image_url && (
                            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={gen.image_url} alt={gen.title} className="w-full h-full object-cover" />
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                              {gen.title}
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 shrink-0">
                              {gen.discount_label}
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg text-xs space-y-1">
                            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                              Periode Berlaku: {gen.start_date} s/d {gen.end_date}
                            </div>
                            <div className="text-[11px] text-slate-700 dark:text-slate-300 italic line-clamp-3">
                              &ldquo;{gen.wa_message_template}&rdquo;
                            </div>
                          </div>
                        </div>

                        {/* Customer selector & Kirim WA button */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            Pilih Pelanggan Penerima WA:
                          </label>
                          <select
                            value={promoGeneralCustomerTarget}
                            onChange={e => setPromoGeneralCustomerTarget(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                          >
                            <option value="">-- Pilih Pelanggan --</option>
                            {customerList.map(c => (
                              <option key={c.id} value={c.phone}>
                                {c.name} ({c.phone})
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              const targetPhone = promoGeneralCustomerTarget || (customerList[0]?.phone);
                              if (!targetPhone) {
                                setFeedback({ type: 'error', text: 'Silakan pilih pelanggan terlebih dahulu.' });
                                return;
                              }
                              const targetCust = customerList.find(c => c.phone === targetPhone);
                              const fullText = `*${profile.business_name.toUpperCase()}*\n*${gen.title}*\n${gen.discount_label}\nPeriode: ${gen.start_date} s/d ${gen.end_date}\n\n${gen.wa_message_template}\n\n--------------------------------\nHubungi No. WA Resmi Toko: ${profile.business_phone}`;
                              RetentionDomainService.openDirectWhatsApp(targetPhone, fullText);
                              setFeedback({
                                type: 'success',
                                text: `Membuka WhatsApp untuk mengirim Promo '${gen.title}' ke ${targetCust?.name || targetPhone}.`,
                              });
                            }}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim WA Promo General</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: VOUCHER KONSUMEN LOYAL */}
          {promoCrmSubTab === 'VOUCHER' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-500" />
                  <span>Daftar Voucher Apresiasi Konsumen Loyal</span>
                </h3>
              </div>

              {promoBundle.vouchers.filter(v => v.is_active).length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  Belum ada voucher yang diaktifkan oleh Owner.
                </div>
              ) : (
                <div className="space-y-4">
                  {promoBundle.vouchers.filter(v => v.is_active).map(vch => {
                    const profile = businessProfile || BusinessProfileService.getProfile(businessId);
                    const qualifiedCustomers = customerList.filter(c => (c.totalTrx || 0) >= vch.min_total_trx);
                    return (
                      <div
                        key={vch.id}
                        className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-purple-600 text-white">
                                {vch.code}
                              </span>
                              <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {vch.title}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Potongan: Rp {vch.discount_value.toLocaleString('id-ID')} • Berlaku s/d {vch.valid_until}
                            </div>
                          </div>

                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                            Syarat: Min. {vch.min_total_trx} Transaksi
                          </span>
                        </div>

                        {vch.image_url && (
                          <div className="w-full max-w-sm h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={vch.image_url} alt={vch.title} className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className="p-3 bg-purple-50/60 dark:bg-purple-950/40 rounded-xl border border-purple-200/60 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 italic">
                          &ldquo;{vch.wa_message_template}&rdquo;
                        </div>

                        {/* Qualified Loyal Customers Table */}
                        <div className="space-y-2">
                          <div className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center justify-between">
                            <span>Pelanggan Loyal yang Memenuhi Syarat ({qualifiedCustomers.length}):</span>
                          </div>

                          {qualifiedCustomers.length === 0 ? (
                            <div className="p-3 text-center bg-slate-50 dark:bg-slate-950 rounded-xl text-xs text-slate-400">
                              Belum ada pelanggan yang memiliki minimal {vch.min_total_trx} transaksi.
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                                    <th className="p-2.5">Nama Pelanggan</th>
                                    <th className="p-2.5">No. WhatsApp</th>
                                    <th className="p-2.5">Total Trx</th>
                                    <th className="p-2.5 text-right">Aksi Kasir</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                  {qualifiedCustomers.map(cust => (
                                    <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{cust.name}</td>
                                      <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">{cust.phone}</td>
                                      <td className="p-2.5 font-bold text-purple-600 dark:text-purple-400">{cust.totalTrx} Trx</td>
                                      <td className="p-2.5 text-right">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const fullText = `*${profile.business_name.toUpperCase()}*\n*${vch.title}*\nKode Voucher: *${vch.code}*\nPotongan: Rp ${vch.discount_value.toLocaleString('id-ID')}\n\n${vch.wa_message_template}\n\n--------------------------------\nHubungi No. WA Resmi Toko: ${profile.business_phone}`;
                                            RetentionDomainService.openDirectWhatsApp(cust.phone, fullText);
                                            setFeedback({
                                              type: 'success',
                                              text: `Membuka WhatsApp untuk mengirim Voucher '${vch.code}' ke ${cust.name} (${cust.phone}).`,
                                            });
                                          }}
                                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow-sm cursor-pointer transition-all active:scale-95"
                                        >
                                          <Send className="w-3 h-3" />
                                          <span>Kirim WA Voucher</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 3: OVERDUE NOTA & WA ENGINE */}
          {promoCrmSubTab === 'OVERDUE_WA' && (
            <div className="space-y-6">
              {/* SECTION 1: OVERDUE NOTA REMINDERS (DUE FOR RETENTION) — NO FINANCIAL/MONEY FIGURES */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>⏰ Pengingat Nota Jatuh Tempo (Overdue Nota Reminders)</span>
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-600 border border-rose-500/40">
                Perlu Follow Up
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                    <th className="p-3">Nama Pelanggan</th>
                    <th className="p-3">No. WhatsApp</th>
                    <th className="p-3">No. Nota</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Belum ada riwayat nota transaksi.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map(item => (
                      <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{item.customer}</td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{item.phone}</td>
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">Nota #{item.id}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setWaTargetName(item.customer);
                              setWaTargetPhone(item.phone);
                              updateWaTemplateText(item.customer, 'REMINDER', selectedIndustry);
                              setFeedback({ type: 'success', text: `Pengingat nota #${item.id} disiapkan untuk ${item.customer}.` });
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1 shadow cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>[Kirim]</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: TEMPLATE CRM INDUSTRI (INDUSTRY TEMPLATE SERVICE) */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-500" />
                <span>📋 Template CRM Industri &amp; Pesan Terstruktur</span>
              </h3>
              <select
                value={selectedIndustry}
                onChange={e => {
                  const ind = e.target.value as IndustryCategory;
                  setSelectedIndustry(ind);
                  updateWaTemplateText(waTargetName, waCategory, ind);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
              >
                {IndustryTemplateService.getCategories().map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const currentTmpl = IndustryTemplateService.getTemplate(selectedIndustry);
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Kabar Berkala Template */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span>📢 Kabar Berkala</span>
                        <span className="text-[10px] text-slate-400">Sapaan</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 italic">
                        &quot;{IndustryTemplateService.renderMessage(currentTmpl.template_sapaan, { nama: '[Nama]', item: '[Layanan]' })}&quot;
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWaCategory('KABAR_BERKALA');
                        updateWaTemplateText(waTargetName, 'KABAR_BERKALA', selectedIndustry);
                        setFeedback({ type: 'success', text: `Template Kabar Berkala (${currentTmpl.name}) dipilih.` });
                      }}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs mt-3 flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Gunakan Template</span>
                    </button>
                  </div>

                  {/* Reminder Service Template */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center justify-between">
                        <span>⏰ Reminder Servis</span>
                        <span className="text-[10px] text-slate-400">H+{currentTmpl.default_grooming_days} Hari</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 italic">
                        &quot;{IndustryTemplateService.renderMessage(currentTmpl.template_reminder, { nama: '[Nama]', item: '[Layanan]' })}&quot;
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWaCategory('REMINDER');
                        updateWaTemplateText(waTargetName, 'REMINDER', selectedIndustry);
                        setFeedback({ type: 'success', text: `Template Reminder (${currentTmpl.name}) dipilih.` });
                      }}
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs mt-3 flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Gunakan Template</span>
                    </button>
                  </div>

                  {/* Quote Kebersihan Template */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center justify-between">
                        <span>💬 Quote Kebersihan</span>
                        <span className="text-[10px] text-slate-400">Motivasi</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-3 italic">
                        &quot;{IndustryTemplateService.renderMessage(currentTmpl.template_hypnoselling, { nama: '[Nama]', item: '[Layanan]' })}&quot;
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setWaCategory('QUOTE');
                        updateWaTemplateText(waTargetName, 'QUOTE', selectedIndustry);
                        setFeedback({ type: 'success', text: `Template Quote (${currentTmpl.name}) dipilih.` });
                      }}
                      className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs mt-3 flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Gunakan Template</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* SECTION 3: MANDAT PENGIRIMAN DARI KEPALA CABANG */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>📋 Mandat Pengiriman WA dari Kepala Cabang</span>
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-600 border border-amber-500/40">
                {waLogs.filter(l => l.status === 'MANDATED').length} Mandat Pending
              </span>
            </div>

            {waLogs.filter(l => l.status === 'MANDATED').length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Tidak ada mandat pengiriman dari Kepala Cabang yang menunggu eksekusi saat ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                      <th className="p-3">No. Nota / ID</th>
                      <th className="p-3">Pelanggan</th>
                      <th className="p-3">No. WhatsApp</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Pesan Mandat</th>
                      <th className="p-3">Mandat Dari</th>
                      <th className="p-3">Eksekusi Kasir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {waLogs.filter(l => l.status === 'MANDATED').map(log => (
                      <tr key={log.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{log.nota_number || log.id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{log.customer_name}</td>
                        <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{log.customer_phone}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">{log.message_text}</td>
                        <td className="p-3 font-bold text-amber-500">{log.mandated_by || 'Kepala Cabang'}</td>
                        <td className="p-3">
                          <button
                            onClick={() => handleExecuteMandateOrReminder(log)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>[Kirim]</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 4: WA DIRECT ENGINE GENERATOR */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Pesan WhatsApp (Kabar Berkala, Quote, Reminder &amp; Custom)</span>
            </h3>

            <form onSubmit={handleSendWaMessage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Target Pelanggan:</label>
                  <select
                    value={waSelectedCustomerId}
                    onChange={e => handleWaCustomerSelect(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    {customerList.map(c => (
                      <option key={c.id} value={c.id}>
                        👤 {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">No. WhatsApp Target:</label>
                  <input
                    type="text"
                    required
                    value={waTargetPhone}
                    onChange={e => setWaTargetPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Pilih Kategori Pesan:</label>
                  <select
                    value={waCategory}
                    onChange={e => {
                      const cat = e.target.value as any;
                      setWaCategory(cat);
                      updateWaTemplateText(waTargetName, cat, selectedIndustry);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="KABAR_BERKALA">📢 Kabar Berkala</option>
                    <option value="QUOTE">💬 Quote</option>
                    <option value="REMINDER">⏰ Reminder</option>
                    <option value="MANUAL">✏️ Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                  Teks Pesan WhatsApp:
                </label>
                <textarea
                  rows={3}
                  value={waTemplateText}
                  onChange={e => setWaTemplateText(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>[Kirim]</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )}

      {/* TAB 5: BROADCAST TEKS & GAMBAR */}
      {activeTab === 'BROADCAST' && (
        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 text-center">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Camera className="w-5 h-5 text-[#F26522]" />
            <span>Broadcast WA Teks & Gambar Lampiran Foto Kamera</span>
          </h3>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3 max-w-md mx-auto">
            <button
              onClick={() => setShowBroadcastModal(true)}
              className="w-full py-3 bg-[#F26522] hover:bg-[#d95516] text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera & Kirim Broadcast Gambar WA</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: PENGATURAN KASIR (MODEL LIST SEDERHANA LIGHT UI) */}
      {activeBottomNav === 'PENGATURAN' && (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              <span>Pengaturan Kasir</span>
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
            {/* 1. EDIT PROFIL */}
            <button
              type="button"
              onClick={() => setShowEditProfileModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Edit Profil</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Ubah nama dan nomor WhatsApp kasir</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {/* 2. PRINTER */}
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Printer</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pengaturan cetak nota thermal 58mm</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {/* 3. TEMA / TAMPILAN */}
            <button
              type="button"
              onClick={() => setShowThemeModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Tema / Tampilan</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pilih mode tampilan Terang (Light) atau Gelap (Dark)</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {/* 4. BANTUAN & CS PILIN */}
            <button
              type="button"
              onClick={() => RetentionDomainService.openDirectWhatsApp('6281215566630', 'Halo CS PILIN ERP, saya butuh bantuan kasir')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Hubungi CS via WhatsApp (WA Cepat)</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">CS PILIN 0812 15566630</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {/* 5. TENTANG PILIN */}
            <button
              type="button"
              onClick={() => setShowAboutModal(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Tentang PILIN</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Informasi aplikasi PILIN ERP v0.1.0</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {/* 6. LOGOUT */}
            <button
              type="button"
              onClick={handleKasirLogout}
              className="w-full p-4 flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-rose-600 dark:text-rose-400">Logout</div>
                  <div className="text-xs text-rose-500/80">Keluar dari akun Kasir</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-rose-400 group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: TEMA / TAMPILAN */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" />
                <span>Pengaturan Tema &amp; Tampilan</span>
              </h3>
              <button onClick={() => setShowThemeModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <button
                type="button"
                onClick={() => { setTheme('light'); setShowThemeModal(false); }}
                className={`w-full p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <div className="text-left">
                    <div className="font-bold">Terang (Light UI Default)</div>
                    <div className="text-[11px] text-slate-500">Tampilan bersih dengan latar belakang terang</div>
                  </div>
                </div>
                {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
              </button>

              <button
                type="button"
                onClick={() => { setTheme('dark'); setShowThemeModal(false); }}
                className={`w-full p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700 text-white font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-blue-400" />
                  <div className="text-left">
                    <div className="font-bold">Gelap (Dark Mode)</div>
                    <div className="text-[11px] text-slate-500">Tampilan gelap kontras tinggi</div>
                  </div>
                </div>
                {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PRESENSI & FOTO SELFIE ABSEN */}
      {activeTab === 'PRESENSI' && (
        <PresensiModule
          businessId={businessId}
          branchId={branchId}
          actorUserId={actorUserId}
          actorRole="PEGAWAI"
          actorName={actorName}
        />
      )}

      {/* Broadcast Camera Modal */}
      <BroadcastCameraModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        defaultCustomerPhone={broadcastTargetPhone}
        defaultCustomerName={broadcastTargetName}
      />

      {/* MODAL: EDIT PROFIL KASIR */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                <span>Edit Profil Kasir</span>
              </h3>
              <button onClick={() => setShowEditProfileModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveKasirProfile} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nama Petugas Kasir:</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">No. WhatsApp / HP Petugas:</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Profil</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTER THERMAL 58MM */}
      {showPrinterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-500" />
                <span>Pengaturan Printer POS</span>
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              {/* Koneksi Bluetooth Direct */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 dark:text-white">Printer Bluetooth Direct (ESC/POS)</div>
                  {bluetoothDeviceName ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      TERHUBUNG
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      BELUM TERHUBUNG
                    </span>
                  )}
                </div>

                {bluetoothDeviceName ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {bluetoothDeviceName}
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectBluetooth}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-rose-200 dark:border-rose-900 cursor-pointer transition-all"
                    >
                      Putuskan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isConnectingBt}
                    onClick={handleConnectBluetooth}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isConnectingBt ? 'Mencari Printer Bluetooth...' : '+ Sambungkan Printer Bluetooth'}</span>
                  </button>
                )}
              </div>

              {/* Cetak Nota Otomatis */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white">Cetak Nota Otomatis</div>
                <button
                  type="button"
                  onClick={() => setAutoPrintEnabled(!autoPrintEnabled)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    autoPrintEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {autoPrintEnabled ? 'AKTIF' : 'NONAKTIF'}
                </button>
              </div>

              {/* Ukuran Kertas Thermal */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="font-bold text-slate-900 dark:text-white">Ukuran Kertas Thermal</div>
                <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">58 mm (Roll Paper)</span>
              </div>

              {/* Tombol Uji Cetak */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPrintingBt}
                  onClick={() => {
                    const sampleTrx = recentTransactions[0] || {
                      id: 'TEST-001',
                      customer: 'Pelanggan Uji',
                      phone: '081234567890',
                      service: 'Uji Cetak Thermal Bluetooth',
                      qty: 1,
                      pricing_unit: 'item',
                      price: 25000,
                      total: 25000,
                      method: 'CASH' as const,
                      status: 'COMPLETED',
                      time: '12:00 WIB',
                    };
                    handlePrintBluetooth(sampleTrx);
                  }}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Tes Bluetooth</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowPrinterModal(false);
                    if (recentTransactions.length > 0) {
                      setActiveReceiptTrx(recentTransactions[0]);
                    } else {
                      window.print();
                    }
                  }}
                  className="py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Tes Cetak Sistem</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TENTANG PILIN */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-500" />
                <span>Tentang PILIN</span>
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-center">
                <div className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">PILIN ERP</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">Version v0.1.0</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2">
                  Sistem Manajemen Operasional &amp; Transaksi POS Multi-Outlet Terintegrasi.
                </div>
              </div>
              <div className="text-[11px] text-slate-400 text-center">
                &copy; 2026 PILIN ERP. All Rights Reserved.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THERMAL 58 MM RECEIPT & WA MODAL */}
      {activeReceiptTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-500" />
                <span>Nota Transaksi Kasir (Cetak & WA)</span>
              </h3>
              <button onClick={() => setActiveReceiptTrx(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thermal 58 mm Preview Container */}
            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl flex justify-center">
              {(() => {
                const profile = businessProfile || BusinessProfileService.getProfile(businessId);
                return (
                  <div id="thermal-receipt-print-area" className="w-[280px] bg-white text-slate-900 p-4 rounded border border-slate-300 font-mono text-[11px] leading-tight space-y-2 shadow-inner">
                    <div className="text-center border-b border-dashed border-slate-400 pb-2 space-y-1">
                      {profile.logo_url && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={profile.logo_url} alt="Logo Usaha" className="w-12 h-12 mx-auto object-contain mb-1" />
                      )}
                      <div className="font-extrabold text-sm uppercase">{profile.business_name}</div>
                      <div className="text-[10px] text-slate-700 leading-tight">{profile.business_address}</div>
                      <div className="text-[10px] text-slate-700 font-bold">WA: {profile.business_phone}</div>
                      <div className="text-[10px] font-bold border-t border-slate-200 pt-1 mt-1">NOTA TRANSAKSI POS</div>
                    </div>

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between"><span>No. Nota:</span><span className="font-bold">{activeReceiptTrx.id}</span></div>
                      <div className="flex justify-between"><span>Waktu:</span><span>{activeReceiptTrx.time}</span></div>
                      <div className="flex justify-between"><span>Kasir:</span><span>{actorName}</span></div>
                      <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold">{activeReceiptTrx.customer}</span></div>
                      <div className="flex justify-between"><span>No. WA:</span><span className="font-bold">{activeReceiptTrx.phone}</span></div>
                      {activeReceiptTrx.customerAddress && (
                        <div className="flex justify-between"><span>Alamat:</span><span className="font-medium text-right max-w-[160px] truncate">{activeReceiptTrx.customerAddress}</span></div>
                      )}
                    </div>

                    {/* Tanggal Selesai (Di atas sebelum daftar layanan) */}
                    {activeReceiptTrx.estimatedCompletion && (
                      <div className="border-t border-dashed border-slate-400 pt-1.5 pb-0.5">
                        <div className="text-[10px] font-bold text-slate-700 uppercase">TANGGAL SELESAI:</div>
                        <div className="text-[11px] font-extrabold text-slate-900">{activeReceiptTrx.estimatedCompletion}</div>
                      </div>
                    )}

                    {/* Rincian Pesanan / Daftar Layanan */}
                    <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-700">DAFTAR LAYANAN:</div>
                      {activeReceiptTrx.items && activeReceiptTrx.items.length > 0 ? (
                        activeReceiptTrx.items.map((it, idx) => (
                          <div key={it.id || idx} className="flex justify-between text-[10px]">
                            <span>{it.qty} {it.pricing_unit || 'x'} {it.service}</span>
                            <span>Rp {it.subtotal.toLocaleString('id-ID')}</span>
                          </div>
                        ))
                      ) : (
                        <div className="flex justify-between font-bold">
                          <span>{activeReceiptTrx.qty} {activeReceiptTrx.pricing_unit || 'x'} {activeReceiptTrx.service}</span>
                          <span>Rp {activeReceiptTrx.total.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>

                    {/* Pre-service photo thumbnail if available */}
                    {activeReceiptTrx.itemPhotoUrl && (
                      <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                        <div className="text-[9px] font-bold uppercase text-slate-600 mb-1">Bukti Foto Barang</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeReceiptTrx.itemPhotoUrl} alt="Foto Barang" className="w-24 h-24 mx-auto object-cover rounded border border-slate-300" />
                      </div>
                    )}

                    <div className="border-t border-dashed border-slate-400 pt-2 text-xs space-y-0.5">
                      {activeReceiptTrx.subtotal && (activeReceiptTrx.discount_amount || activeReceiptTrx.points_discount) ? (
                        <>
                          <div className="flex justify-between text-[10px]">
                            <span>SUBTOTAL:</span>
                            <span>Rp {activeReceiptTrx.subtotal.toLocaleString('id-ID')}</span>
                          </div>
                          {activeReceiptTrx.discount_amount && activeReceiptTrx.discount_amount > 0 ? (
                            <div className="flex justify-between text-[10px] text-emerald-800">
                              <span>PROMO ({activeReceiptTrx.promo_name || 'Diskon'}):</span>
                              <span>-Rp {activeReceiptTrx.discount_amount.toLocaleString('id-ID')}</span>
                            </div>
                          ) : null}
                          {activeReceiptTrx.points_discount && activeReceiptTrx.points_discount > 0 ? (
                            <div className="flex justify-between text-[10px] text-purple-800">
                              <span>DISKON POIN ({activeReceiptTrx.points_used || 0} Pts):</span>
                              <span>-Rp {activeReceiptTrx.points_discount.toLocaleString('id-ID')}</span>
                            </div>
                          ) : null}
                        </>
                      ) : null}

                      <div className="flex justify-between font-black">
                        <span>TOTAL TRANSAKSI:</span>
                        <span>Rp {activeReceiptTrx.total.toLocaleString('id-ID')}</span>
                      </div>
                      {activeReceiptTrx.deposit_used && activeReceiptTrx.deposit_used > 0 ? (
                        <div className="flex justify-between text-[10px] text-blue-800 font-bold">
                          <span>POTONG DEPOSIT:</span>
                          <span>-Rp {activeReceiptTrx.deposit_used.toLocaleString('id-ID')}</span>
                        </div>
                      ) : null}
                      {activeReceiptTrx.points_earned && activeReceiptTrx.points_earned > 0 ? (
                        <div className="flex justify-between text-[10px] text-purple-700 font-bold">
                          <span>POIN DIPEROLEH:</span>
                          <span>+{activeReceiptTrx.points_earned} Poin</span>
                        </div>
                      ) : null}
                      {activeReceiptTrx.payment_type === 'DP' ? (
                        <>
                          <div className="flex justify-between text-[10px] text-emerald-800 font-bold">
                            <span>DP DITERIMA:</span>
                            <span>Rp {(activeReceiptTrx.dp_amount || 0).toLocaleString('id-ID')} ({activeReceiptTrx.method})</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-amber-900 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                            <span>SISA TAGIHAN:</span>
                            <span>Rp {(activeReceiptTrx.remaining_amount || 0).toLocaleString('id-ID')}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-[10px] mt-0.5">
                          <span>PEMBAYARAN:</span>
                          <span className="font-bold">
                            {activeReceiptTrx.method === 'DEPOSIT'
                              ? 'SALDO DEPOSIT (LUNAS)'
                              : `${activeReceiptTrx.method} (LUNAS)`}
                          </span>
                        </div>
                      )}

                      {/* Saldo deposit yang tersisa (terletak di bawah setelah total transaksi) */}
                      {activeReceiptTrx.remaining_deposit_balance !== undefined && (
                        <div className="border-t border-dashed border-slate-400 pt-1.5 mt-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-900 bg-blue-50 px-1.5 py-1 rounded border border-blue-200">
                            <span>SISA SALDO DEPOSIT:</span>
                            <span className="font-black text-blue-900">
                              Rp {activeReceiptTrx.remaining_deposit_balance.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-dashed border-slate-400 pt-2 text-left text-[9px] text-slate-700 whitespace-pre-wrap leading-tight">
                      <div className="font-bold uppercase text-[9px] mb-0.5 text-slate-900">Syarat &amp; Ketentuan:</div>
                      {profile.terms_and_conditions}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isPrintingBt || isConnectingBt}
                  onClick={() => handlePrintBluetooth(activeReceiptTrx)}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isPrintingBt
                      ? 'Mencetak...'
                      : isConnectingBt
                      ? 'Menghubungkan...'
                      : bluetoothDeviceName
                      ? 'Cetak Bluetooth'
                      : 'Cetak via Bluetooth'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak 58 mm (Sistem)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSendDirectWaReceipt(activeReceiptTrx)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Nota ke WhatsApp Konsumen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRANSAKSI TOP-UP DEPOSIT PELANGGAN (TERPISAH DARI NOTA REGULER) */}
      {showTopupModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-500" />
                <span>Transaksi Top-Up Deposit Pelanggan</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTopup} className="space-y-4">
              {/* Seksi Pemilihan Pelanggan Target */}
              {topupTargetCustomer ? (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Nama Pelanggan:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{topupTargetCustomer.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTopupTargetCustomer(null);
                          setTopupCustSearch('');
                        }}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        (Ganti)
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Nomor WhatsApp:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{topupTargetCustomer.phone}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-indigo-200 dark:border-indigo-800 font-bold">
                    <span className="text-slate-600 dark:text-slate-300">Saldo Deposit Saat Ini:</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      Rp {(topupTargetCustomer.depositBalance ?? 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5" ref={topupCustomerDropdownRef}>
                  {!isNewTopupCustomer ? (
                    <div className="relative">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Pilih / Cari Pelanggan Penerima Deposit:
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={topupCustSearch}
                          placeholder="Ketik nama atau no WA pelanggan..."
                          onChange={e => {
                            setTopupCustSearch(e.target.value);
                            setShowTopupCustSuggestions(e.target.value.trim().length > 0);
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTopupCustSuggestions(!showTopupCustSuggestions)}
                          className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Tampilkan daftar pelanggan"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Pencarian Pelanggan */}
                      {showTopupCustSuggestions && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in duration-100">
                          {matchingTopupCustomers.length > 0 ? (
                            matchingTopupCustomers.map(c => (
                              <div
                                key={c.id}
                                onMouseDown={() => {
                                  setTopupTargetCustomer(c);
                                  setTopupCustSearch(c.name);
                                  setShowTopupCustSuggestions(false);
                                }}
                                className="p-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 cursor-pointer flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">{c.phone}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                                    Rp {(c.depositBalance ?? 0).toLocaleString('id-ID')}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-500">
                              Tidak ada data pelanggan &apos;{topupCustSearch}&apos;
                            </div>
                          )}

                          <div
                            onMouseDown={() => {
                              setIsNewTopupCustomer(true);
                              setTopupCustName(topupCustSearch);
                              setShowTopupCustSuggestions(false);
                            }}
                            className="p-2.5 bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Masukkan Sebagai Pelanggan Baru</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Input Data Pelanggan Baru:</span>
                        <button
                          type="button"
                          onClick={() => setIsNewTopupCustomer(false)}
                          className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                        >
                          Cari dari Database
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={topupCustName}
                        onChange={e => setTopupCustName(e.target.value)}
                        placeholder="Nama Lengkap Pelanggan..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                      />
                      <input
                        type="tel"
                        required
                        value={topupCustPhone}
                        onChange={e => setTopupCustPhone(e.target.value)}
                        placeholder="Nomor WhatsApp (misal: 08123456789)..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Nominal Top-Up */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Pilih / Masukkan Nominal Top-Up:
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[50000, 100000, 200000, 500000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        topupAmount === amt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      Rp {(amt / 1000)}k
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min={1000}
                  value={topupAmount}
                  onChange={e => setTopupAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="Nominal deposit (Rp)..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Metode Pembayaran Top-Up */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Metode Pembayaran Deposit:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTopupMethod('CASH')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      topupMethod === 'CASH'
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Tunai (Cash Kasir)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopupMethod('QRIS_TRANSFER')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      topupMethod === 'QRIS_TRANSFER'
                        ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Nontunai (QRIS / Transfer)
                  </button>
                </div>
              </div>

              {/* Catatan Keterangan */}
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan / Keterangan (Opsional):
                </label>
                <input
                  type="text"
                  value={topupNotes}
                  onChange={e => setTopupNotes(e.target.value)}
                  placeholder="Contoh: Paket promo deposit bulanan"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Estimasi Saldo Baru */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">Estimasi Saldo Baru:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                  Rp {(((topupTargetCustomer?.depositBalance ?? 0) + (Number(topupAmount) || 0))).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Top-Up Deposit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POS / BUAT NOTA */}
      {showPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header Modal with prominent X close button */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>Buat Nota Transaksi Kasir</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPosModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Tutup Form (✕)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateTransaction} className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* SEKSI 1: DATA KONSUMEN */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black">1</span>
                    <span>Data Konsumen</span>
                  </div>

                  {/* Salutation Selector */}
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-xs">
                    {(['Bapak', 'Ibu', 'Kak'] as const).map(sal => (
                      <button
                        key={sal}
                        type="button"
                        onClick={() => setSelectedSalutation(sal)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                          selectedSalutation === sal
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {sal}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Nama Pelanggan: Ketik Langsung atau Cari Database */}
                  <div className="relative" ref={customerDropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-400">
                        Nama Konsumen (Ketik / Cari):
                      </label>
                      {currentSelectedCustomer && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                          Terdaftar ({currentSelectedCustomer.status})
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 select-none">
                        {selectedSalutation}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama pelanggan..."
                        value={customerName}
                        onFocus={() => {
                          if (customerName.trim().length > 0) {
                            setShowCustomerSuggestions(true);
                          }
                        }}
                        onChange={e => {
                          const val = e.target.value;
                          const { salutation, cleanName } = extractSalutation(val);
                          if (salutation) {
                            setSelectedSalutation(salutation);
                            setCustomerName(cleanName);
                          } else {
                            setCustomerName(val);
                          }
                          setShowCustomerSuggestions(val.trim().length > 0);
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-8 pl-14 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customerName.trim().length > 0) {
                            setShowCustomerSuggestions(!showCustomerSuggestions);
                          }
                        }}
                        className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title="Tampilkan daftar pelanggan"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Floating Suggestions List when Typing Customer Name */}
                    {showCustomerSuggestions && customerName.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in duration-100">
                        {matchingCustomers.length > 0 ? (
                          matchingCustomers.map(c => (
                            <div
                              key={c.id}
                              onMouseDown={() => handleSelectCustomerFromSuggestion(c)}
                              className={`p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                selectedCustomerId === c.id ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-l-4 border-emerald-500' : ''
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {c.status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                                  <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{c.phone}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-black text-blue-700 dark:text-blue-300">
                                  Saldo: Rp {(c.depositBalance ?? 0).toLocaleString('id-ID')}
                                </div>
                                {c.loyaltyPoints ? (
                                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                                    {c.loyaltyPoints} Pts
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                            Tidak ditemukan konsumen bernama &quot;{customerName}&quot; di database.
                          </div>
                        )}

                        <div
                          onMouseDown={() => {
                            setSelectedCustomerId('NEW_CUSTOMER');
                            setIsNewCustomerMode(true);
                            setShowCustomerSuggestions(false);
                          }}
                          className="p-2.5 bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold text-center cursor-pointer flex items-center justify-center gap-1.5 border-t border-slate-200 dark:border-slate-800"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Gunakan &quot;{customerName || 'Nama Baru'}&quot; sebagai Konsumen Baru</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* No. WhatsApp (Target Nota - Konfirmasi Nomor Aktif) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-400">
                        No. WhatsApp (Konfirmasi No. Aktif):
                      </label>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        Target Nota WA
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 081234567890"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-9 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Alamat Pelanggan */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                    Alamat Pelanggan (Opsional):
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Alamat domisili atau pengantaran (jika ada)"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Info Saldo Deposit Konsumen pada Form Nota */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">Saldo Deposit Tersedia:</span>
                    <span className="font-black text-blue-700 dark:text-blue-300">
                      Rp {(customerDepositBalance ?? 0).toLocaleString('id-ID')}
                    </span>
                    {customerLoyaltyPoints > 0 && (
                      <span className="ml-2 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                        • {customerLoyaltyPoints} Poin Loyalty
                      </span>
                    )}
                  </div>
                  {customerDepositBalance > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      Dapat Dipotong di Nota
                    </span>
                  )}
                </div>
              </div>

              {/* SEKSI 2: MULTI-LAYANAN & PRODUK */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Layanan &amp; Produk ({orderItems.length} Dipilih)</span>
                  </div>
                  {orderItems.length > 0 && (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      Subtotal: Rp {orderItems.reduce((acc, it) => acc + it.subtotal, 0).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                {/* Service Picker Controls */}
                {catalog.length === 0 ? (
                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg p-3 text-xs text-slate-500 text-center font-semibold">
                    Katalog layanan/produk masih kosong. Silakan daftarkan layanan di Pengaturan Layanan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Smart Search & Direct Input Layanan / Produk */}
                      <div className="sm:col-span-2 relative" ref={serviceDropdownRef}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-400">
                            Cari / Masukkan Layanan &amp; Produk:
                          </label>
                          {selectedService && (
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-1.5 py-0.2 rounded">
                              Rp {servicePrice.toLocaleString('id-ID')} / {catalog.find(c => c.nama === selectedService)?.pricing_unit || 'unit'}
                            </span>
                          )}
                        </div>

                        <div className="relative flex items-center">
                          <input
                            type="text"
                            value={serviceSearchText}
                            placeholder="Ketik nama layanan/produk (mis: Cuci, Deep Clean, Fast, dll)..."
                            onFocus={() => {
                              if (serviceSearchText.trim().length > 0) {
                                setShowServiceSuggestions(true);
                              }
                            }}
                            onChange={e => {
                              const val = e.target.value;
                              setServiceSearchText(val);
                              setSelectedService(val);
                              setShowServiceSuggestions(val.trim().length > 0);
                              const found = catalog.find(c => c.nama.toLowerCase() === val.toLowerCase());
                              if (found) {
                                setServicePrice(found.base_harga);
                                if (found.item_type !== 'PRODUCT') {
                                  setEstimatedCompletion(calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours));
                                } else {
                                  setEstimatedCompletion('');
                                }
                              } else {
                                setServicePrice(0);
                                setEstimatedCompletion('');
                              }
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-8 pl-3 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (serviceSearchText.trim().length > 0) {
                                setShowServiceSuggestions(!showServiceSuggestions);
                              }
                            }}
                            className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            title="Tampilkan daftar katalog layanan"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Floating Suggestions List when Typing Service Name */}
                        {showServiceSuggestions && serviceSearchText.trim().length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in duration-100">
                            {matchingServices.length > 0 ? (
                              matchingServices.map(item => (
                                <div
                                  key={item.id}
                                  onMouseDown={() => handleSelectServiceFromSuggestion(item)}
                                  className={`p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/60 cursor-pointer transition-colors flex items-center justify-between text-xs ${
                                    selectedService === item.nama ? 'bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-500' : ''
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-white">{item.nama}</span>
                                      {item.item_type === 'PRODUCT' ? (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                          RETAIL
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                          JASA
                                        </span>
                                      )}
                                      {item.sku && (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                                          {item.sku}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {item.item_type === 'PRODUCT'
                                        ? `Stok: ${item.stock_qty ?? 0} unit`
                                        : `Est. Selesai: ${formatDurationLabel(item.duration_val, item.duration_unit) || ((item.duration_hours || 24) + ' Jam')}`
                                      }
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                                      Rp {item.base_harga.toLocaleString('id-ID')}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                      per {item.pricing_unit || (item.item_type === 'PRODUCT' ? 'unit' : 'sepasang')}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-500">
                                Tidak ada layanan yang cocok dengan &apos;{serviceSearchText}&apos;
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                          Jumlah ({catalog.find(c => c.nama === selectedService)?.pricing_unit || 'Qty'}):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={e => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SLA Estimate Input for Services */}
                    {catalog.find(c => c.nama === selectedService)?.item_type !== 'PRODUCT' && selectedService && (
                      <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
                        <label className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Target Waktu Selesai Pengerjaan (SLA Jasa):</span>
                        </label>
                        <input
                          type="text"
                          value={estimatedCompletion}
                          onChange={e => setEstimatedCompletion(e.target.value)}
                          placeholder="Contoh: Besok, 30 Okt 2026, 17:00 WIB"
                          className="w-full bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    )}

                    {/* Button to add item to list */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddOrderItem}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Layanan ke Nota</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Daftar Item yang Sudah Dimasukkan */}
                {orderItems.length > 0 ? (
                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                    {longestEstimatedCompletion && (
                      <div className="flex items-center justify-between p-2.5 bg-purple-50 dark:bg-purple-950/60 rounded-lg border border-purple-200 dark:border-purple-800 text-xs">
                        <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-200 font-bold">
                          <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>TANGGAL SELESAI TRANSAKSI:</span>
                        </div>
                        <span className="font-extrabold text-purple-800 dark:text-purple-300">
                          {longestEstimatedCompletion}
                        </span>
                      </div>
                    )}
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Daftar Layanan Dalam Nota:
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {orderItems.map((it, idx) => (
                        <div
                          key={it.id || idx}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs shadow-sm"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">{it.service}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {it.qty} {it.pricing_unit}
                              </span>
                              {it.item_type === 'PRODUCT' ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                  RETAIL
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                  JASA
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-black text-slate-900 dark:text-white">
                              Rp {it.subtotal.toLocaleString('id-ID')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveOrderItem(it.id)}
                              className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer transition-colors"
                              title="Hapus Layanan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  catalog.length > 0 && (
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-900/60 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-[11px] text-slate-500 text-center">
                      Belum ada layanan yang dimasukkan. Anda dapat klik <b>Tambah Layanan ke Nota</b> di atas untuk menambahkan lebih dari 1 layanan.
                    </div>
                  )
                )}
              </div>

              {/* SEKSI 3: BUKTI FOTO BARANG (KAMERA / GALERI) */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Bukti Foto Barang / Pakaian (Sebelum Pengerjaan)</span>
                  </div>
                  {itemPhotoUrl && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ Foto Terlampir
                    </span>
                  )}
                </div>

                {/* Hidden File Inputs for Camera and Gallery */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4 text-emerald-500" />
                    <span>Ambil Foto Kamera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span>Pilih dari Galeri</span>
                  </button>

                  {itemPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setItemPhotoUrl(null)}
                      className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>

                {/* Photo Preview Thumbnail */}
                {itemPhotoUrl && (
                  <div className="pt-1 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={itemPhotoUrl}
                      alt="Bukti Foto Barang"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-emerald-500 shadow-sm"
                    />
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">Foto Bukti Barang Siap</div>
                      <div className="text-[11px] text-slate-500">Foto akan tersimpan pada nota fisik &amp; riwayat SPK.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEKSI 4: PEMBAYARAN & DP (UANG MUKA) */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pembayaran &amp; DP (Uang Muka)</span>
                </div>

                {/* Toggle Pembayaran: LUNAS vs DP */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('LUNAS');
                      setDpAmount('');
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                      paymentType === 'LUNAS'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    LUNAS (100%)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('DP');
                      if (dpAmount === '') {
                        setDpAmount(Math.round(totalBill * 0.5));
                      }
                    }}
                    className={`py-2.5 rounded-xl font-bold text-xs transition-all border ${
                      paymentType === 'DP'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    DP (Uang Muka)
                  </button>
                </div>

                {/* DP Input & Quick Percentage Buttons */}
                {paymentType === 'DP' && (
                  <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Nominal DP Diterima (Rp):
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDpAmount(Math.round(totalBill * 0.3))}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[11px] font-bold rounded border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          30%
                        </button>
                        <button
                          type="button"
                          onClick={() => setDpAmount(Math.round(totalBill * 0.5))}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[11px] font-bold rounded border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          50%
                        </button>
                        <button
                          type="button"
                          onClick={() => setDpAmount(Math.round(totalBill * 0.7))}
                          className="px-2 py-0.5 bg-white dark:bg-slate-800 text-[11px] font-bold rounded border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          70%
                        </button>
                      </div>
                    </div>

                    <input
                      type="number"
                      min={1}
                      max={totalBill}
                      value={dpAmount}
                      onChange={e => {
                        const v = e.target.value;
                        setDpAmount(v === '' ? '' : Math.max(0, parseInt(v, 10) || 0));
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}

                {/* Promo Basic Section */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Percent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Promo Basic (Persentase)</span>
                    </div>
                    {selectedPromoBasic && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                        selectedPromoBasic.allow_cashier_override
                          ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                      }`}>
                        {selectedPromoBasic.allow_cashier_override ? 'Kasir Boleh Ubah %' : 'Terkunci Owner'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <select
                        value={selectedPromoBasicId}
                        onChange={e => handlePromoBasicChange(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Tanpa Promo Basic (0%) --</option>
                        {promoBundle.basics.filter(b => b.is_active).map(b => (
                          <option key={b.id} value={b.id}>
                            🏷️ {b.name} ({b.percentage}%) {b.allow_cashier_override ? '[Dapat Diubah]' : '[Terkunci]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        disabled={!selectedPromoBasic || !selectedPromoBasic.allow_cashier_override}
                        value={customDiscountPercent}
                        onChange={e => {
                          const val = Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                          setCustomDiscountPercent(val);
                        }}
                        className={`w-full border rounded-lg p-2.5 text-xs font-black text-center focus:outline-none ${
                          !selectedPromoBasic || !selectedPromoBasic.allow_cashier_override
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                            : 'bg-white dark:bg-slate-900 border-blue-500 text-blue-600 dark:text-blue-300 focus:border-blue-600'
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>

                  {promoDiscountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span>Potongan Diskon Promo ({customDiscountPercent}%):</span>
                      <span className="font-black">- Rp {promoDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                {/* Loyalty Points Section */}
                {promoBundle.poin.is_active && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>Poin Loyalty Pelanggan</span>
                      </div>
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 font-mono">
                        Saldo: {customerLoyaltyPoints} Poin
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                        <input
                          type="checkbox"
                          checked={useLoyaltyPoints}
                          disabled={customerLoyaltyPoints < (promoBundle.poin.min_redeem_points || 5)}
                          onChange={e => {
                            const checked = e.target.checked;
                            setUseLoyaltyPoints(checked);
                            if (checked) {
                              setRedeemedPointsQty(customerLoyaltyPoints);
                            } else {
                              setRedeemedPointsQty(0);
                            }
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        <span>Tukarkan Poin Loyalty</span>
                      </label>

                      {customerLoyaltyPoints < (promoBundle.poin.min_redeem_points || 5) ? (
                        <span className="text-[11px] text-slate-400 font-semibold">
                          (Min. {promoBundle.poin.min_redeem_points} Poin)
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          1 Poin = Rp {promoBundle.poin.point_redeem_value.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    {useLoyaltyPoints && customerLoyaltyPoints >= (promoBundle.poin.min_redeem_points || 5) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Poin Ditukar (Maks: {customerLoyaltyPoints}):
                          </span>
                          <input
                            type="number"
                            min={promoBundle.poin.min_redeem_points || 1}
                            max={customerLoyaltyPoints}
                            value={redeemedPointsQty}
                            onChange={e => {
                              const v = Math.min(customerLoyaltyPoints, Math.max(0, parseInt(e.target.value, 10) || 0));
                              setRedeemedPointsQty(v);
                            }}
                            className="w-24 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg p-1.5 text-xs font-bold text-center text-slate-900 dark:text-white"
                          />
                        </div>

                        {pointsDiscountAmount > 0 && (
                          <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg border border-purple-200 dark:border-purple-800">
                            <span>Potongan Poin:</span>
                            <span className="font-black">- Rp {pointsDiscountAmount.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Saldo Deposit Pelanggan Section */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Saldo Deposit Konsumen</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">
                        Saldo: Rp {customerDepositBalance.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200 select-none">
                      <input
                        type="checkbox"
                        checked={useDeposit}
                        disabled={customerDepositBalance <= 0}
                        onChange={e => setUseDeposit(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                      />
                      <span>Potong dari Saldo Deposit Konsumen</span>
                    </label>

                    {customerDepositBalance <= 0 ? (
                      <span className="text-[11px] text-slate-400 font-semibold">
                        (Saldo Kosong)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        Tersedia: Rp {customerDepositBalance.toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>

                  {useDeposit && customerDepositBalance > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg border border-blue-200 dark:border-blue-800">
                        <span>Deposit Dipotong Dari Nota:</span>
                        <span className="font-black">- Rp {depositDeductionAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 px-1 font-semibold">
                        <span>Estimasi Sisa Saldo Deposit:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          Rp {(customerDepositBalance - depositDeductionAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metode Pembayaran: Tunai vs QRIS */}
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                    Metode Pembayaran ({paymentType === 'DP' ? 'Uang Muka' : 'Pelunasan'}):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        paymentMethod === 'CASH'
                          ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Tunai (Cash / Laci Kasir)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QRIS_TRANSFER')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        paymentMethod === 'QRIS_TRANSFER'
                          ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 dark:border-slate-200 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      Nontunai (QRIS / Transfer)
                    </button>
                  </div>
                </div>

                {/* Ringkasan Biaya & Sisa Tagihan */}
                <div className="p-3.5 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      Rp {subtotalBill.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {promoDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      <span>Diskon Promo ({customDiscountPercent}%):</span>
                      <span>- Rp {promoDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {pointsDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-purple-600 dark:text-purple-400 font-semibold">
                      <span>Diskon Poin ({redeemedPointsQty} Poin):</span>
                      <span>- Rp {pointsDiscountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">TOTAL TRANSAKSI:</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      Rp {totalBill.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {depositDeductionAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-50/80 dark:bg-blue-950/40 px-2 py-1 rounded">
                      <span>POTONG SALDO DEPOSIT:</span>
                      <span className="font-black">- Rp {depositDeductionAmount.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {projectedPointsEarned > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                      <span>Poin Diperoleh:</span>
                      <span>+{projectedPointsEarned} Poin Loyalty</span>
                    </div>
                  )}

                  {payableBillAfterDeposit === 0 ? (
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-black pt-1.5 border-t border-slate-200 dark:border-slate-800">
                      <span>STATUS PEMBAYARAN:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                        LUNAS (SALDO DEPOSIT)
                      </span>
                    </div>
                  ) : paymentType === 'DP' ? (
                    <>
                      <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                        <span>DP DITERIMA ({paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'}):</span>
                        <span>Rp {finalDpAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-amber-800 dark:text-amber-400 font-black pt-1.5 border-t border-slate-200 dark:border-slate-800">
                        <span>SISA TAGIHAN (PELUNASAN):</span>
                        <span className="text-base text-amber-700 dark:text-amber-400">
                          Rp {remainingAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1">
                      <span>STATUS PEMBAYARAN:</span>
                      <span>LUNAS ({paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'}) — Rp {payableBillAfterDeposit.toLocaleString('id-ID')}</span>
                    </div>
                  )}

                  {/* Sisa Saldo Deposit Tersisa (terletak di bawah setelah total transaksi) */}
                  {(customerDepositBalance > 0 || depositDeductionAmount > 0) && (
                    <div className="flex justify-between items-center text-[11px] text-slate-700 dark:text-slate-300 font-bold pt-1.5 border-t border-dashed border-slate-300 dark:border-slate-700">
                      <span>SISA SALDO DEPOSIT:</span>
                      <span className="text-blue-700 dark:text-blue-300 font-extrabold">
                        Rp {remainingDepositBalance.toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Modal Footer */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPosModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  ✕ Batal
                </button>

                <button
                  type="submit"
                  disabled={catalog.length === 0 && orderItems.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{catalog.length === 0 && orderItems.length === 0 ? 'Layanan Belum Tersedia' : 'Simpan Nota & Buka Cetak / Kirim WA'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DAFTAR SPK */}
      {showSpkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <span>Daftar SPK &amp; Antrian Pengerjaan ({spkOrders.length})</span>
              </h3>
              <button onClick={() => setShowSpkModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 font-bold">
                    <th className="p-3">No. SPK</th>
                    <th className="p-3">Nama Pelanggan</th>
                    <th className="p-3">Layanan</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {spkOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Belum ada antrian SPK pengerjaan.
                      </td>
                    </tr>
                  ) : (
                    spkOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{o.order_number || o.id}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{o.customer_name || 'Pelanggan Umum'}</td>
                        <td className="p-3">{o.service_name || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-800 rounded font-bold text-[10px] uppercase">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENGAMBILAN BARANG */}
      {showPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span>Pengambilan Barang Selesai</span>
              </h3>
              <button onClick={() => setShowPickupModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              {readyPickupOrders.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Tidak ada barang yang siap diambil saat ini.
                </div>
              ) : (
                readyPickupOrders.map(order => (
                  <div key={order.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{order.order_number || order.id} — {order.customer_name}</div>
                      <div className="text-slate-500 font-mono">{order.service_name || 'Layanan Jasa'} • Status: Siap Diambil</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPickupModal(false);
                        setFeedback({ type: 'success', text: `Nota ${order.order_number || order.id} (${order.customer_name}) barang telah diserahkan ke pelanggan.` });
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Serahkan Barang
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RIWAYAT NOTA TRANSAKSI */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                <span>Daftar Riwayat Nota Transaksi Hari Ini</span>
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Belum ada riwayat transaksi hari ini.
                </div>
              ) : (
                recentTransactions.map(t => (
                  <div key={t.id} className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t.id} — {t.customer} ({t.phone})</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.service} ({t.qty}x) • {t.method} • {t.time}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => { setShowHistoryModal(false); setActiveReceiptTrx(t); }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-500" />
                        <span>Cetak Nota</span>
                      </button>
                      <button
                        onClick={() => handleSendDirectWaReceipt(t)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>[Kirim WA]</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STATISTIK OPERASIONAL & FINANCIAL OMZET */}
      {showStatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <span>Statistik Operasional &amp; Keuangan Kasir</span>
              </h3>
              <button onClick={() => setShowStatsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Omzet Hari Ini</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 pt-1">
                  Rp {recentTransactions.reduce((acc, t) => acc + t.total, 0).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Tunai (Cash)</div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white pt-1">
                    Rp {recentTransactions.filter(t => t.method === 'CASH').reduce((acc, t) => acc + t.total, 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Nontunai (QRIS)</div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white pt-1">
                    Rp {recentTransactions.filter(t => t.method === 'QRIS_TRANSFER').reduce((acc, t) => acc + t.total, 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENDAFTARAN MEMBER */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-500" />
                <span>Pendaftaran Member Pelanggan Baru</span>
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { handleAddCustomer(e); setShowMemberModal(false); }} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400">Nama Lengkap Pelanggan:</label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800">
                    {(['Bapak', 'Ibu', 'Kak'] as const).map(sal => (
                      <button
                        key={sal}
                        type="button"
                        onClick={() => setNewCustSalutation(sal)}
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                          newCustSalutation === sal
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {sal}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-blue-600 dark:text-blue-400 select-none">
                    {newCustSalutation}
                  </span>
                  <input
                    type="text"
                    required
                    value={newCustName}
                    onChange={e => {
                      const val = e.target.value;
                      const { salutation, cleanName } = extractSalutation(val);
                      if (salutation) {
                        setNewCustSalutation(salutation);
                        setNewCustName(cleanName);
                      } else {
                        setNewCustName(val);
                      }
                    }}
                    placeholder="Nama lengkap..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-14 text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nomor WhatsApp HP:</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
              >
                Simpan Pelanggan Member Baru
              </button>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowMemberModal(false);
                    setShowImportExportModal(true);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  📥 Impor Banyak Pelanggan via Excel / CSV →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PUSAT IMPOR & EKSPOR PELANGGAN / LAYANAN */}
      {showImportExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
              <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Pusat Impor &amp; Ekspor Data (Excel / CSV)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImportExportModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <DataImportExportManager
                businessId={businessId}
                branchId={branchId}
                defaultTab="CUSTOMER"
                onCustomerImportSuccess={(newList) => {
                  saveCustomers(newList);
                  if (newList.length > 0) {
                    handlePOSCustomerSelect(newList[0].id);
                  }
                }}
                onCatalogImportSuccess={(refreshed) => {
                  setCatalog(refreshed);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2.5 px-4 z-40 flex justify-around items-center shadow-lg font-sans transition-colors">
        <button
          type="button"
          onClick={() => setActiveBottomNav('BERANDA')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeBottomNav === 'BERANDA' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">BERANDA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomNav('KONSUMEN')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeBottomNav === 'KONSUMEN' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[11px]">Konsumen</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomNav('CRM')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeBottomNav === 'CRM' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[11px]">CRM</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveBottomNav('PENGATURAN')}
          className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all cursor-pointer ${
            activeBottomNav === 'PENGATURAN' ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[11px]">Pengaturan</span>
        </button>
      </nav>
    </div>
  );
}
