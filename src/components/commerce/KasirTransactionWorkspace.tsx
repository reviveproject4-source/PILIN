'use client';

import React, { useState, useRef, useMemo } from 'react';
import { 
  ShoppingCart, DollarSign, CreditCard, Clock, CheckCircle2, 
  AlertCircle, AlertTriangle, Send, FileText, UserCheck, Users, MessageSquare, 
  Sparkles, Camera, Image as ImageIcon, Search, Phone, Printer, X, Filter,
  Home, Settings, Edit3, Bookmark, LogOut, HelpCircle, Info, User, Save, PhoneCall, ChevronRight, Sun, Moon,
  PlusCircle, Wrench, BarChart3, UserPlus, ArrowRight, Trash2, Plus
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ThemeProvider';
import { PresensiModule } from '../people/PresensiModule';
import { BroadcastCameraModal } from '../broadcast/BroadcastCameraModal';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { RetentionDomainService, SapaanLogRecord } from '@/domains/retention/retentionDomainService';
import { BusinessProfileService } from '@/domains/business/businessProfileService';
import { ServiceCatalogService, ServiceCatalogItem, formatDurationLabel } from '@/domains/catalog/serviceCatalogService';
import { ServiceOrderStatus } from '@/lib/types';
import { Salutation, extractSalutation, formatCustomerName } from '@/lib/salutationHelper';

import { IndustryTemplateService, IndustryCategory, IndustryTemplate } from '@/domains/retention/industryTemplateService';

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
  service: string;
  qty: number;
  pricing_unit?: string;
  price: number;
  total: number;
  payment_type?: 'LUNAS' | 'DP';
  dp_amount?: number;
  remaining_amount?: number;
  method: 'CASH' | 'QRIS_TRANSFER';
  status: string;
  time: string;
  estimatedCompletion?: string;
  itemPhotoUrl?: string | null;
  items?: PosOrderItem[];
}

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

  const [activeTab, setActiveTab] = useState<'POS' | 'SPK' | 'CUSTOMER' | 'WA_ENGINE' | 'BROADCAST' | 'OPERASIONAL' | 'PRESENSI' | 'PENGATURAN' | null>(null);

  // Kasir Settings State (Edit Profil, Printer, Theme & About Modals)
  const [profileName, setProfileName] = useState<string>(actorName || 'Kasir');
  const [profilePhone, setProfilePhone] = useState<string>('08123456789');
  const [autoPrintEnabled, setAutoPrintEnabled] = useState<boolean>(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [showPrinterModal, setShowPrinterModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);

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

  // Customer DB Local State
  const [customerList, setCustomerList] = useState(() => {
    if (isDemo) {
      return [
        { id: 'cust-101', name: 'Bapak Budi Santoso', phone: '08123456789', status: 'REPEAT', totalTrx: 12, lastVisit: '2026-08-14' },
        { id: 'cust-102', name: 'Ibu Siti Rahma', phone: '08198765432', status: 'LOYAL', totalTrx: 28, lastVisit: '2026-08-15' },
        { id: 'cust-103', name: 'Bapak Ahmad Fauzi', phone: '08567890123', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-15' },
        { id: 'cust-104', name: 'Ibu Dewi Lestari', phone: '08212345678', status: 'AT_RISK', totalTrx: 5, lastVisit: '2026-06-10' },
      ];
    }
    return [];
  });

  // Helper: Format completion time based on duration value & unit
  const calculateDefaultCompletion = (durationVal?: number, durationUnit?: 'JAM' | 'HARI' | 'MINGGU', hoursFallback?: number): string => {
    let ms = 24 * 3600000;
    if (durationVal && durationUnit) {
      if (durationUnit === 'JAM') ms = durationVal * 3600000;
      else if (durationUnit === 'MINGGU') ms = durationVal * 7 * 86400000;
      else ms = durationVal * 86400000; // HARI
    } else if (hoursFallback) {
      ms = hoursFallback * 3600000;
    }
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

  // Catalog & POS Form State
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>(() => {
    return isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
  });
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(() => {
    return !isDemo;
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(isDemo ? 'cust-101' : 'NEW_CUSTOMER');
  const [selectedSalutation, setSelectedSalutation] = useState<Salutation>(isDemo ? 'Bapak' : 'Kak');
  const [customerName, setCustomerName] = useState<string>(isDemo ? 'Budi Santoso' : '');
  const [customerPhone, setCustomerPhone] = useState<string>(isDemo ? '08123456789' : '');

  // Auto-switch to new customer mode if database is empty
  React.useEffect(() => {
    if (customerList.length === 0) {
      setIsNewCustomerMode(true);
      setSelectedCustomerId('NEW_CUSTOMER');
    }
  }, [customerList.length]);

  // Multi-Item Order State (Bisa Tambah Lebih dari 1 Layanan)
  const [orderItems, setOrderItems] = useState<PosOrderItem[]>([]);

  // Item Picker State (Untuk Menambahkan Item ke Nota)
  const [selectedService, setSelectedService] = useState<string>(() => {
    const items = isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
    return items[0]?.nama || '';
  });
  const [servicePrice, setServicePrice] = useState<number>(() => {
    const items = isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
    return items[0]?.base_harga || 0;
  });
  const [estimatedCompletion, setEstimatedCompletion] = useState<string>(() => {
    const items = isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
    const first = items[0];
    if (first && first.item_type !== 'PRODUCT') {
      return calculateDefaultCompletion(first.duration_val, first.duration_unit, first.duration_hours);
    }
    return '';
  });
  const [qty, setQty] = useState<number>(1);

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
    if (!selectedService) return;
    const found = catalog.find(c => c.nama === selectedService);
    if (!found) return;

    const finalPrice = found.base_harga;
    const finalQty = Math.max(1, qty);
    const itemSubtotal = finalPrice * finalQty;
    const isService = found.item_type !== 'PRODUCT';

    const newItem: PosOrderItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      catalog_id: found.id,
      service: found.nama,
      qty: finalQty,
      price: finalPrice,
      pricing_unit: (found.pricing_unit || (isService ? 'sepasang' : 'pc')) as string,
      item_type: found.item_type || 'SERVICE',
      duration_val: isService ? (found.duration_val || 1) : undefined,
      duration_unit: isService ? (found.duration_unit || 'HARI') : undefined,
      estimatedCompletion: isService ? (estimatedCompletion || calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours)) : undefined,
      subtotal: itemSubtotal,
    };

    setOrderItems(prev => [...prev, newItem]);
    setQty(1);
    setFeedback({ type: 'success', text: `Layanan '${newItem.service}' (${newItem.qty} ${newItem.pricing_unit}) berhasil ditambahkan ke daftar nota.` });
  };

  const handleRemoveOrderItem = (itemId: string) => {
    setOrderItems(prev => prev.filter(it => it.id !== itemId));
  };

  const totalBill = useMemo(() => {
    if (orderItems.length > 0) {
      return orderItems.reduce((acc, it) => acc + it.subtotal, 0);
    }
    return (servicePrice || 0) * (qty || 1);
  }, [orderItems, servicePrice, qty]);

  const finalDpAmount = paymentType === 'LUNAS'
    ? totalBill
    : (dpAmount === '' ? 0 : Number(dpAmount));
  const remainingAmount = Math.max(0, totalBill - finalDpAmount);

  React.useEffect(() => {
    const refreshCatalog = () => {
      const items = isDemo ? ServiceCatalogService.getDefaultCatalogForDemo() : ServiceCatalogService.getMasterCatalog();
      setCatalog(items);
      if (items.length > 0) {
        setSelectedService(prev => {
          if (!prev || !items.some(i => i.nama === prev)) {
            setServicePrice(items[0].base_harga);
            if (items[0].item_type !== 'PRODUCT') {
              setEstimatedCompletion(calculateDefaultCompletion(items[0].duration_val, items[0].duration_unit, items[0].duration_hours));
            } else {
              setEstimatedCompletion('');
            }
            return items[0].nama;
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

  // Transactions State
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>(() => {
    if (isDemo) {
      return [
        { id: 'NOT-2026-0892', customer: 'Bapak Budi Santoso', phone: '08123456789', service: 'Layanan Cuci Express', qty: 2, price: 35000, total: 70000, method: 'CASH', status: 'COMPLETED', time: '11:05 WIB' },
        { id: 'NOT-2026-0891', customer: 'Ibu Siti Rahma', phone: '08198765432', service: 'Layanan Premium Treatment', qty: 7, price: 50000, total: 350000, method: 'QRIS_TRANSFER', status: 'COMPLETED', time: '10:45 WIB' },
        { id: 'NOT-2026-0890', customer: 'Bapak Ahmad Fauzi', phone: '08567890123', service: 'Layanan Cuci Regular', qty: 6, price: 20000, total: 120000, method: 'CASH', status: 'COMPLETED', time: '09:30 WIB' },
      ];
    }
    return [];
  });

  const [requestedApprovals, setRequestedApprovals] = useState(() => {
    if (isDemo) {
      return [
        { id: 'req-01', type: 'CANCELLATION', title: 'Permintaan Pembatalan Nota NOT-2026-0891', nota: 'NOT-2026-0891', status: 'MENUNGGU_SETUJU_KC', time: '10:15 WIB' },
      ];
    }
    return [];
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer Selector Change Handler in POS Form
  const handlePOSCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId === 'NEW_CUSTOMER') {
      setIsNewCustomerMode(true);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedSalutation('Kak');
    } else {
      setIsNewCustomerMode(false);
      const found = customerList.find(c => c.id === customerId);
      if (found) {
        const { salutation, cleanName } = extractSalutation(found.name);
        if (salutation) {
          setSelectedSalutation(salutation);
          setCustomerName(cleanName);
        } else {
          setCustomerName(found.name);
        }
        setCustomerPhone(found.phone);
      }
    }
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
      if (catalog.length === 0 || !selectedService) {
        setFeedback({ type: 'error', text: 'Silakan pilih layanan atau produk terlebih dahulu.' });
        return;
      }
      const found = catalog.find(c => c.nama === selectedService);
      if (found) {
        const isService = found.item_type !== 'PRODUCT';
        const finalQty = Math.max(1, qty);
        finalItems = [{
          id: `item-${Date.now()}`,
          catalog_id: found.id,
          service: found.nama,
          qty: finalQty,
          price: found.base_harga,
          pricing_unit: (found.pricing_unit || (isService ? 'sepasang' : 'pc')) as string,
          item_type: found.item_type || 'SERVICE',
          duration_val: isService ? (found.duration_val || 1) : undefined,
          duration_unit: isService ? (found.duration_unit || 'HARI') : undefined,
          estimatedCompletion: isService ? (estimatedCompletion || calculateDefaultCompletion(found.duration_val, found.duration_unit, found.duration_hours)) : undefined,
          subtotal: found.base_harga * finalQty,
        }];
      }
    }

    if (finalItems.length === 0) {
      setFeedback({ type: 'error', text: 'Nota harus memiliki minimal satu layanan atau produk.' });
      return;
    }

    const currentTotal = finalItems.reduce((acc, it) => acc + it.subtotal, 0);
    const computedDp = paymentType === 'LUNAS' ? currentTotal : (Number(dpAmount) || 0);
    const computedRemaining = Math.max(0, currentTotal - computedDp);

    if (paymentType === 'DP' && computedDp <= 0) {
      setFeedback({ type: 'error', text: 'Silakan masukkan nominal DP (Uang Muka) lebih besar dari 0.' });
      return;
    }

    const finalCustomerName = formatCustomerName(customerName, selectedSalutation);
    const serviceSummary = finalItems.length === 1 
      ? finalItems[0].service 
      : `${finalItems[0].service} + ${finalItems.length - 1} layanan lain`;
    
    // Find earliest or longest estimated completion if services exist
    const serviceWithSla = finalItems.find(it => it.estimatedCompletion);
    const finalEstimatedCompletion = serviceWithSla ? serviceWithSla.estimatedCompletion : undefined;

    const newTrx: TransactionRecord = {
      id: `NOT-2026-0${recentTransactions.length + 893}`,
      customer: finalCustomerName,
      phone: customerPhone.trim(),
      service: serviceSummary,
      qty: finalItems.reduce((sum, it) => sum + it.qty, 0),
      pricing_unit: finalItems[0]?.pricing_unit || 'unit',
      price: finalItems[0]?.price || 0,
      total: currentTotal,
      payment_type: paymentType,
      dp_amount: computedDp,
      remaining_amount: computedRemaining,
      method: paymentMethod,
      status: paymentType === 'LUNAS' ? 'COMPLETED' : 'DP_PAID',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      estimatedCompletion: finalEstimatedCompletion,
      itemPhotoUrl: itemPhotoUrl,
      items: finalItems,
    };

    setRecentTransactions([newTrx, ...recentTransactions]);
    setActiveReceiptTrx(newTrx); // Buka Thermal Receipt Modal
    setShowPosModal(false); // Tutup Form Buat Nota Pop-up

    // Auto-save new customer to customerList if unregistered
    if (isNewCustomerMode || !customerList.some(c => c.phone === customerPhone.trim())) {
      const newC = {
        id: `cust-${Date.now()}`,
        name: finalCustomerName,
        phone: customerPhone.trim(),
        status: 'NEW',
        totalTrx: 1,
        lastVisit: new Date().toISOString().substring(0, 10),
      };
      setCustomerList(prev => [newC, ...prev]);
      setSelectedCustomerId(newC.id);
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

    // Reset Form for next transaction
    setOrderItems([]);
    setItemPhotoUrl(null);
    setPaymentType('LUNAS');
    setDpAmount('');
    setQty(1);

    const paymentFeedback = paymentType === 'LUNAS'
      ? `LUNAS (Rp ${currentTotal.toLocaleString('id-ID')})`
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
    const newC = {
      id: `cust-${Date.now()}`,
      name: finalFormattedName,
      phone: newCustPhone.trim(),
      status: 'NEW',
      totalTrx: 1,
      lastVisit: new Date().toISOString().substring(0, 10),
    };
    setCustomerList([newC, ...customerList]);
    setSelectedCustomerId(newC.id);
    setCustomerName(newCustName.trim());
    setSelectedSalutation(newCustSalutation);
    setCustomerPhone(newC.phone);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustSalutation('Kak');
    setFeedback({ type: 'success', text: `Pelanggan baru '${newC.name}' berhasil ditambahkan ke Database Pelanggan.` });
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
    const profile = BusinessProfileService.getProfile(businessId);
    const completionLine = trx.estimatedCompletion ? `\nEstimasi Selesai : ${trx.estimatedCompletion}` : '';

    const itemsLines = trx.items && trx.items.length > 0
      ? trx.items.map(it => `• ${it.service} (${it.qty} ${it.pricing_unit || 'x'}) : Rp ${it.subtotal.toLocaleString('id-ID')}`).join('\n')
      : `• ${trx.service} (${trx.qty} ${trx.pricing_unit || 'x'}) : Rp ${trx.total.toLocaleString('id-ID')}`;

    const paymentLines = trx.payment_type === 'DP'
      ? `Total Tagihan : Rp ${trx.total.toLocaleString('id-ID')}
DP Diterima   : Rp ${(trx.dp_amount || 0).toLocaleString('id-ID')} (${trx.method})
SISA TAGIHAN  : Rp ${(trx.remaining_amount || 0).toLocaleString('id-ID')} (Pelunasan saat pengambilan)`
      : `Total Tagihan : Rp ${trx.total.toLocaleString('id-ID')}
Pembayaran    : ${trx.method} (LUNAS)`;

    return `*${profile.business_name.toUpperCase()}*
${profile.business_address}
No. WA Bisnis Resmi: ${profile.business_phone}
--------------------------------
No. Nota : ${trx.id}
Waktu    : ${trx.time}
Kasir    : ${actorName}
Pelanggan: ${trx.customer} (${trx.phone})${completionLine}
--------------------------------
RINCIAN PESANAN:
${itemsLines}
--------------------------------
STATUS PEMBAYARAN:
${paymentLines}
--------------------------------
Syarat & Ketentuan:
${profile.terms_and_conditions}

--------------------------------
Pesan nota ini dikirim resmi dari No. Bisnis Toko: ${profile.business_phone}`;
  };

  const handleSendDirectWaReceipt = (trx: TransactionRecord) => {
    const text = generateWaReceiptText(trx);
    RetentionDomainService.openDirectWhatsApp(trx.phone, text);
    setFeedback({
      type: 'success',
      text: `Membuka WhatsApp langsung (WA Cepat) ke nomor tujuan ${trx.customer} (${trx.phone}). Silakan langsung tekan kirim di WhatsApp.`,
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
          {/* MAIN ACTION BUTTONS: [Buat Nota] [SPK] [Pelunasan/Pengambilan] */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setShowPosModal(true)}
              className="p-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Buat Nota</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSpkModal(true)}
              className="p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
            >
              <Wrench className="w-5 h-5" />
              <span>SPK ({spkOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPickupModal(true)}
              className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Pengambilan Barang</span>
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

              <a
                href="https://wa.me/6281215566630?text=Halo%20CS%20PILIN%20ERP,%20saya%20butuh%20bantuan%20kasir"
                target="_blank"
                rel="noopener noreferrer"
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
              </a>
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

            {/* Customer Dropdown Selection */}
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                Pilih Pelanggan dari Database:
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => handlePOSCustomerSelect(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {customerList.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} ({c.phone}) — {c.status}
                  </option>
                ))}
                <option value="NEW_CUSTOMER">✏️ + Input Pelanggan Baru / Unregistered</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    placeholder="Nama Pelanggan"
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
                  placeholder="08xxxxxxxxxx"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Clear WhatsApp Target Badge */}
            {customerPhone && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Nota WA akan dikirim ke:</span>
                </span>
                <span className="font-mono font-bold bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded">
                  {customerPhone}
                </span>
              </div>
            )}

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
                    <th className="p-3">Kunjungan Terakhir</th>
                    <th className="p-3">Aksi WA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {customerList.map(c => (
                    <tr key={c.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{c.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{c.name}</td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{c.phone}</td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">{c.totalTrx} Trx</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{c.lastVisit}</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setWaSelectedCustomerId(c.id);
                            setWaTargetName(c.name);
                            setWaTargetPhone(c.phone);
                            updateWaTemplateText(c.name, waCategory);
                            setActiveBottomNav('CRM');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>[Kirim]</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WA ENGINE / CRM (REMINDER, OVERDUE NOTA, MANDAT KC, KABAR BERKALA, TEMPLATE INDUSTRI) */}
      {activeBottomNav === 'CRM' && (
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
            <a
              href="https://wa.me/6281215566630?text=Halo%20CS%20PILIN%20ERP,%20saya%20butuh%20bantuan%20kasir"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center space-x-3.5">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Hubungi CS via WhatsApp</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">CS PILIN 0812 15566630</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </a>

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
                <span>Pengaturan Printer</span>
              </h3>
              <button onClick={() => setShowPrinterModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Cetak Nota Otomatis</div>
                  <div className="text-[11px] text-slate-500">Cetak nota thermal setelah transaksi lunas</div>
                </div>
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

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">Ukuran Kertas Thermal</div>
                <div className="text-[11px] text-slate-500 font-mono">Standard Thermal Receipt 58mm (POS Bluetooth/USB)</div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Tes Cetak Nota Thermal 58mm</span>
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
                const profile = BusinessProfileService.getProfile(businessId);
                return (
                  <div className="w-[280px] bg-white text-slate-900 p-4 rounded border border-slate-300 font-mono text-[11px] leading-tight space-y-2 shadow-inner">
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
                      {activeReceiptTrx.estimatedCompletion && (
                        <div className="flex justify-between font-bold text-amber-900 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 mt-1">
                          <span>EST. SELESAI:</span>
                          <span>{activeReceiptTrx.estimatedCompletion}</span>
                        </div>
                      )}
                    </div>

                    {/* Rincian Pesanan / Layanan */}
                    <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
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
                      <div className="flex justify-between font-black">
                        <span>TOTAL:</span>
                        <span>Rp {activeReceiptTrx.total.toLocaleString('id-ID')}</span>
                      </div>
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
                          <span className="font-bold">{activeReceiptTrx.method} (LUNAS)</span>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak 58 mm</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendDirectWaReceipt(activeReceiptTrx)}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-4 h-4" />
                <span>[Kirim]</span>
              </button>
            </div>
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
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Data Konsumen</span>
                  </div>

                  {customerList.length > 0 ? (
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomerMode(false);
                          if (customerList[0]) handlePOSCustomerSelect(customerList[0].id);
                        }}
                        className={`px-2.5 py-1 font-bold rounded-md transition-all ${
                          !isNewCustomerMode
                            ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Pilih dari Database ({customerList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCustomerMode(true);
                          setSelectedCustomerId('NEW_CUSTOMER');
                          setCustomerName('');
                          setCustomerPhone('');
                        }}
                        className={`px-2.5 py-1 font-bold rounded-md transition-all ${
                          isNewCustomerMode
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        + Input Konsumen Baru
                      </button>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Mode Konsumen Baru (Database Kosong)
                    </span>
                  )}
                </div>

                {!isNewCustomerMode && customerList.length > 0 ? (
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                      Pilih Pelanggan dari Database:
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={e => handlePOSCustomerSelect(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {customerList.map(c => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name} ({c.phone})
                        </option>
                      ))}
                      <option value="NEW_CUSTOMER">✏️ + Input Konsumen Baru Lainnya</option>
                    </select>
                  </div>
                ) : (
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
                          placeholder="Nama Konsumen"
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
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg py-2.5 pr-2.5 pl-14 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                        No. WhatsApp:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 081234567890"
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
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
                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                          Pilih Layanan / Produk:
                        </label>
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
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          {catalog.map(item => (
                            <option key={item.id} value={item.nama}>
                              {item.nama} — Rp {item.base_harga.toLocaleString('id-ID')} / {item.pricing_unit || (item.item_type === 'PRODUCT' ? 'unit' : 'sepasang')} {item.item_type === 'PRODUCT' ? `[Stok: ${item.stock_qty ?? 0}]` : `[Est. ${formatDurationLabel(item.duration_val, item.duration_unit) || ((item.duration_hours || 24) + ' Jam')}]`}
                            </option>
                          ))}
                        </select>
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
                            {it.estimatedCompletion && (
                              <div className="text-[10px] text-purple-700 dark:text-purple-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 inline" />
                                <span>Est. Selesai: {it.estimatedCompletion}</span>
                              </div>
                            )}
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
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-400">TOTAL TAGIHAN:</span>
                    <span className="font-black text-slate-900 dark:text-white text-base">
                      Rp {totalBill.toLocaleString('id-ID')}
                    </span>
                  </div>

                  {paymentType === 'DP' ? (
                    <>
                      <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
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
                    <div className="flex justify-between items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>STATUS PEMBAYARAN:</span>
                      <span>LUNAS ({paymentMethod === 'CASH' ? 'Tunai' : 'QRIS'})</span>
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
            </form>
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
