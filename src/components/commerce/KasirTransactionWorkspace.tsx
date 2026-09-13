'use client';

import React, { useState, useRef } from 'react';
import { 
  ShoppingCart, DollarSign, CreditCard, Clock, CheckCircle2, 
  AlertCircle, Send, FileText, UserCheck, Users, MessageSquare, 
  Sparkles, Camera, Image as ImageIcon, Search, Phone, Printer, X, Filter
} from 'lucide-react';
import { PresensiModule } from '../people/PresensiModule';
import { BroadcastCameraModal } from '../broadcast/BroadcastCameraModal';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { RetentionDomainService, SapaanLogRecord } from '@/domains/retention/retentionDomainService';
import { BusinessProfileService } from '@/domains/business/businessProfileService';
import { ServiceOrderStatus } from '@/lib/types';

interface KasirTransactionWorkspaceProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorName?: string;
}

interface TransactionRecord {
  id: string;
  customer: string;
  phone: string;
  service: string;
  qty: number;
  price: number;
  total: number;
  method: 'CASH' | 'QRIS_TRANSFER';
  status: string;
  time: string;
  itemPhotoUrl?: string | null;
}

export function KasirTransactionWorkspace({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  actorUserId = 'user-kasir-01',
  actorName = 'Siti Rahma',
}: KasirTransactionWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'POS' | 'SPK' | 'CUSTOMER' | 'WA_ENGINE' | 'BROADCAST' | 'OPERASIONAL' | 'PRESENSI'>('POS');

  // Modal State
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [broadcastTargetPhone, setBroadcastTargetPhone] = useState<string>('08123456789');
  const [broadcastTargetName, setBroadcastTargetName] = useState<string>('Budi Santoso');

  // Thermal Receipt Modal State
  const [activeReceiptTrx, setActiveReceiptTrx] = useState<TransactionRecord | null>(null);

  // Customer DB Local State
  const [customerList, setCustomerList] = useState([
    { id: 'cust-101', name: 'Budi Santoso', phone: '08123456789', status: 'REPEAT', totalTrx: 12, lastVisit: '2026-08-14' },
    { id: 'cust-102', name: 'Siti Rahma', phone: '08198765432', status: 'LOYAL', totalTrx: 28, lastVisit: '2026-08-15' },
    { id: 'cust-103', name: 'Ahmad Fauzi', phone: '08567890123', status: 'NEW', totalTrx: 1, lastVisit: '2026-08-15' },
    { id: 'cust-104', name: 'Dewi Lestari', phone: '08212345678', status: 'AT_RISK', totalTrx: 5, lastVisit: '2026-06-10' },
  ]);

  // POS Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-101');
  const [customerName, setCustomerName] = useState<string>('Budi Santoso');
  const [customerPhone, setCustomerPhone] = useState<string>('08123456789');
  const [selectedService, setSelectedService] = useState<string>('Layanan Cuci Express');
  const [servicePrice, setServicePrice] = useState<number>(35000);
  const [qty, setQty] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS_TRANSFER'>('CASH');

  // Item Condition Photo (Service Pre-Condition Photo)
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string | null>(null);
  const itemPhotoInputRef = useRef<HTMLInputElement>(null);

  // Approvals State
  const [discountPercent, setDiscountPercent] = useState<number>(10);
  const [discountReason, setDiscountReason] = useState<string>('Diskon Member Setia');
  const [cancelNotaNumber, setCancelNotaNumber] = useState<string>('NOT-2026-0885');
  const [cancelReason, setCancelReason] = useState<string>('Pelanggan membatalkan pesanan');

  // Customer DB Form
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');

  // WA Engine State
  const [waSelectedCustomerId, setWaSelectedCustomerId] = useState<string>('cust-101');
  const [waTargetName, setWaTargetName] = useState<string>('Budi Santoso');
  const [waTargetPhone, setWaTargetPhone] = useState<string>('08123456789');
  const [waCategory, setWaCategory] = useState<'SAPAAN' | 'QUOTE' | 'HYPPOSELLING' | 'REMINDER' | 'MANUAL'>('SAPAAN');
  const [waTemplateText, setWaTemplateText] = useState<string>(
    'Halo Budi Santoso, terima kasih telah menggunakan layanan PILIN ERP. Bagaimana hasil pengerjaan tim kami?'
  );

  // WA Retention Logs & Mandate Execution State
  const [waLogs, setWaLogs] = useState<SapaanLogRecord[]>(() => RetentionDomainService.getSapaanLogs());

  // Reminder H+X Per Nota State
  const [reminderNotaNumber, setReminderNotaNumber] = useState<string>('NOT-2026-0891');
  const [reminderCustomerName, setReminderCustomerName] = useState<string>('Dewi Lestari');
  const [reminderCustomerPhone, setReminderCustomerPhone] = useState<string>('08212345678');
  const [reminderHPlusDays, setReminderHPlusDays] = useState<number>(30);

  const refreshWaLogs = () => {
    setWaLogs(RetentionDomainService.getSapaanLogs());
  };

  const handleExecuteMandateOrReminder = (logRecord: SapaanLogRecord) => {
    const executed = RetentionDomainService.executeWaByKasir(logRecord.id);
    if (executed) {
      refreshWaLogs();
      setFeedback({ type: 'success', text: `Pesan WA (${executed.category}) untuk ${executed.customer_name} telah dieksekusi. Membuka WhatsApp...` });
      window.open(executed.wa_me_url, '_blank');
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
  const [spkOrders] = useState<WorkOrderQueueItem[]>(() => WorkQueueService.getOrders(branchId));

  // Transactions State
  const [recentTransactions, setRecentTransactions] = useState<TransactionRecord[]>([
    { id: 'NOT-2026-0892', customer: 'Budi Santoso', phone: '08123456789', service: 'Layanan Cuci Express', qty: 2, price: 35000, total: 70000, method: 'CASH', status: 'COMPLETED', time: '11:05 WIB' },
    { id: 'NOT-2026-0891', customer: 'Siti Rahma', phone: '08198765432', service: 'Layanan Premium Treatment', qty: 7, price: 50000, total: 350000, method: 'QRIS_TRANSFER', status: 'COMPLETED', time: '10:45 WIB' },
    { id: 'NOT-2026-0890', customer: 'Ahmad Fauzi', phone: '08567890123', service: 'Layanan Cuci Regular', qty: 6, price: 20000, total: 120000, method: 'CASH', status: 'COMPLETED', time: '09:30 WIB' },
  ]);

  const [requestedApprovals, setRequestedApprovals] = useState([
    { id: 'req-01', type: 'DISCOUNT', title: 'Permintaan Diskon Khusus 15%', nota: 'NOT-2026-0891', status: 'MENUNGGU_SETUJU_KC', time: '10:15 WIB' },
  ]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Customer Selector Change Handler in POS Form
  const handlePOSCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId === 'NEW_CUSTOMER') {
      setCustomerName('');
      setCustomerPhone('');
    } else {
      const found = customerList.find(c => c.id === customerId);
      if (found) {
        setCustomerName(found.name);
        setCustomerPhone(found.phone);
      }
    }
  };

  // Item Photo Capture Handler
  const handleItemPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Create Transaction Handler
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setFeedback({ type: 'error', text: 'Nama dan Nomor WhatsApp Pelanggan wajib diisi.' });
      return;
    }

    const total = servicePrice * qty;
    const newTrx: TransactionRecord = {
      id: `NOT-2026-0${recentTransactions.length + 893}`,
      customer: customerName,
      phone: customerPhone,
      service: selectedService,
      qty: qty,
      price: servicePrice,
      total: total,
      method: paymentMethod,
      status: 'COMPLETED',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      itemPhotoUrl: itemPhotoUrl,
    };

    setRecentTransactions([newTrx, ...recentTransactions]);
    setActiveReceiptTrx(newTrx); // Open Thermal Receipt Modal
    setItemPhotoUrl(null); // Reset photo input for next transaction
    setFeedback({ type: 'success', text: `Transaksi '${newTrx.id}' sebesar Rp ${total.toLocaleString('id-ID')} berhasil diproses LUNAS.` });
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      setFeedback({ type: 'error', text: 'Nama dan Nomor HP Pelanggan wajib diisi.' });
      return;
    }
    const newC = {
      id: `cust-${Date.now()}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      status: 'NEW',
      totalTrx: 1,
      lastVisit: new Date().toISOString().substring(0, 10),
    };
    setCustomerList([newC, ...customerList]);
    setSelectedCustomerId(newC.id);
    setCustomerName(newC.name);
    setCustomerPhone(newC.phone);
    setNewCustName('');
    setNewCustPhone('');
    setFeedback({ type: 'success', text: `Pelanggan baru '${newC.name}' berhasil ditambahkan ke Database Pelanggan.` });
  };

  // WA Engine Target Customer Change Handler
  const handleWaCustomerSelect = (customerId: string) => {
    setWaSelectedCustomerId(customerId);
    const found = customerList.find(c => c.id === customerId);
    if (found) {
      setWaTargetName(found.name);
      setWaTargetPhone(found.phone);
      updateWaTemplateText(found.name, waCategory);
    }
  };

  // Update WA Template Text based on Category & Customer
  const updateWaTemplateText = (custName: string, category: typeof waCategory) => {
    if (category === 'SAPAAN') {
      setWaTemplateText(`Halo Kak ${custName}, terima kasih telah menggunakan layanan PILIN ERP. Bagaimana hasil pengerjaan tim kami hari ini? Salam hangat!`);
    } else if (category === 'REMINDER') {
      setWaTemplateText(`Halo Kak ${custName}, ini pengingat ramah dari PILIN ERP. Barang/layanan Anda sudah waktunya perawatan rutin. Dapatkan promo khusus minggu ini!`);
    } else if (category === 'QUOTE') {
      setWaTemplateText(`Halo Kak ${custName}, "Kebersihan dan kerapihan adalah cermin kenyamanan." Selamat beraktivitas kembali dari tim PILIN ERP!`);
    } else if (category === 'HYPPOSELLING') {
      setWaTemplateText(`Halo Kak ${custName}! Khusus hari ini kami ada penawaran perawatan premium terbatas untuk langganan setia. Balas pesan ini untuk klaim diskon 20%!`);
    }
  };

  const handleSendWaMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waTemplateText.trim()) return;
    const link = RetentionDomainService.generateWaMeLink(waTargetPhone, waTemplateText);
    RetentionDomainService.scheduleSapaan({
      customer_name: waTargetName,
      customer_phone: waTargetPhone,
      category: waCategory === 'MANUAL' || waCategory === 'REMINDER' ? 'SAPAAN' : waCategory,
      message_text: waTemplateText,
    });
    setFeedback({ type: 'success', text: `Pesan WA Engine telah disiapkan. Membuka WhatsApp...` });
    setTimeout(() => window.open(link, '_blank'), 400);
  };

  const handleRequestDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq = {
      id: `req-${Date.now()}`,
      type: 'DISCOUNT',
      title: `Permintaan Diskon Khusus ${discountPercent}%`,
      nota: `NOT-2026-0${recentTransactions.length + 890}`,
      status: 'MENUNGGU_SETUJU_KC',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };
    setRequestedApprovals([newReq, ...requestedApprovals]);
    setFeedback({ type: 'success', text: `Permintaan Diskon Khusus ${discountPercent}% telah dikirim ke Kepala Cabang.` });
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

  // Generate WA Nota Link
  const generateWaReceiptLink = (trx: TransactionRecord) => {
    const profile = BusinessProfileService.getProfile(businessId);
    const text = `*${profile.business_name.toUpperCase()}*
${profile.business_address}
No. WA Toko: ${profile.business_phone}
--------------------------------
No. Nota : ${trx.id}
Waktu    : ${trx.time}
Kasir    : ${actorName}
Pelanggan: ${trx.customer} (${trx.phone})
--------------------------------
Item: ${trx.qty}x ${trx.service}
Total: Rp ${trx.total.toLocaleString('id-ID')}
Pembayaran: ${trx.method} (LUNAS)
--------------------------------
Syarat & Ketentuan:
${profile.terms_and_conditions}`;
    return RetentionDomainService.generateWaMeLink(trx.phone, text);
  };

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 font-sans transition-colors">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            <span>Workspace Operasional Kasir & Transaksi (POS)</span>
          </h2>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('POS')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'POS' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🛒 POS & Transaksi
          </button>
          <button
            onClick={() => setActiveTab('SPK')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'SPK' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📋 Layanan & SPK ({spkOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('CUSTOMER')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'CUSTOMER' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            👥 Database Pelanggan ({customerList.length})
          </button>
          <button
            onClick={() => setActiveTab('WA_ENGINE')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'WA_ENGINE' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            💬 WA Engine (Reminder, Sapaan & Hypnoselling)
          </button>
          <button
            onClick={() => setActiveTab('BROADCAST')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'BROADCAST' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📢 Broadcast Teks & Foto
          </button>
          <button
            onClick={() => setActiveTab('OPERASIONAL')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'OPERASIONAL' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ⚙️ Rekap Kasir
          </button>
          <button
            onClick={() => setActiveTab('PRESENSI')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'PRESENSI' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📸 Presensi Selfie & GPS
          </button>
        </div>
      </div>

      {/* Notification Banner */}
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
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nama Pelanggan:</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nama Pelanggan"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
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

            {/* Service & Item Condition Photo Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Layanan Jasa:</label>
                <select
                  value={selectedService}
                  onChange={e => {
                    setSelectedService(e.target.value);
                    if (e.target.value.includes('Express')) setServicePrice(35000);
                    else if (e.target.value.includes('Regular')) setServicePrice(20000);
                    else setServicePrice(50000);
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Layanan Cuci Express">Cuci Express (Rp 35.000)</option>
                  <option value="Layanan Cuci Regular">Cuci Regular (Rp 20.000)</option>
                  <option value="Layanan Premium Treatment">Premium Treatment (Rp 50.000)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Jumlah (Qty):</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Photo Condition of Goods (Pre-Service) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block">
                Foto Bukti Kondisi Barang (Sebelum Pengerjaan):
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={itemPhotoInputRef}
                onChange={handleItemPhotoCapture}
                className="hidden"
              />
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => itemPhotoInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5"
                >
                  <Camera className="w-4 h-4 text-[#F26522]" />
                  <span>Ambil Foto Kondisi Barang</span>
                </button>
                {itemPhotoUrl && (
                  <div className="flex items-center space-x-2 bg-emerald-100 dark:bg-emerald-950 p-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={itemPhotoUrl} alt="Barang" className="w-8 h-8 rounded object-cover" />
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Foto Terlampir</span>
                    <button type="button" onClick={() => setItemPhotoUrl(null)} className="text-rose-600 font-bold px-1 hover:opacity-80">✕</button>
                  </div>
                )}
              </div>
            </div>

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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>PROSES PEMBAYARAN & CETAK NOTA THERMAL</span>
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
                {recentTransactions.map(t => (
                  <div key={t.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{t.id} — {t.customer}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.service} ({t.qty}x) • Rp {t.total.toLocaleString('id-ID')} • {t.method}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveReceiptTrx(t)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded text-[11px] flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-500" />
                        <span>Nota</span>
                      </button>
                      <button
                        onClick={() => window.open(generateWaReceiptLink(t), '_blank')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>WA</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval Requests to KC */}
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span>Kirim Permintaan Ke Kepala Cabang</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <form onSubmit={handleRequestDiscount} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Permintaan Diskon Khusus</div>
                  <div className="space-y-2">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={discountPercent}
                      onChange={e => setDiscountPercent(parseInt(e.target.value, 10) || 0)}
                      placeholder="Diskon %"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={discountReason}
                      onChange={e => setDiscountReason(e.target.value)}
                      placeholder="Alasan Diskon Khusus..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs">
                    Kirim Diskon Khusus
                  </button>
                </form>

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
                  <button type="submit" className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs">
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
                {spkOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{o.order_number || o.id}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{o.customer_name || 'Pelanggan Umum'}</td>
                    <td className="p-3">{o.service_name || 'Cuci Express'}</td>
                    <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{o.target_minutes || 60} Menit</td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded font-bold text-[10px] uppercase">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE PELANGGAN */}
      {activeTab === 'CUSTOMER' && (
        <div className="space-y-6">
          <form onSubmit={handleAddCustomer} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-[#F26522] flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>Tambah Pelanggan Baru Ke Database</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nama Lengkap Pelanggan:</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nomor WhatsApp HP:</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
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
                            setActiveTab('WA_ENGINE');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Kirim WA</span>
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

      {/* TAB 4: WA ENGINE (REMINDER, MANDAT KC, SAPAAN, HYPNOSELLING, TEMPLATE) */}
      {activeTab === 'WA_ENGINE' && (
        <div className="space-y-6">
          {/* SECTION 1: MANDAT PENGIRIMAN DARI KEPALA CABANG */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>📋 Mandat Pengiriman WA dari Kepala Cabang (Membutuhkan Eksekusi Kasir)</span>
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
                            <Send className="w-3.5 h-3.5" />
                            <span>📲 Eksekusi Kirim WA</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: SETUP REMINDER H+X PER NOTA TRANSAKSI */}
          <form onSubmit={handleCreateNotaReminder} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>⏰ Buat Pengingat Perawatan (Reminder H+X) Per Nota Transaksi</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Pilih Nota Transaksi:</label>
                <select
                  value={reminderNotaNumber}
                  onChange={e => {
                    setReminderNotaNumber(e.target.value);
                    const trx = recentTransactions.find(t => t.id === e.target.value);
                    if (trx) {
                      setReminderCustomerName(trx.customer);
                      setReminderCustomerPhone(trx.phone);
                    }
                  }}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
                >
                  {recentTransactions.map(t => (
                    <option key={t.id} value={t.id}>
                      🧾 {t.id} — {t.customer} ({t.service})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nama Pelanggan:</label>
                <input
                  type="text"
                  required
                  value={reminderCustomerName}
                  onChange={e => setReminderCustomerName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">No. WhatsApp Target:</label>
                <input
                  type="text"
                  required
                  value={reminderCustomerPhone}
                  onChange={e => setReminderCustomerPhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Interval Hari (H+X):</label>
                <select
                  value={reminderHPlusDays}
                  onChange={e => setReminderHPlusDays(parseInt(e.target.value, 10))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
                >
                  <option value={14}>H+14 Hari (Perawatan Ringan)</option>
                  <option value={30}>H+30 Hari (Perawatan Rutin Bulanan)</option>
                  <option value={60}>H+60 Hari (Perawatan 2 Bulan)</option>
                  <option value={90}>H+90 Hari (Perawatan Triwulan)</option>
                </select>
              </div>
            </div>

            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>📅 Simpan Reminder H+{reminderHPlusDays} Per Nota</span>
            </button>
          </form>

          {/* SECTION 3: DAFTAR PENGINGAT & LOG EKSEKUSI WA ENGINE */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span>Daftar Pengingat &amp; Log Eksekusi WA Engine (Mandat, Reminder &amp; Sapaan)</span>
              </h3>
              <button
                onClick={refreshWaLogs}
                className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded text-[11px]"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                    <th className="p-3">No. Nota / ID</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">No. WhatsApp</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Interval H+X</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Eksekusi Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {waLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{log.nota_number || log.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{log.customer_name}</td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">{log.customer_phone}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-600 border border-blue-500/30">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-purple-600 dark:text-purple-400">
                        {log.scheduled_h_plus_days ? `H+${log.scheduled_h_plus_days} Hari` : `${log.due_days || 30} Hari`}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          log.status === 'MANDATED' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                        }`}>
                          {log.status === 'MANDATED' ? '📋 MANDAT KC' : '✓ SENT'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleExecuteMandateOrReminder(log)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim WA</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: WA DIRECT ENGINE GENERATOR */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Kirim Pesan WA Direct Generator (Sapaan, Quote, Hypnoselling &amp; Manual)</span>
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
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Pilih Template / Kategori Engine:</label>
                  <select
                    value={waCategory}
                    onChange={e => {
                      const cat = e.target.value as any;
                      setWaCategory(cat);
                      updateWaTemplateText(waTargetName, cat);
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="SAPAAN">👋 Sapaan Ramah Pelanggan</option>
                    <option value="REMINDER">⏰ Reminder Service &amp; Perawatan Routine</option>
                    <option value="QUOTE">💬 Kutipan (Quote) Kebersihan</option>
                    <option value="HYPPOSELLING">✨ Hypnoselling Promosi Terpersonalisasi</option>
                    <option value="MANUAL">✏️ Input Manual (Tulis Pesan Sendiri)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">
                  Teks Pesan WhatsApp (Engine Auto-Generated / Custom Manual):
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
                <span>Kirim Pesan WhatsApp Via Engine (wa.me)</span>
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

      {/* TAB 6: REKAP OPERASIONAL KASIR */}
      {activeTab === 'OPERASIONAL' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Omzet Kasir Hari Ini</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Rp 4.850.000</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">18 Transaksi Lunas</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Kas Laci Tunai</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">Rp 1.450.000</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Terverifikasi Laci Kasir</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status Permintaan ke KC</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{requestedApprovals.length} Item</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Diskon / Pembatalan</div>
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
                    </div>

                    <div className="border-t border-dashed border-slate-400 pt-2 space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{activeReceiptTrx.qty}x {activeReceiptTrx.service}</span>
                        <span>Rp {activeReceiptTrx.total.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Pre-service photo thumbnail if available */}
                    {activeReceiptTrx.itemPhotoUrl && (
                      <div className="border-t border-dashed border-slate-400 pt-2 text-center">
                        <div className="text-[9px] font-bold uppercase text-slate-600 mb-1">Bukti Kondisi Barang (Pre-Service)</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={activeReceiptTrx.itemPhotoUrl} alt="Kondisi Barang" className="w-24 h-24 mx-auto object-cover rounded border border-slate-300" />
                      </div>
                    )}

                    <div className="border-t border-dashed border-slate-400 pt-2 text-xs">
                      <div className="flex justify-between font-black">
                        <span>TOTAL:</span>
                        <span>Rp {activeReceiptTrx.total.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mt-0.5">
                        <span>PEMBAYARAN:</span>
                        <span className="font-bold">{activeReceiptTrx.method} (LUNAS)</span>
                      </div>
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
                onClick={() => window.open(generateWaReceiptLink(activeReceiptTrx), '_blank')}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Send className="w-4 h-4" />
                <span>Kirim WA (wa.me)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
