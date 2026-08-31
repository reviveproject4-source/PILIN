'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShoppingBag, ShieldCheck, Shield, Lock, RefreshCw, 
  Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, KeyRound,
  TrendingUp, Clock, AlertCircle, Ban, Phone, MapPin, Layers,
  DollarSign, Award, Percent, TrendingDown, Gift, Zap, MessageSquare, PieChart, Sparkles, Wrench, PackageCheck, ClipboardList, LayoutGrid, Trophy, Camera, Trash2, Send, Printer
} from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/normalizePhoneNumber';
import { ServiceOrderStatus, QCStatus } from '@/lib/types';
import { PromotionEngine } from '@/domains/revenue/promotionEngine';
import { FinancialReportService } from '@/domains/finance/financialReportService';
import { GamificationService } from '@/domains/intelligence/gamificationService';
import { HypnosellingEngine } from '@/domains/retention/hypnosellingEngine';
import { AnalyticsService } from '@/domains/intelligence/analyticsService';
import { WorkDomainService } from '@/domains/work/workDomainService';
import { ManagementControlDashboard } from '@/components/management/ManagementControlDashboard';
import { ManagementRole } from '@/domains/management/managementAuthorization';
import { ServiceCatalogService } from '@/domains/catalog/serviceCatalogService';
import { CustomerDomainService } from '@/domains/customer/customerService';
import { CustomerImporterEngine } from '@/domains/customer/importerEngine';
import { ImportUpdatePolicy } from '@/lib/types';
import { ExpenseDomainService, ExpenseRecord } from '@/domains/finance/expenseService';
import { WorkQueueService } from '@/domains/work/workQueueService';
import { RetentionDomainService, SapaanLogRecord } from '@/domains/retention/retentionDomainService';
import { IndustryTemplateService, IndustryCategory } from '@/domains/retention/industryTemplateService';
import { PromotionDomainService, PromotionRecord } from '@/domains/revenue/promotionService';
import { GamificationDomainService, PerformanceRecord } from '@/domains/intelligence/gamificationDomainService';
import { ImageCompressorService } from '@/lib/imageCompressor';
import { CommercialDomainService, PILIN_FEATURE_PRICING_CATALOG, ACTIVATION_FEE_AMOUNT, MIN_SALDO_PILIN_TOPUP, WA_MESSAGE_UNIT_PRICE, LOW_BALANCE_ALERT_THRESHOLD, FeaturePricingItem } from '@/domains/commercial/commercialService';
import { UsageWalletService, UsageLedgerRecord, LowBalanceAlertRecord } from '@/domains/commercial/usageWalletService';
import { SalesCommissionService } from '@/domains/commercial/salesCommissionService';

export default function MinaraBOSDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'pos' | 'work' | 'customers' | 'finance' | 'revenue' | 'gamification' | 'management' | 'control' | 'intelligence' | 'sapaan' | 'importer' | 'overview' | 'expense' | 'reminder_report' | 'attendance' | 'broadcast' | 'gmf'
  >('dashboard');
  const [activeRole, setActiveRole] = useState<ManagementRole>('OWNER');
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCategory>('SPA_SALON');

  // Interactive Phone Normalizer State
  const [testPhone, setTestPhone] = useState('08123456789');
  const normalizedResult = normalizePhoneNumber(testPhone);

  // Interactive POS Commerce State (Phase 8 Cleaned & Enhanced)
  const [cart, setCart] = useState<{ id: string; nama: string; qty: number; unit_price: number; notes?: string; photo_url?: string }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [lastTransaction, setLastTransaction] = useState<{
    id: string;
    customer_name: string;
    cashier_name: string;
    subtotal: number;
    discount: number;
    total: number;
    dp_paid: number;
    remaining_balance: number;
    payment_status: 'LUNAS' | 'DP / PENDING PELUNASAN';
    method: string;
    timestamp: string;
    completion_date?: string;
    branch_id?: string;
    branch_name?: string;
    items_count: number;
    photo_url?: string;
    items?: { id: string; nama: string; qty: number; unit_price: number }[];
  } | null>(null);
  const [showKasirFullStruk, setShowKasirFullStruk] = useState<boolean>(false);
  const [posPromoInput, setPosPromoInput] = useState('');
  const [appliedPosPromo, setAppliedPosPromo] = useState<{ code: string; discountAmount: number; message: string } | null>(null);

  // Enhanced POS Customer Selection, Cashier Identity, Single Master Transaction Photo & DP Input State
  const [posCashierName, setPosCashierName] = useState<string>('');
  const [posMasterPhotoUrl, setPosMasterPhotoUrl] = useState<string>('');

  // Tenant Terms & Conditions & Address (Configured by Owner after Master Data Input)
  const [tenantTerms, setTenantTerms] = useState<string>(
    '1. Barang yang sudah diambil tidak dapat dikomplain setelah 3 hari kerja.\n2. Wajib membawa & menunjukkan nota resmi ini saat pengambilan.\n3. Kerusakan akibat bencana alam di luar tanggung jawab toko.'
  );
  const [tenantAddress, setTenantAddress] = useState<string>('Jl. Raya Utama No. 88, Jakarta Selatan');

  // Executive Owner Account Credentials & Client Activation State (Model B2B SaaS)
  const [clientActivationData, setClientActivationData] = useState<{
    id: string;
    ownerName: string;
    businessName: string;
    industry: string;
    email: string;
    phone: string;
    packagePlan: string;
    activationDate: string;
    envMode: 'DEMO' | 'LIVE';
  } | null>({
    id: 'ACT-2026-001',
    ownerName: 'Hendra Wijaya',
    businessName: 'PILIN Clean & Care',
    industry: 'Grooming & Care',
    email: 'owner@pilin.id',
    phone: '081234567890',
    packagePlan: 'Paket Enterprise Multi-Branch',
    activationDate: new Date().toISOString().split('T')[0],
    envMode: 'LIVE'
  });

  // Multi-Environment System Mode State (DEMO vs LIVE PRODUCTION)
  const [systemEnvMode, setSystemEnvMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [actCleanDatabase, setActCleanDatabase] = useState<boolean>(true);
  const [liveMetricsReset, setLiveMetricsReset] = useState<boolean>(false);

  const [ownerEmail, setOwnerEmail] = useState<string>('owner@pilin.id');
  const [ownerPassword, setOwnerPassword] = useState<string>('1234');

  // Form State Activation Pertama Kali
  const [actOwnerName, setActOwnerName] = useState('');
  const [actBusinessName, setActBusinessName] = useState('');
  const [actIndustry, setActIndustry] = useState('Grooming & Care');
  const [actEmail, setActEmail] = useState('');
  const [actPhone, setActPhone] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actPackagePlan, setActPackagePlan] = useState('Paket Enterprise Multi-Branch');

  // Authentication & Interactive Login Form State
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginRoleSelect, setLoginRoleSelect] = useState<ManagementRole>('OWNER');
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [showActivationForm, setShowActivationForm] = useState(false);

  const handleExecuteActivation = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMsg(null);

    if (!actOwnerName.trim() || !actBusinessName.trim() || !actEmail.trim() || !actPassword.trim() || !actPhone.trim()) {
      setLoginErrorMsg('Mohon lengkapi seluruh data aktivasi owner & bisnis!');
      return;
    }

    const cleanEmail = actEmail.trim();
    const cleanPass = actPassword.trim();

    const activationRecord = {
      id: `ACT-${new Date().getFullYear()}-001`,
      ownerName: actOwnerName.trim(),
      businessName: actBusinessName.trim(),
      industry: actIndustry,
      email: cleanEmail,
      phone: actPhone.trim(),
      packagePlan: actPackagePlan,
      activationDate: new Date().toISOString().split('T')[0],
      envMode: 'LIVE' as const
    };

    setClientActivationData(activationRecord);
    setOwnerEmail(cleanEmail);
    setOwnerPassword(cleanPass);
    setSystemEnvMode('LIVE'); // Auto-switch to Live Production

    // Persist to LocalStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_client_activation', JSON.stringify(activationRecord));
        localStorage.setItem('pilin_owner_email', cleanEmail);
        localStorage.setItem('pilin_owner_password', cleanPass);
        localStorage.setItem('pilin_env_mode', 'LIVE');
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }

    if (actCleanDatabase) {
      setLiveMetricsReset(true);
      setCart([]);
      setWorkOrders([]);
      setCurrPeriodRevenue(0);
    }

    // Auto-login Owner
    setActiveRole('OWNER');
    setActiveTab('overview');
    setSelfServicePin(cleanPass);
    setIsAuthenticated(true);
    setLoginErrorMsg(null);
  };

  const handleExecuteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMsg(null);

    // OWNER LOGIN VERIFICATION
    if (loginRoleSelect === 'OWNER') {
      const cleanEmail = loginUsername.trim();
      const cleanPass = loginPassword.trim();
      if (!cleanEmail || !cleanPass) {
        setLoginErrorMsg('Mohon masukkan Email & Password Owner!');
        return;
      }
      if (!ownerEmail) {
        setLoginErrorMsg('⚠️ Belum ada data aktivasi Owner! Silakan isi Form Aktivasi Sistem Pertama Kali.');
        return;
      }
      if (cleanEmail !== ownerEmail || cleanPass !== ownerPassword) {
        setLoginErrorMsg(`⚠️ Email atau Password Owner salah!`);
        return;
      }
      setActiveRole('OWNER');
      setActiveTab('overview');
      setSelfServicePin(cleanPass);
      setIsAuthenticated(true);
      return;
    }

    // PEGAWAI & KEPALA CABANG LOGIN VERIFICATION
    if (employeeMasterList.length === 0) {
      setLoginErrorMsg('⚠️ Belum ada akun pegawai terdaftar! Silakan log-in sebagai Owner terlebih dahulu untuk mendaftarkan akun pegawai baru.');
      return;
    }

    if (!loginUsername.trim()) {
      setLoginErrorMsg('Mohon pilih Nama Pegawai Terdaftar dari dropdown!');
      return;
    }

    const matchedEmp = employeeMasterList.find(emp => emp.nama === loginUsername.trim());
    if (!matchedEmp) {
      setLoginErrorMsg('Nama pegawai tidak terdaftar di Master Data Owner!');
      return;
    }

    const cleanPassword = loginPassword.trim();
    if (!cleanPassword) {
      setLoginErrorMsg(`Mohon masukkan Password / PIN untuk ${matchedEmp.nama}!`);
      return;
    }

    if (cleanPassword !== matchedEmp.password_pin) {
      setLoginErrorMsg(`⚠️ Password / PIN untuk ${matchedEmp.nama} salah! Silakan konfirmasi ke Owner.`);
      return;
    }

    setLoggedInEmp(matchedEmp);
    setActiveRole(loginRoleSelect);

    // Automatically assign active branch to logged in employee's assigned branch
    const matchedBranchObj = branchesList.find(b =>
      b.name.toLowerCase().includes(matchedEmp.branch.toLowerCase()) ||
      matchedEmp.branch.toLowerCase().includes(b.name.toLowerCase())
    );
    const targetBranchId = matchedBranchObj ? matchedBranchObj.id : 'BRANCH_001';
    setSelectedBranchId(targetBranchId);

    if (loginRoleSelect === 'KEPALA_CABANG') {
      setActiveTab('management');
    } else {
      const isKasir = matchedEmp.role.toLowerCase().includes('kasir');
      if (isKasir) {
        setActiveTab('pos');
      } else if (matchedEmp.role.toLowerCase().includes('teknisi') || matchedEmp.role.toLowerCase().includes('spk')) {
        setActiveTab('work');
      } else {
        setActiveTab('sapaan');
      }
      setPosCashierName(`${matchedEmp.nama} (${matchedEmp.role})`);
    }

    setSelfServicePin(cleanPassword);
    setIsAuthenticated(true);
    setLoginErrorMsg(null);
  };

  const [loggedInEmp, setLoggedInEmp] = useState<{ id: string; nama: string; role: string; branch: string } | null>(null);

  // Authorized Role Check: Only Admin/Owner & Kasir POS are allowed to input POS transaction receipts
  const isAuthorizedPosCashier = activeRole === 'OWNER' || (
    activeRole === 'PEGAWAI' && (
      (loggedInEmp ? loggedInEmp.role.toLowerCase().includes('kasir') : true) ||
      posCashierName.toLowerCase().includes('kasir')
    )
  );

  // Authorized Role Check: Only Owner, Kepala Cabang, and Kasir POS are allowed to view Customer Database
  const isAuthorizedCustomerViewer = activeRole === 'OWNER' || activeRole === 'KEPALA_CABANG' || (
    activeRole === 'PEGAWAI' && (
      (loggedInEmp ? loggedInEmp.role.toLowerCase().includes('kasir') : true) ||
      posCashierName.toLowerCase().includes('kasir')
    )
  );

  const [selectedPosCustomerId, setSelectedPosCustomerId] = useState<string>('');
  const [showPosQuickReg, setShowPosQuickReg] = useState(false);
  const [posDiscountType, setPosDiscountType] = useState<'PERCENT' | 'RUPIAH'>('PERCENT');
  const [posDiscountValue, setPosDiscountValue] = useState<number>(0);

  const getManualDiscountAmount = (subtotal: number) => {
    if (posDiscountType === 'PERCENT') {
      return Math.round((subtotal * posDiscountValue) / 100);
    } else {
      return Math.min(subtotal, Math.max(0, posDiscountValue));
    }
  };

  const posManualDiscountPercent = posDiscountType === 'PERCENT'
    ? posDiscountValue
    : (cart.reduce((s, i) => s + i.qty * i.unit_price, 0) > 0
        ? Math.round((posDiscountValue / cart.reduce((s, i) => s + i.qty * i.unit_price, 0)) * 100)
        : 0);

  const [posDiscountNotice, setPosDiscountNotice] = useState<string | null>(null);
  const [requireManagerAuth, setRequireManagerAuth] = useState(false);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [posDpInput, setPosDpInput] = useState<string>('0'); // Manual Down Payment input

  // Master Service Catalog State (Global across all branches & roles)
  const [masterCatalogList, setMasterCatalogList] = useState(ServiceCatalogService.getMasterCatalog());
  const posCatalog = masterCatalogList;

  // Interactive Customer Asset State (Domain 02 - Phase 8 Focus)
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerList, setCustomerList] = useState(CustomerDomainService.getCustomers());
  const [showRegForm, setShowRegForm] = useState(false);
  const [newCustNama, setNewCustNama] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustAlamat, setNewCustAlamat] = useState('');
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // Interactive Tenant Custom Lifecycle Stages State (SPK Workflow Flexibility)
  const [tenantLifecycleStages, setTenantLifecycleStages] = useState<{
    id: string;
    code: string;
    label: string;
    color: string;
  }[]>([
    { id: 'stg-1', code: 'RECEIVED', label: 'RECEIVED', color: 'bg-amber-600 border-amber-500' },
    { id: 'stg-2', code: 'IN_PROGRESS', label: 'IN_PROGRESS', color: 'bg-blue-600 border-blue-500' },
    { id: 'stg-3', code: 'QC', label: 'QC', color: 'bg-purple-600 border-purple-500' },
    { id: 'stg-4', code: 'FINISHED', label: 'FINISHED', color: 'bg-emerald-600 border-emerald-500' },
  ]);

  const [newStageName, setNewStageName] = useState('');
  const [showLifecycleConfig, setShowLifecycleConfig] = useState(false);

  const handleAddCustomStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const code = newStageName.trim().toUpperCase().replace(/\s+/g, '_');
    const newStage = {
      id: `stg-${Date.now()}`,
      code: code,
      label: newStageName.trim().toUpperCase(),
      color: 'bg-indigo-600 border-indigo-500 shadow'
    };

    setTenantLifecycleStages(prev => [...prev, newStage]);
    setNewStageName('');
  };

  // Interactive Attendance / Presensi State (Pegawai & Kepala Cabang)
  const [attendanceList, setAttendanceList] = useState<{
    id: string;
    employee_name: string;
    role_label: string;
    type: 'MASUK' | 'KELUAR' | 'IZIN';
    location: string;
    photo_url: string;
    timestamp: string;
    notes?: string;
    status: 'TEPAT_WAKTU' | 'TERLAMBAT' | 'IZIN';
  }[]>([]);

  const [attInputName, setAttInputName] = useState('Dewi Lestari (Kasir)');
  const [attInputType, setAttInputType] = useState<'MASUK' | 'KELUAR' | 'IZIN'>('MASUK');
  const [attInputLocation, setAttInputLocation] = useState('Cabang Utama - Jakarta Pusat');
  const [attInputPhotoUrl, setAttInputPhotoUrl] = useState('');
  const [attInputNotes, setAttInputNotes] = useState('');
  const [attSuccessMsg, setAttSuccessMsg] = useState<string | null>(null);
  const [attCompressionInfo, setAttCompressionInfo] = useState<string | null>(null);

  const handleAttendanceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const res = await ImageCompressorService.compressImage(file, 800, 800, 0.75);
      setAttInputPhotoUrl(res.compressedBase64);
      setAttCompressionInfo(`⚡ Foto Terkompresi Canvas: ${res.originalSizeKb} KB ➔ ${res.compressedSizeKb} KB (-${res.compressionRatioPercent}%)`);
    }
  };

  const handleSubmitAttendance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nowFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) + ' • ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';

    const empName = activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya (Kepala Cabang)' : 'Rina Melati (Kasir Utama)';
    const autoGpsLoc = '📍 Cabang Utama Jakarta (GPS Lat: -6.20887, Long: 106.84561)';

    let finalPhotoUrl = attInputPhotoUrl;
    let compressNote = '';

    if (finalPhotoUrl && finalPhotoUrl.startsWith('data:image')) {
      const res = await ImageCompressorService.compressImage(finalPhotoUrl, 800, 800, 0.75);
      finalPhotoUrl = res.compressedBase64;
      compressNote = ` | Kompresi Canvas: ${res.originalSizeKb}KB ➔ ${res.compressedSizeKb}KB (-${res.compressionRatioPercent}%)`;
    } else if (!finalPhotoUrl) {
      finalPhotoUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300';
    }

    const newRecord = {
      id: `ATT-${Math.floor(100 + Math.random() * 900)}`,
      employee_name: empName,
      role_label: activeRole === 'KEPALA_CABANG' ? 'Kepala Cabang' : 'Pegawai / Kasir',
      type: attInputType,
      location: autoGpsLoc,
      photo_url: finalPhotoUrl,
      timestamp: nowFormatted,
      notes: `Watermark Auto-Stamp GPS, Real-Time Date & Compressed Selfie Photo${compressNote}`,
      status: (attInputType === 'IZIN' ? 'IZIN' : new Date().getHours() >= 8 && new Date().getMinutes() > 0 ? 'TERLAMBAT' : 'TEPAT_WAKTU') as 'TEPAT_WAKTU' | 'TERLAMBAT' | 'IZIN'
    };

    setAttendanceList(prev => [newRecord, ...prev]);
    setAttSuccessMsg(`✓ PRESENSI ${attInputType} BERHASIL! Foto Selfi Terkompresi (Canvas) + Watermark GPS & Waktu Real-time (${nowFormatted}) Otomatis Direkam!`);
  };

  // Interactive Broadcast / Message Blast State (Pegawai & Kepala Cabang)
  const [broadcastList, setBroadcastList] = useState<{
    id: string;
    title: string;
    target_segment: string;
    message_text: string;
    image_url: string;
    total_target: number;
    sent_count: number;
    idle_count: number;
    opt_out_excluded: number;
    folder_path?: string;
    sender_name: string;
    timestamp: string;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    approved_by?: string;
  }[]>([]);

  const [firstTimeApprovedModules, setFirstTimeApprovedModules] = useState<Record<string, boolean>>({
    broadcast: true,    // First-Time ACC completed via BLAST-2026-001
    hypnoselling: true, // First-Time ACC completed
    sapaan: true,       // First-Time ACC completed
    reminder: true      // First-Time ACC completed
  });

  // Owner Legacy Application Customer Import State
  const [showOwnerImportModal, setShowOwnerImportModal] = useState<boolean>(false);
  const [importAppSource, setImportAppSource] = useState<string>('MOKA_POS');
  const [importUpdatePolicy, setImportUpdatePolicy] = useState<ImportUpdatePolicy>('UPDATE_EMPTY_ONLY');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importSuccessResult, setImportSuccessResult] = useState<{
    totalProcessed: number;
    createNewCount: number;
    matchCount: number;
    sampleProcessed: any[];
  } | null>(null);

  const handleLoadSampleLegacyData = (source: string) => {
    setImportAppSource(source);
    if (source === 'MOKA_POS') {
      setImportRawText(JSON.stringify([
        { source_customer_id: 'MOKA-101', nama: 'Hendra Wijaya (Eks Mokapos)', no_hp: '081298765432', email: 'hendra.moka@gmail.com', alamat: 'Jl. Melawai No. 12, Jakarta' },
        { source_customer_id: 'MOKA-102', nama: 'Dewi Sartika (Eks Mokapos)', no_hp: '+628176543210', email: 'dewi.sartika@yahoo.com', alamat: 'Jl. Dago No. 45, Bandung' },
        { source_customer_id: 'MOKA-103', nama: 'Budi Santoso', no_hp: '08123456789', email: 'budi.updated@gmail.com', alamat: 'Jl. Sudirman No. 45 Baru, Jakarta' }
      ], null, 2));
    } else if (source === 'PAWOON') {
      setImportRawText(JSON.stringify([
        { source_customer_id: 'PWN-501', nama: 'Agus Pratama (Eks PaWOON)', no_hp: '085711223344', email: 'agus.pwn@gmail.com', alamat: 'Surabaya' },
        { source_customer_id: 'PWN-502', nama: 'Rina Kusuma (Eks PaWOON)', no_hp: '081988776655', email: 'rina.pwn@outlook.com', alamat: 'Semarang' }
      ], null, 2));
    } else {
      setImportRawText(JSON.stringify([
        { source_customer_id: 'XLS-901', nama: 'Tono Subagyo (Import Excel)', no_hp: '082133445566', email: 'tono.xls@gmail.com', alamat: 'Yogyakarta' },
        { source_customer_id: 'XLS-902', nama: 'Siti Rahma', no_hp: '+62 813 9999 888', email: 'siti.rahma@yahoo.com', alamat: 'Alamat Update Dari Excel' }
      ], null, 2));
    }
  };

  const handleOwnerExecuteImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importRawText.trim()) return;

    let rawRows: any[] = [];
    try {
      rawRows = JSON.parse(importRawText);
      if (!Array.isArray(rawRows)) rawRows = [rawRows];
    } catch (err) {
      const lines = importRawText.trim().split('\n');
      rawRows = lines.map((line, idx) => {
        const parts = line.split(/[,;\t]/);
        return {
          source_customer_id: `CSV-${idx + 100}`,
          nama: parts[0] || `Pelanggan CSV ${idx + 1}`,
          no_hp: parts[1] || '081200000000',
          email: parts[2] || undefined,
          alamat: parts[3] || undefined
        };
      });
    }

    let createCount = 0;
    let matchCount = 0;
    const processedSamples: any[] = [];

    const existingCusts = CustomerDomainService.getCustomers();

    rawRows.forEach(row => {
      const normalized = CustomerImporterEngine.normalizeRow(row);
      const validation = CustomerImporterEngine.validateRow(normalized);
      if (!validation.isValid) return;

      const dedupeMatch = CustomerImporterEngine.matchExistingCustomer(normalized, importAppSource, existingCusts);

      if (dedupeMatch.action === 'CREATE_NEW') {
        const created = CustomerDomainService.registerCustomer({
          nama: normalized.nama || 'Pelanggan Migrasi',
          no_hp: normalized.no_hp || row.no_hp,
          email: normalized.email,
          alamat: normalized.alamat
        });
        created.source_system = importAppSource;
        created.source_customer_id = row.source_customer_id || `MIG-${Date.now()}`;
        createCount++;
        processedSamples.push({ nama: created.nama, phone: created.no_hp_normalized, action: 'NEW (Telah Dibuat)' });
      } else {
        matchCount++;
        const targetCust = existingCusts.find(c => c.id === dedupeMatch.existingCustomerId);
        if (targetCust) {
          const updates = CustomerImporterEngine.applyUpdatePolicy(targetCust, normalized, importUpdatePolicy);
          Object.assign(targetCust, updates);
          processedSamples.push({ nama: targetCust.nama, phone: targetCust.no_hp_normalized, action: `MATCH (${dedupeMatch.action} - Updated Policy)` });
        }
      }
    });

    setImportSuccessResult({
      totalProcessed: rawRows.length,
      createNewCount: createCount,
      matchCount: matchCount,
      sampleProcessed: processedSamples
    });

    setCustomerSearchQuery('');
    setRegSuccessMessage(`✓ Owner Migration Complete! Total: ${rawRows.length} Pelanggan dari Aplikasi ${importAppSource} Berhasil Diproses (${createCount} Baru Dibuat, ${matchCount} De-duplicated/Updated).`);
  };

  const [blastTargetSegment, setBlastTargetSegment] = useState<string>('SEMUA KONSUMEN TERDAFTAR');
  const [blastMessageText, setBlastMessageText] = useState<string>('');
  const [blastImageUrl, setBlastImageUrl] = useState<string>('');
  const [blastFolder, setBlastFolder] = useState<string>('📁 /media/flyer_promo');
  const [blastSuccessMsg, setBlastSuccessMsg] = useState<string | null>(null);

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blastMessageText.trim()) return;

    // Evaluate target customers respecting GD-16 Opt-Out Guard
    const allCustomers = CustomerDomainService.getCustomers();
    const totalTarget = Math.max(1, allCustomers.length);
    const optOutExcluded = allCustomers.filter(c => c.is_opted_out).length;
    const eligibleCount = Math.max(1, totalTarget - optOutExcluded);
    const idleCount = Math.floor(eligibleCount * 0.05); // 5% idle/pending queue simulator
    const sentCount = Math.max(1, eligibleCount - idleCount);

    const nowFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // FIRST-TIME APPROVAL RULE: Approval only required for the very first time per module!
    // Hypnoselling, Sapaan, Reminder, and Broadcast auto-approve after first-time ACC is granted.
    let categoryKey = 'broadcast';
    const lowerText = blastMessageText.toLowerCase();
    if (lowerText.includes('hypno') || lowerText.includes('psikologi')) categoryKey = 'hypnoselling';
    else if (lowerText.includes('sapa') || lowerText.includes('halo')) categoryKey = 'sapaan';
    else if (lowerText.includes('reminder') || lowerText.includes('ingat')) categoryKey = 'reminder';

    const isFirstTimeApproved = firstTimeApprovedModules[categoryKey] ?? true;
    const isDirectAutoApprove = activeRole === 'KEPALA_CABANG' || activeRole === 'OWNER' || isFirstTimeApproved;
    const initStatus = isDirectAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL';
    const senderLabel = activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya (Kepala Cabang)' : activeRole === 'OWNER' ? 'Owner Executive' : (posCashierName || 'Rina Melati (Kasir)');

    const newBlast = {
      id: `BLAST-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: blastMessageText.slice(0, 30) + '...',
      target_segment: blastTargetSegment,
      message_text: blastMessageText,
      image_url: blastImageUrl || 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=300',
      folder_path: blastFolder,
      total_target: totalTarget,
      sent_count: isDirectAutoApprove ? sentCount : 0,
      idle_count: isDirectAutoApprove ? idleCount : totalTarget,
      opt_out_excluded: optOutExcluded,
      sender_name: senderLabel,
      timestamp: nowFormatted,
      status: initStatus as 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED',
      approved_by: isDirectAutoApprove ? (isFirstTimeApproved && activeRole === 'PEGAWAI' ? 'System (First-Time ACC Granted)' : senderLabel) : undefined
    };

    setBroadcastList(prev => [newBlast, ...prev]);

    if (isDirectAutoApprove) {
      setBlastSuccessMsg(`✓ Broadcast Terkirim Langsung! (Auto-Approved: Persetujuan Pertama Kali Untuk Modul ${categoryKey.toUpperCase()} Telah Terpenuhi). ${sentCount} Pesan Terkirim Sukses, ${optOutExcluded} Dikecualikan (Rule GD-16 Opt-Out). File disimpan di ${blastFolder}.`);
    } else {
      setBlastSuccessMsg(`⏳ Pengajuan Broadcast Pertama Kali Dibuat! Status: MENUNGGU ACC PERTAMA KALI KEPALA CABANG / OWNER. File disimpan di ${blastFolder}.`);
    }

    setBlastMessageText('');
    setBlastImageUrl('');
  };

  const handleApproveBroadcast = (id: string, isApproved: boolean) => {
    const approverName = activeRole === 'OWNER' ? 'Owner Executive' : 'Agus Wijaya (Kepala Cabang)';
    setBroadcastList(prev => prev.map(b => {
      if (b.id === id) {
        if (isApproved) {
          const eligible = Math.max(1, b.total_target - b.opt_out_excluded);
          const idle = Math.floor(eligible * 0.05);
          const sent = Math.max(1, eligible - idle);

          // Record First-Time Approval Granted for Hypnoselling, Sapaan, Reminder, and Broadcast
          setFirstTimeApprovedModules(prev => ({
            ...prev,
            broadcast: true,
            hypnoselling: true,
            sapaan: true,
            reminder: true
          }));

          return {
            ...b,
            status: 'APPROVED',
            approved_by: approverName,
            sent_count: sent,
            idle_count: idle
          };
        } else {
          return {
            ...b,
            status: 'REJECTED',
            approved_by: approverName
          };
        }
      }
      return b;
    }));

    setBlastSuccessMsg(isApproved
      ? `✅ Broadcast ID '${id}' BERHASIL DI-ACC PERTAMA KALI OLEH ${approverName}! Pengiriman berikutnya untuk Hypnoselling, Sapaan, Reminder & Broadcast otomatis disetujui tanpa perlu ACC ulang.`
      : `❌ Broadcast ID '${id}' DITOLAK OLEH ${approverName}.`
    );
  };

  const handleBroadcastFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setBlastImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addToCart = (item: { id: string; nama: string; unit_price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { id: item.id, nama: item.nama, qty: 1, unit_price: item.unit_price, notes: '', photo_url: '' }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean) as typeof prev);
  };

  const updateCartItemNotes = (id: string, notes: string) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, notes } : i));
  };

  const updateCartItemPhoto = (id: string, photo_url: string) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, photo_url } : i));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleManualDiscountChange = (val: number, type: 'PERCENT' | 'RUPIAH' = posDiscountType) => {
    const cleanVal = Math.max(0, val);
    setPosDiscountValue(cleanVal);
    setPosDiscountType(type);

    const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
    let effectivePercent = 0;
    if (type === 'PERCENT') {
      effectivePercent = cleanVal;
    } else {
      effectivePercent = subtotal > 0 ? (cleanVal / subtotal) * 100 : 0;
    }

    if (effectivePercent > 10) {
      setRequireManagerAuth(true);
      setPosDiscountNotice(
        type === 'PERCENT'
          ? `Diskon ${cleanVal}% melebihi plafon Kasir 10% (GD-05). Diperlukan ACC Otorisasi Manager/Owner.`
          : `Diskon Rp ${cleanVal.toLocaleString('id-ID')} (${Math.round(effectivePercent)}%) melebihi plafon Kasir 10% (GD-05). Diperlukan ACC Otorisasi Manager/Owner.`
      );
    } else {
      setRequireManagerAuth(false);
      setPosDiscountNotice(
        cleanVal > 0
          ? (type === 'PERCENT'
              ? `Diskon Kasir ${cleanVal}% (Sesuai Plafon GD-05 <= 10%)`
              : `Diskon Kasir Rp ${cleanVal.toLocaleString('id-ID')} (Sesuai Plafon GD-05 <= 10%)`)
          : null
      );
    }
  };

  const handleApplyPosPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const result = PromotionDomainService.validateAndApplyPromo(posPromoInput, subtotal);
    if (result.isValid) {
      setAppliedPosPromo({ code: posPromoInput.toUpperCase(), discountAmount: result.discountAmount, message: result.message });
    } else {
      setAppliedPosPromo({ code: posPromoInput.toUpperCase(), discountAmount: 0, message: result.message });
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (!isAuthorizedPosCashier) {
      alert('⛔ AKSES DIBATASI!\n\nPembuatan Nota Transaksi POS hanya dapat dilakukan oleh Admin / Owner atau Kasir POS Utama.\nPeran Anda saat ini tidak diizinkan membuat transaksi.');
      return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
    const manualDiscount = getManualDiscountAmount(subtotal);
    const effectivePercent = subtotal > 0 ? (manualDiscount / subtotal) * 100 : 0;

    // Enforce GD-05 Manual Discount Ceiling Rule
    if (effectivePercent > 10 && requireManagerAuth && managerPinInput !== '1234' && managerPinInput !== '8888') {
      alert('Pemberian Diskon > 10% memerlukan PIN ACC Otorisasi Manager / Owner yang valid! (Rule GD-05)');
      return;
    }

    const voucherDiscount = appliedPosPromo?.discountAmount || 0;
    const totalDiscount = voucherDiscount + manualDiscount;
    const total = Math.max(0, subtotal - totalDiscount);
    const dpPaid = Math.min(total, parseFloat(posDpInput) || 0);
    const remainingBalance = Math.max(0, total - dpPaid);
    const paymentStatus: 'LUNAS' | 'DP / PENDING PELUNASAN' = (dpPaid >= total || dpPaid === 0) ? 'LUNAS' : 'DP / PENDING PELUNASAN';

    const trxId = `TRX-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const currentCustObj = customerList.find(c => c.id === selectedPosCustomerId);
    const custName = currentCustObj ? currentCustObj.nama : 'Konsumen Umum';
    const nowFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let activeTargetBranchId = (selectedBranchId && selectedBranchId !== 'ALL_BRANCHES') ? selectedBranchId : 'BRANCH_001';
    if (loggedInEmp && (!selectedBranchId || selectedBranchId === 'ALL_BRANCHES')) {
      const empBranchObj = branchesList.find(b => b.name.toLowerCase().includes(loggedInEmp.branch.toLowerCase()) || loggedInEmp.branch.toLowerCase().includes(b.name.toLowerCase()));
      if (empBranchObj) activeTargetBranchId = empBranchObj.id;
    }
    const targetBranchObj = branchesList.find(b => b.id === activeTargetBranchId) || branchesList[1];
    const addedRevenueAmount = dpPaid > 0 ? dpPaid : total;

    setCurrPeriodRevenue((prev) => prev + addedRevenueAmount);
    setBranchesList(prev => prev.map(b => {
      if (b.id === activeTargetBranchId || b.id === 'ALL_BRANCHES') {
        return { ...b, revenue: b.revenue + addedRevenueAmount };
      }
      return b;
    }));

    const estCompletionStr = `${new Date(Date.now() + 2 * 86400000).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} 17:00`;

    setLastTransaction({
      id: trxId,
      customer_name: custName,
      cashier_name: posCashierName || 'Siti Rahma (KASIR-01)',
      subtotal,
      discount: totalDiscount,
      total,
      dp_paid: dpPaid,
      remaining_balance: remainingBalance,
      payment_status: paymentStatus,
      method: paymentMethod,
      timestamp: nowFormatted,
      completion_date: estCompletionStr,
      branch_id: activeTargetBranchId,
      branch_name: targetBranchObj.name,
      items_count: cart.reduce((sum, item) => sum + item.qty, 0),
      photo_url: posMasterPhotoUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
      items: cart.map(i => ({ id: i.id, nama: i.nama, qty: i.qty, unit_price: i.unit_price }))
    });

    // Automatically issue SPK Work Order bound 100% to created Nota POS & isolated to specific branch
    WorkQueueService.createWorkOrder({
      customer_name: `${custName} (Nota: ${trxId})`,
      service_name: cart.map(i => `${i.nama} (${i.qty}x)`).join(', '),
      worker_name: posCashierName || 'Staf Kasir',
      branch_id: activeTargetBranchId,
      branch_name: targetBranchObj.name
    });

    const itemNamesList = cart.map(i => i.nama).join(', ') || 'Barang Service';
    const industryTpl = IndustryTemplateService.getTemplate(selectedIndustry);
    const formattedMsg = IndustryTemplateService.renderMessage(industryTpl.template_reminder, {
      nama: custName,
      item: itemNamesList,
      nota_id: trxId
    });

    // System Auto-Reminder: Automatically schedules reminder after Nota POS created based on Industry Template
    RetentionDomainService.scheduleSapaan({
      customer_name: custName,
      customer_phone: currentCustObj?.no_hp || '628123456789',
      item_name: itemNamesList,
      due_days: industryTpl.default_grooming_days,
      category: 'HYPPOSELLING',
      message_text: formattedMsg
    });

    setWorkOrders(WorkQueueService.getOrders());
    setSapaanLogs(RetentionDomainService.getSapaanLogs());

    setCart([]);
    setAppliedPosPromo(null);
    setPosPromoInput('');
    setPosDiscountValue(0);
    setPosDiscountType('PERCENT');
    setManagerPinInput('');
    setRequireManagerAuth(false);
    setPosDiscountNotice(null);
    setPosDpInput('0');
    setPosMasterPhotoUrl('');
  };

  // Interactive Phase 3 Revenue & Promotion State (Domain 04 - Phase 8 Focus)
  const [prevWeekRevenue, setPrevWeekRevenue] = useState(0);
  const [currPeriodRevenue, setCurrPeriodRevenue] = useState(0);
  const [dayOfMonth, setDayOfMonth] = useState(10);
  const promoEval = PromotionEngine.evaluatePromoTrigger(prevWeekRevenue, currPeriodRevenue, dayOfMonth);

  const [promotionsList, setPromotionsList] = useState(PromotionDomainService.getPromotions());
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoName, setPromoName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'FIXED_AMOUNT' | 'PERCENTAGE'>('PERCENTAGE');
  const [promoCategory, setPromoCategory] = useState<'TIME_BASED' | 'MILESTONE' | 'MIN_SPEND'>('TIME_BASED');
  const [promoValue, setPromoValue] = useState<string>('');
  const [promoMinSpend, setPromoMinSpend] = useState<string>('');
  const [promoBannerMessage, setPromoBannerMessage] = useState<string | null>(null);

  const [testPromoCode, setTestPromoCode] = useState('GAJIAN10');
  const [testCartAmount, setTestCartAmount] = useState('150000');
  const [testPromoResult, setTestPromoResult] = useState<{ isValid: boolean; discountAmount: number; message: string } | null>(null);

  const handleCreatePromo = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(promoValue);
    const minSp = parseFloat(promoMinSpend) || 0;
    if (!promoName.trim() || !promoCode.trim() || isNaN(val) || val <= 0) return;

    const created = PromotionDomainService.createPromotion({
      name: promoName,
      code: promoCode,
      discount_type: promoType,
      discount_value: val,
      min_spend: minSp,
      category: promoCategory
    });

    setPromotionsList(PromotionDomainService.getPromotions());
    setPromoBannerMessage(`Promosi Baru '${created.name}' (${created.code}) berhasil dibuat!`);
    setPromoName('');
    setPromoCode('');
    setPromoValue('');
    setPromoMinSpend('');
    setShowPromoForm(false);
  };

  const handleTestPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(testCartAmount) || 0;
    const result = PromotionDomainService.validateAndApplyPromo(testPromoCode, amount);
    setTestPromoResult(result);
  };

  // Commercial & Saldo PILIN Wallet State V1.1
  const [saldoPilin, setSaldoPilin] = useState<number>(UsageWalletService.getBalance());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(UsageWalletService.isDemoMode());
  const [subscribedFeatures, setSubscribedFeatures] = useState<string[]>(UsageWalletService.getSubscribedFeatures());
  const [topUpInputAmount, setTopUpInputAmount] = useState<string>('100000');
  const [topUpErrorMsg, setTopUpErrorMsg] = useState<string | null>(null);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);
  const [usageLedger, setUsageLedger] = useState<UsageLedgerRecord[]>(UsageWalletService.getLedger());
  const [activeLowBalAlert, setActiveLowBalAlert] = useState<LowBalanceAlertRecord | null>(UsageWalletService.getActiveAlert());

  const handleTopUpWallet = (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpErrorMsg(null);
    setTopUpSuccessMsg(null);

    const amount = parseFloat(topUpInputAmount);
    if (isNaN(amount)) {
      setTopUpErrorMsg('Masukkan nominal top-up yang valid!');
      return;
    }

    const res = UsageWalletService.topUpWallet(amount);
    if (!res.success) {
      setTopUpErrorMsg(res.message);
    } else {
      setTopUpSuccessMsg(res.message);
      setSaldoPilin(UsageWalletService.getBalance());
      setUsageLedger(UsageWalletService.getLedger());
      setActiveLowBalAlert(UsageWalletService.getActiveAlert());
    }
  };

  const handleToggleFeature = (featureCode: string) => {
    UsageWalletService.toggleFeatureSubscription(featureCode);
    setSubscribedFeatures(UsageWalletService.getSubscribedFeatures());
  };

  const handleToggleDemoMode = (enable: boolean) => {
    UsageWalletService.setDemoMode(enable);
    setIsDemoMode(enable);
    setSaldoPilin(UsageWalletService.getBalance());
    setActiveLowBalAlert(UsageWalletService.getActiveAlert());
  };

  const monthlySubCalc = CommercialDomainService.calculateMonthlySubscription(subscribedFeatures);
  const salesCommissionSummary = SalesCommissionService.calculateCommission({
    hasActivationFee: true,
    activationFeeAmount: ACTIVATION_FEE_AMOUNT,
    monthlyFeatureSubscriptionFee: monthlySubCalc.totalMonthlyFee,
    walletDepositAmount: saldoPilin,
    whatsAppUsageAmount: usageLedger.filter(l => l.status === 'SUCCESS').reduce((sum, l) => sum + l.totalCharge, 0)
  });

  // Multi-Branch Owner Management & Duplication State
  const [branchesList, setBranchesList] = useState([
    { id: 'ALL_BRANCHES', name: '🏢 Semua Cabang (Konsolidasi Perusahaan)', location: 'Nasional (Seluruh Branch)', revenue: 0, expenses: 0, payroll: 0, manager: 'Owner Executive' },
    { id: 'BRANCH_001', name: '🏢 Cabang Utama (Jakarta)', location: 'Jl. Samanhudi No. 12, Jakarta Pusat', revenue: 0, expenses: 0, payroll: 0, manager: 'Agus Wijaya (Kepala Cabang)' },
    { id: 'BRANCH_002', name: '🏢 Cabang Bandung', location: 'Jl. Asia Afrika No. 88, Bandung', revenue: 0, expenses: 0, payroll: 0, manager: 'Rina Melati' },
    { id: 'BRANCH_003', name: '🏢 Cabang Bogor', location: 'Jl. Pajajaran No. 45, Bogor', revenue: 0, expenses: 0, payroll: 0, manager: 'Budi Santoso' },
  ]);

  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL_BRANCHES');
  const [branchBannerMsg, setBranchBannerMsg] = useState<string | null>(null);

  const rawFilteredCustomers = CustomerDomainService.searchCustomers(customerSearchQuery);
  const filteredCustomers = (activeRole !== 'OWNER' && selectedBranchId !== 'ALL_BRANCHES')
    ? rawFilteredCustomers.filter(c => !c.created_at_branch_id || c.created_at_branch_id === selectedBranchId)
    : rawFilteredCustomers;

  const handleRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustNama.trim() || !newCustPhone.trim()) return;

    const targetBranchForCust = (selectedBranchId && selectedBranchId !== 'ALL_BRANCHES') ? selectedBranchId : 'BRANCH_001';

    const registered = CustomerDomainService.registerCustomer({
      nama: newCustNama,
      no_hp: newCustPhone,
      email: newCustEmail || undefined,
      alamat: newCustAlamat || undefined,
      branch_id: targetBranchForCust
    });

    const updatedList = CustomerDomainService.getCustomers();
    setCustomerList(updatedList);
    setSelectedPosCustomerId(registered.id);
    setRegSuccessMessage(`Pelanggan '${registered.nama}' berhasil didaftarkan (Phone Normalized: ${registered.no_hp_normalized || 'N/A'}).`);
    setNewCustNama('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustAlamat('');
    setShowRegForm(false);
    setShowPosQuickReg(false);
  };

  const handleDuplicateBranch = (sourceBranchId: string) => {
    const source = branchesList.find(b => b.id === sourceBranchId) || branchesList[1];
    const nextNum = branchesList.length;
    const newBranch = {
      id: `BRANCH_00${nextNum}`,
      name: `🏢 Cabang Site ${nextNum} (${source.name.replace('🏢 ', '')} Copy)`,
      location: `Site Expansion #${nextNum}`,
      revenue: Math.round(source.revenue * 0.95),
      expenses: Math.round(source.expenses * 0.95),
      payroll: Math.round((source.payroll || 750000) * 0.95),
      manager: 'Kepala Cabang Baru'
    };

    setBranchesList(prev => [...prev, newBranch]);
    setSelectedBranchId(newBranch.id);
    setBranchBannerMsg(`✓ Cabang Baru '${newBranch.name}' Berhasil Diduplikasi & Terdaftar di System Operational!`);
  };

  // Interactive Finance P&L State (Domain 09 - Phase 8 Focus)
  const [expenseList, setExpenseList] = useState(ExpenseDomainService.getExpenses());
  const [showExpForm, setShowExpForm] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseRecord['category']>('OPERATIONAL');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expSuccessMessage, setExpSuccessMessage] = useState<string | null>(null);

  const activeBranchData = branchesList.find(b => b.id === selectedBranchId) || branchesList[0];
  const currentTotalExpenses = activeBranchData.expenses + ExpenseDomainService.getTotalExpenses();
  const activeRevenue = selectedBranchId === 'ALL_BRANCHES'
    ? branchesList.filter(b => b.id !== 'ALL_BRANCHES').reduce((sum, b) => sum + b.revenue, 0) + currPeriodRevenue
    : activeBranchData.revenue + (selectedBranchId === 'BRANCH_001' ? currPeriodRevenue : 0);

  const pnlReport = FinancialReportService.calculateProfitAndLoss(activeRevenue, currentTotalExpenses);

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(expAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    const recorded = ExpenseDomainService.recordExpense({
      category: expCategory,
      amount: numericAmount,
      notes: expNotes || undefined,
    });

    setExpenseList(ExpenseDomainService.getExpenses());
    setExpSuccessMessage(`Pengeluaran Rp ${recorded.amount.toLocaleString('id-ID')} (${recorded.category}) berhasil dicatat.`);
    setExpAmount('');
    setExpNotes('');
    setShowExpForm(false);
  };

  // Interactive Gamification & Staff Performance State (Domain 10 - Phase 8 Focus)
  const [gmfRecords, setGmfRecords] = useState(GamificationDomainService.getRecords());
  const [showGmfForm, setShowGmfForm] = useState(false);
  const [gmfStaffName, setGmfStaffName] = useState('Dewi Lestari');
  const [gmfTxCount, setGmfTxCount] = useState('10');
  const [gmfRevenue, setGmfRevenue] = useState('3000000');
  const [gmfNewCust, setGmfNewCust] = useState('3');
  const [gmfBannerMessage, setGmfBannerMessage] = useState<string | null>(null);

  const liveTierPreview = GamificationDomainService.calculateTier(
    parseInt(gmfTxCount) || 0,
    parseFloat(gmfRevenue) || 0,
    parseInt(gmfNewCust) || 0
  );

  const handleRecordGmfPerformance = (e: React.FormEvent) => {
    e.preventDefault();
    const tx = parseInt(gmfTxCount) || 0;
    const rev = parseFloat(gmfRevenue) || 0;
    const cust = parseInt(gmfNewCust) || 0;
    if (!gmfStaffName.trim()) return;

    const created = GamificationDomainService.recordPerformance({
      staff_name: gmfStaffName,
      completed_transactions_count: tx,
      revenue_amount: rev,
      new_customers_count: cust,
    });

    setGmfRecords(GamificationDomainService.getRecords());
    setGmfBannerMessage(`Evaluasi Kinerja Staf '${created.staff_name}' berhasil dicatat! Poin: ${created.points_earned} (${created.badge}).`);
    setShowGmfForm(false);
  };

  // Interactive Customer Gamification & Loyalty Engine State
  const [gamificationMode, setGamificationMode] = useState<'STAFF' | 'CUSTOMER'>('STAFF');

  const [customerGamificationList, setCustomerGamificationList] = useState([
    {
      id: 'CUST-GMF-001',
      title: '🎟️ Stamp Card Digital (5x Transaksi POS -> Free 1x Treatment)',
      rule_mechanism: 'Setiap transaksi min. Rp 50.000 mendapat 1 Stempel. Kumpulkan 5 stempel.',
      reward: 'Voucher Gratis Treatment Rp 150.000',
      points_target: 500,
      active_participants: 48,
      status: 'APPROVED'
    },
    {
      id: 'CUST-GMF-002',
      title: '👑 VIP Leveling Upgrade (Member Regular -> Gold -> Platinum VIP)',
      rule_mechanism: 'Akumulasi belanja POS mencapai Rp 2.500.000 -> Auto Upgrade Ke VIP Platinum',
      reward: 'Diskon Otomatis 15% Semua Service POS + Antrean VIP',
      points_target: 1500,
      active_participants: 24,
      status: 'APPROVED'
    },
    {
      id: 'CUST-GMF-003',
      title: '🤝 Referral Champion (Ajak 3 Teman Baru Mendaftar POS)',
      rule_mechanism: 'Bawa 3 teman baru daftar di kasir POS mencantumkan kode rujukan pelanggan',
      reward: 'Cashback Rp 100.000 / Voucher Belanja',
      points_target: 750,
      active_participants: 15,
      status: 'APPROVED'
    }
  ]);

  const [showCustGmfForm, setShowCustGmfForm] = useState(false);
  const [newCustGmfTitle, setNewCustGmfTitle] = useState('');
  const [newCustGmfMechanism, setNewCustGmfMechanism] = useState('');
  const [newCustGmfReward, setNewCustGmfReward] = useState('');
  const [newCustGmfPoints, setNewCustGmfPoints] = useState('500');

  const handleAddCustomerGamification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustGmfTitle.trim() || !newCustGmfReward.trim()) return;

    const newProg = {
      id: `CUST-GMF-00${customerGamificationList.length + 1}`,
      title: newCustGmfTitle.trim(),
      rule_mechanism: newCustGmfMechanism.trim() || 'Transaksi Nota Kasir POS otomatis mengumpulkan stempel & poin.',
      reward: newCustGmfReward.trim(),
      points_target: parseInt(newCustGmfPoints, 10) || 500,
      active_participants: 1,
      status: 'APPROVED'
    };

    setCustomerGamificationList(prev => [newProg, ...prev]);
    setGmfBannerMsg(`✓ Program Gamifikasi Pelanggan '${newProg.title}' berhasil ditambahkan dan aktif!`);
    setNewCustGmfTitle('');
    setNewCustGmfMechanism('');
    setNewCustGmfReward('');
    setNewCustGmfPoints('500');
    setShowCustGmfForm(false);
  };

  // Interactive Customer Gamification Notification Engine (Progress Milestone 25%, 50%, 75%, 100%)
  const [notifyTargetCust, setNotifyTargetCust] = useState('Budi Santoso (628123456789)');
  const [notifyProgramTitle, setNotifyProgramTitle] = useState('🎟️ Stamp Card Digital POS (Free 1x Treatment)');
  const [notifyMilestonePercent, setNotifyMilestonePercent] = useState<'25' | '50' | '75' | '100'>('50');

  // Pending Inter-Role Gamification Mandates (Kepala Cabang -> Kasir -> Customer WA)
  const [pendingGamificationMandates, setPendingGamificationMandates] = useState<{
    id: string;
    customer_name: string;
    program_title: string;
    milestone: string;
    message: string;
    requested_by: string;
    status: 'PENDING_CASHIER_SEND' | 'SENT';
    timestamp: string;
  }[]>([]);

  const [sentCustNotifications, setSentCustNotifications] = useState<{
    id: string;
    customer_name: string;
    program_title: string;
    milestone: string;
    message: string;
    sent_by: string;
    timestamp: string;
  }[]>([]);

  const generateGamificationWaText = (custName: string, progTitle: string, percent: '25' | '50' | '75' | '100') => {
    const nameOnly = custName.split(' ')[0] || custName;
    if (percent === '25') {
      return `🔥 Yuk terus tingkatkan transaksimu, Kak ${nameOnly}! Kamu sudah mencapai 25% progress untuk program ${progTitle}. Kumpulkan stempel/poin lagi ya!`;
    } else if (percent === '50') {
      return `⚡ Selamat Kak ${nameOnly}! Kamu sudah setengah jalan (50% progress) menuju reward ${progTitle}! Tinggal sisa stempel lagi di Kasir POS.`;
    } else if (percent === '75') {
      return `🚀 Hampir sampai, Kak ${nameOnly}! Progress kamu sudah 75%! Sedikit lagi kamu akan memenangkan reward ${progTitle}. Ayo transaksi lagi hari ini!`;
    } else {
      return `🎉 SELAMAT Kak ${nameOnly}! Kamu 100% SUKSES mencapai Target Gamifikasi ${progTitle}! Voucher & Reward telah AKTIF & siap kamu tukarkan di Kasir POS!`;
    }
  };

  // Kepala Cabang creates a mandate for Kasir to send WA
  const handleSendGamificationWaNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const msgText = generateGamificationWaText(notifyTargetCust, notifyProgramTitle, notifyMilestonePercent);
    const newMandate = {
      id: `MND-GMF-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: notifyTargetCust,
      program_title: notifyProgramTitle,
      milestone: `${notifyMilestonePercent}%`,
      message: msgText,
      requested_by: loggedInEmp?.nama ? `${loggedInEmp.nama} (Kepala Cabang)` : 'Agus Wijaya (Kepala Cabang)',
      status: 'PENDING_CASHIER_SEND' as const,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setPendingGamificationMandates(prev => [newMandate, ...prev]);
    setGmfBannerMsg(`✓ Mandat Notifikasi WA Progress Gamifikasi Kak '${notifyTargetCust}' berhasil dikirim ke Kasir POS! Kasir akan memverifikasi & men-submit pengiriman.`);
  };

  // Kasir executes sending the WA mandate via wa.me
  const handleCashierExecuteGamificationWa = (mandateId: string) => {
    const mandate = pendingGamificationMandates.find(m => m.id === mandateId);
    if (!mandate) return;

    const targetCustObj = customerList.find(c => c.nama === mandate.customer_name);
    const targetPhone = targetCustObj?.no_hp_normalized || targetCustObj?.no_hp || '628123456789';
    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');

    // Validate active feature subscription & deduct Saldo PILIN (Rule V1.1 #6B, #8 & #9)
    const deductRes = UsageWalletService.deductUsageFee({
      communicationType: 'CUSTOMER_RELATIONSHIP',
      featureCode: 'SMART_LOYALTY',
      quantity: 1,
      recipientRef: cleanPhone,
      customerName: mandate.customer_name
    });

    setSaldoPilin(UsageWalletService.getBalance());
    setUsageLedger(UsageWalletService.getLedger());
    setActiveLowBalAlert(UsageWalletService.getActiveAlert());

    if (!deductRes.success) {
      alert(`⚠️ PENGIRIMAN PESAN WA GAMIFIKASI DIBLOKIR!\n\n${deductRes.message}`);
      return;
    }

    setPendingGamificationMandates(prev => prev.map(m => m.id === mandateId ? { ...m, status: 'SENT' } : m));

    const newNotif = {
      id: `NOTIF-GMF-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: mandate.customer_name,
      program_title: mandate.program_title,
      milestone: mandate.milestone,
      message: mandate.message,
      sent_by: posCashierName || 'Siti Rahma (Kasir POS Utama)',
      timestamp: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setSentCustNotifications(prev => [newNotif, ...prev]);

    // Open WhatsApp Web/App via wa.me URL
    const encodedMsg = encodeURIComponent(mandate.message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    window.open(waUrl, '_blank');

    alert(`✓ NOTIFIKASI WA GAMIFIKASI BERHASIL DIKIRIM OLEH KASIR VIA WA.ME!\nPesan dikirimkan ke ${mandate.customer_name} (${mandate.milestone} Progress).\nPotongan Saldo PILIN: Rp 350. Status: TERKIRIM.`);
  };

  // Interactive Phase 4 State (Hypnoselling & Intelligence)
  const [sapaanCustomerName, setSapaanCustomerName] = useState('Budi Santoso');
  const sapaanResult = HypnosellingEngine.scheduleNextSapaan(
    'cust-100',
    sapaanCustomerName,
    'SAPAAN',
    'Halo Kak {{nama}}, semoga harimu menyenangkan! Kami rindu senyumanmu di salon kami.',
    'Salam hangat dari tim Minara Spa & Salon'
  );

  const intelligenceInsights = AnalyticsService.generateManagementInsights(
    120,
    55,
    180,
    currPeriodRevenue
  );

  // Interactive Retention & Hypnoselling State (Domain 08 - Phase 8 Focus)
  const [sapaanLogs, setSapaanLogs] = useState(RetentionDomainService.getSapaanLogs());
  const [sapaanTargetCust, setSapaanTargetCust] = useState('Budi Santoso');
  const [sapaanCategory, setSapaanCategory] = useState<'SAPAAN' | 'QUOTE' | 'HYPPOSELLING'>('SAPAAN');
  const [customSapaanBody, setCustomSapaanBody] = useState('');
  const [sapaanBannerMessage, setSapaanBannerMessage] = useState<string | null>(null);

  // Master Retention Thresholds & BOM Catalog State (Owner Executive Control)
  const [reminderThresholdDays, setReminderThresholdDays] = useState<number>(30);
  const [sapaanThresholdDays, setSapaanThresholdDays] = useState<number>(7);
  const [selectedCatalogIndustry, setSelectedCatalogIndustry] = useState<IndustryCategory>('PET_SHOP');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceHpp, setNewServiceHpp] = useState('');
  const [newServiceBom, setNewServiceBom] = useState('Shampoo Khusus Bulu 50ml, Conditioner 30ml, Microfiber Towel 1 pcs, Cotton Bud Telinga, Parfum Pet 5ml');
  const [catalogBannerMsg, setCatalogBannerMsg] = useState<string | null>(null);

  const industryBomTemplates: Record<IndustryCategory, string> = {
    PET_SHOP: 'Shampoo Khusus Bulu 50ml, Conditioner 30ml, Microfiber Towel 1 pcs, Cotton Bud Telinga, Parfum Pet 5ml',
    AUTO_CARE: 'Shampoo Snow Car Wash 200ml, Microfiber Towel 2 pcs, Tire Dressing Polish 50ml, Engine Degreaser 100ml',
    SHOE_LEATHER: 'Special Shoe Cleaner 30ml, Premium Nylon Brush 1 pcs, Unyellowing Solution 20ml, Waterproof Spray',
    SPA_SALON: 'Massage Essential Oil 50ml, Facial Cleansing Foam 25ml, Aromatherapy Scrub 30gr, Disposable Towel 1 pcs',
    LAUNDRY_CLOTHES: 'Deterjen Matik Liquid 100ml, Pelembut Pakaian Parfume 50ml, Plastik Packing 1 pcs, Anti-Noda Spray',
    TOKO_KUE: 'Tepung Terigu Premium 250gr, Mentega Wijsman 100gr, Telur Ayam 3 butir, Gula Halus 150gr, Kemasan Box Premium',
    FITNESS_GYM: 'Handuk Gym Steril 1 pcs, Air Mineral 600ml, Whey Protein Shake 1 scoop, Sanitizer Equipment 20ml'
  };

  const handleCatalogIndustryChange = (cat: IndustryCategory) => {
    setSelectedCatalogIndustry(cat);
    const defaultBom = industryBomTemplates[cat] || industryBomTemplates.PET_SHOP;
    setNewServiceBom(defaultBom);
  };

  const handleAddMasterCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newServicePrice);
    const hppNum = parseFloat(newServiceHpp) || priceNum * 0.4;
    if (!newServiceName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const added = ServiceCatalogService.addMasterService({
      nama: newServiceName,
      base_harga: priceNum,
      hpp: hppNum,
      bahan_baku: newServiceBom || industryBomTemplates[selectedCatalogIndustry]
    });

    const updatedList = ServiceCatalogService.getMasterCatalog();
    setMasterCatalogList(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_master_catalog', JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }
    setCatalogBannerMsg(`✓ Master Layanan '${added.nama}' (Jenis Usaha: ${selectedCatalogIndustry}) & Bahan Baku (BOM) Berhasil Didaftarkan! Harga: Rp ${added.base_harga.toLocaleString('id-ID')}.`);
    setNewServiceName('');
    setNewServicePrice('');
    setNewServiceHpp('');
    setNewServiceBom(industryBomTemplates[selectedCatalogIndustry]);
  };

  // Pre-seeded Default Demo Data for Seamless Presentation
  const DEFAULT_DEMO_ACTIVATION = {
    id: 'ACT-2026-001',
    ownerName: 'Hendra Wijaya',
    businessName: 'PILIN Clean & Care',
    industry: 'Grooming & Care',
    email: 'owner@pilin.id',
    phone: '081234567890',
    packagePlan: 'Paket Enterprise Multi-Branch',
    activationDate: new Date().toISOString().split('T')[0],
    envMode: 'LIVE' as const
  };

  const DEFAULT_EMPLOYEE_LIST = [
    {
      id: 'EMP-001',
      nama: 'Rina Melati',
      no_hp: '081298765432',
      email: 'rina@pilin.id',
      role: 'Kasir Utama',
      branch: 'Cabang Utama - Jakarta Pusat',
      password_pin: '1234'
    },
    {
      id: 'EMP-002',
      nama: 'Budi Santoso',
      no_hp: '081387654321',
      email: 'budi@pilin.id',
      role: 'Kepala Cabang',
      branch: 'Cabang Utama - Jakarta Pusat',
      password_pin: '8888'
    },
    {
      id: 'EMP-003',
      nama: 'Ahmad Dani',
      no_hp: '081476543210',
      email: 'ahmad@pilin.id',
      role: 'Produksi',
      branch: 'Cabang Utama - Jakarta Pusat',
      password_pin: '5555'
    }
  ];

  // Master Data Pegawai State (Owner Executive Setup - Persisted)
  const [employeeMasterList, setEmployeeMasterList] = useState<{
    id: string;
    nama: string;
    no_hp: string;
    email: string;
    role: string;
    branch: string;
    password_pin: string;
  }[]>(DEFAULT_EMPLOYEE_LIST);

  // Mount useEffect to restore persisted data from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedAct = localStorage.getItem('pilin_client_activation');
        if (savedAct) {
          setClientActivationData(JSON.parse(savedAct));
        }

        const savedOwnerEmail = localStorage.getItem('pilin_owner_email');
        if (savedOwnerEmail) {
          setOwnerEmail(savedOwnerEmail);
        }

        const savedOwnerPass = localStorage.getItem('pilin_owner_password');
        if (savedOwnerPass) {
          setOwnerPassword(savedOwnerPass);
        }

        const savedEmpList = localStorage.getItem('pilin_employee_master_list');
        if (savedEmpList) {
          const parsed = JSON.parse(savedEmpList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEmployeeMasterList(parsed);
          }
        }

        const savedCatalog = localStorage.getItem('pilin_master_catalog');
        if (savedCatalog) {
          const parsed = JSON.parse(savedCatalog);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMasterCatalogList(parsed);
            ServiceCatalogService.setMasterCatalog(parsed);
          }
        }
      } catch (err) {
        console.error('LocalStorage restore error:', err);
      }
    }
  }, []);

  const [newEmpNama, setNewEmpNama] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Kasir Utama');
  const [newEmpCustomRole, setNewEmpCustomRole] = useState('');
  const [newEmpBranch, setNewEmpBranch] = useState('Cabang Utama - Jakarta Pusat');
  const [newEmpPin, setNewEmpPin] = useState('');
  const [empBannerMsg, setEmpBannerMsg] = useState<string | null>(null);

  // Self-Service PIN Change State for Staff
  const [selfServicePin, setSelfServicePin] = useState('');
  const [showPinChangeModal, setShowPinChangeModal] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);

  const handleUpdateSelfPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selfServicePin.trim()) return;
    const cleanPin = selfServicePin.trim().slice(0, 4);
    setPinSuccessMsg(`✓ PIN / Password Log-in berhasil diperbarui mandiri menjadi '${cleanPin}'!`);
    setShowPinChangeModal(false);
  };

  const handleAddMasterEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpNama.trim() || !newEmpPhone.trim()) return;

    // Resolve custom role if "LAINNYA" is selected
    const finalRole = (newEmpRole === 'LAINNYA' || newEmpRole.includes('Lainnya'))
      ? (newEmpCustomRole.trim() || 'Staf Operasional')
      : newEmpRole;

    // Use typed PIN or fallback automatically to '1234' if left blank by Owner
    const pin = newEmpPin.trim() ? newEmpPin.trim().slice(0, 4) : '1234';
    const newEmp = {
      id: `EMP-${String(employeeMasterList.length + 1).padStart(3, '0')}`,
      nama: newEmpNama.trim(),
      no_hp: newEmpPhone.trim(),
      email: newEmpEmail.trim() || `${newEmpNama.toLowerCase().replace(/\s+/g, '')}@pilin.id`,
      role: finalRole,
      branch: newEmpBranch || 'Cabang Utama - Jakarta Pusat',
      password_pin: pin
    };

    const updatedList = [...employeeMasterList, newEmp];
    setEmployeeMasterList(updatedList);

    // Save to LocalStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_employee_master_list', JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }

    setStaffPayrollList(prev => [...prev, {
      id: newEmp.id,
      nama: newEmp.nama,
      role: newEmp.role,
      spkCount: 0,
      baseSalary: 3000000,
      incentiveRate: 15000
    }]);

    if (newEmp.role.includes('Kasir') || !posCashierName) {
      setPosCashierName(`${newEmp.nama} (${newEmp.role})`);
    }

    setEmpBannerMsg(`✓ Pegawai '${newEmp.nama}' (${newEmp.role} - ${newEmp.branch}) berhasil disimpan! Password/PIN log-in: '${pin}'.`);
    setNewEmpNama('');
    setNewEmpPhone('');
    setNewEmpEmail('');
    setNewEmpRole('Kasir Utama');
    setNewEmpCustomRole('');
    setNewEmpBranch('Cabang Utama - Jakarta Pusat');
    setNewEmpPin('');
  };

  const handleOwnerUpdateEmployeePin = (empId: string, newPin: string) => {
    const cleanPin = newPin.trim().slice(0, 4);
    const updatedList = employeeMasterList.map(e => e.id === empId ? { ...e, password_pin: cleanPin } : e);
    setEmployeeMasterList(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_employee_master_list', JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }
    setEmpBannerMsg(`✓ PIN / Password Log-in Pegawai #${empId} berhasil diubah oleh Owner menjadi '${cleanPin}'!`);
  };

  const handleDeleteMasterEmployee = (empId: string) => {
    const matched = employeeMasterList.find(e => e.id === empId);
    const empName = matched ? matched.nama : empId;
    const updatedList = employeeMasterList.filter(e => e.id !== empId);
    setEmployeeMasterList(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_employee_master_list', JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }
    setEmpBannerMsg(`✓ Data Pegawai '${empName}' (#${empId}) berhasil dihapus dari Master Database!`);
  };

  const handleDeleteMasterCatalogItem = (itemId: string) => {
    const matched = masterCatalogList.find(c => c.id === itemId);
    const catName = matched ? matched.nama : itemId;
    ServiceCatalogService.deleteMasterService(itemId);
    const updatedList = ServiceCatalogService.getMasterCatalog();
    setMasterCatalogList(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pilin_master_catalog', JSON.stringify(updatedList));
      } catch (err) {
        console.error('LocalStorage save error:', err);
      }
    }
    setCatalogBannerMsg(`✓ Layanan '${catName}' (#${itemId}) berhasil dihapus dari Katalis Layanan Master!`);
  };

  // Bulk Checkbox Selection States & Handlers for Hybrid Delete Action
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);

  const handleToggleSelectAllEmp = (checked: boolean) => {
    if (checked) {
      setSelectedEmpIds(employeeMasterList.map(e => e.id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleToggleSelectEmp = (empId: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const handleBulkDeleteEmployees = () => {
    if (selectedEmpIds.length === 0) return;
    if (confirm(`Yakin ingin menghapus ${selectedEmpIds.length} pegawai terpilih dari Master Database?`)) {
      const updatedList = employeeMasterList.filter(e => !selectedEmpIds.includes(e.id));
      setEmployeeMasterList(updatedList);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pilin_employee_master_list', JSON.stringify(updatedList));
        } catch (err) {
          console.error('LocalStorage save error:', err);
        }
      }
      setEmpBannerMsg(`✓ ${selectedEmpIds.length} Data Pegawai terpilih berhasil dihapus massal dari Master Database!`);
      setSelectedEmpIds([]);
    }
  };

  const handleToggleSelectAllCatalog = (checked: boolean) => {
    if (checked) {
      setSelectedCatalogIds(masterCatalogList.map(c => c.id));
    } else {
      setSelectedCatalogIds([]);
    }
  };

  const handleToggleSelectCatalog = (itemId: string) => {
    setSelectedCatalogIds(prev => 
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  };

  const handleBulkDeleteCatalogItems = () => {
    if (selectedCatalogIds.length === 0) return;
    if (confirm(`Yakin ingin menghapus ${selectedCatalogIds.length} layanan master terpilih dari Katalis?`)) {
      selectedCatalogIds.forEach(id => {
        ServiceCatalogService.deleteMasterService(id);
      });
      const updatedList = ServiceCatalogService.getMasterCatalog();
      setMasterCatalogList(updatedList);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('pilin_master_catalog', JSON.stringify(updatedList));
        } catch (err) {
          console.error('LocalStorage save error:', err);
        }
      }
      setCatalogBannerMsg(`✓ ${selectedCatalogIds.length} Layanan Master terpilih berhasil dihapus massal!`);
      setSelectedCatalogIds([]);
    }
  };

  const handleResetDemoMasterData = () => {
    if (typeof window !== 'undefined') {
      try {
        ServiceCatalogService.resetDefaultCatalogForTest();
        const defaultCatalog = ServiceCatalogService.getMasterCatalog();
        localStorage.setItem('pilin_client_activation', JSON.stringify(DEFAULT_DEMO_ACTIVATION));
        localStorage.setItem('pilin_owner_email', 'owner@pilin.id');
        localStorage.setItem('pilin_owner_password', '1234');
        localStorage.setItem('pilin_employee_master_list', JSON.stringify(DEFAULT_EMPLOYEE_LIST));
        localStorage.setItem('pilin_master_catalog', JSON.stringify(defaultCatalog));
        setClientActivationData(DEFAULT_DEMO_ACTIVATION);
        setOwnerEmail('owner@pilin.id');
        setOwnerPassword('1234');
        setEmployeeMasterList(DEFAULT_EMPLOYEE_LIST);
        setMasterCatalogList(defaultCatalog);
        setSelectedEmpIds([]);
        setSelectedCatalogIds([]);
        setEmpBannerMsg('✓ Data Demo Master Aktivasi, Database Pegawai & Layanan Master berhasil di-restore ke data bawaan!');
      } catch (err) {
        console.error('Reset demo data error:', err);
      }
    }
  };

  // Owner Staff Payroll & SOP Labor Cost Setup State
  const [staffPayrollList, setStaffPayrollList] = useState<{
    id: string;
    nama: string;
    role: string;
    spkCount: number;
    baseSalary: number;
    incentiveRate: number;
  }[]>([]);

  const handleUpdateStaffIncentive = (id: string, newIncentive: number) => {
    setStaffPayrollList(prev => prev.map(item => item.id === id ? { ...item, incentiveRate: newIncentive } : item));
  };

  const handleUpdateStaffBaseSalary = (id: string, newSalary: number) => {
    setStaffPayrollList(prev => prev.map(item => item.id === id ? { ...item, baseSalary: newSalary } : item));
  };

  // Owner Executive Chart View Mode State (Monthly vs Daily Omzet View Mode)
  const [chartViewMode, setChartViewMode] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');

  // Gamifikasi & Kinerja Proposals State (Proposal Input by Kepala Cabang -> ACC Approval by Owner)
  const [gamificationProposals, setGamificationProposals] = useState<{
    id: string;
    game_title: string;
    target_points: number;
    reward_description: string;
    proposed_by: string;
    status: string;
    created_at: string;
  }[]>([]);

  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGamePoints, setNewGamePoints] = useState('');
  const [newGameReward, setNewGameReward] = useState('');
  const [gmfBannerMsg, setGmfBannerMsg] = useState<string | null>(null);

  const handleAddGamificationProposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameTitle || !newGamePoints || !newGameReward) return;

    const newProp = {
      id: `GMF-00${gamificationProposals.length + 1}`,
      game_title: newGameTitle,
      target_points: parseInt(newGamePoints, 10) || 100,
      reward_description: newGameReward,
      proposed_by: activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya (Kepala Cabang)' : 'Owner Eksekutif',
      status: activeRole === 'OWNER' ? 'APPROVED' : 'PENDING_APPROVAL',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    setGamificationProposals(prev => [newProp, ...prev]);
    setNewGameTitle('');
    setNewGamePoints('');
    setNewGameReward('');
    setGmfBannerMsg(
      activeRole === 'OWNER'
        ? `✓ Game & Reward '${newProp.game_title}' Berhasil Dibuat dan Disetujui (Approved)!`
        : `⏳ Proposal Game & Reward '${newProp.game_title}' Berhasil Diajukan! Menunggu Persetujuan (Approval) Owner.`
    );
  };

  const handleApproveGamificationProposal = (id: string) => {
    setGamificationProposals(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p));
    setGmfBannerMsg(`✓ Proposal Game & Reward #${id} Berhasil Disetujui (Approved) oleh Owner! Reward Aktif Untuk Pegawai.`);
  };

  // Governance Approval & Authorization Control State (Domain 11 - Executive Authority)
  const [pendingApprovals, setPendingApprovals] = useState<{
    id: string;
    rule_code: string;
    applicant_name: string;
    title: string;
    description: string;
    amount: number;
    timestamp: string;
    status: string;
    type?: 'DISCOUNT' | 'VOID_TRANSACTION';
    trx_id?: string;
  }[]>([
    {
      id: 'REQ-VOID-108',
      rule_code: 'GD-06: VOID / HAPUS NOTA POS',
      applicant_name: 'Siti Rahma (Kasir Utama)',
      title: 'Permohonan Hapus / Void Nota POS #TRX-2026-904',
      description: 'Kasir salah menginput item kuantitas di POS dan konsumen meminta pembatalan nota.',
      amount: 150000,
      timestamp: 'Hari Ini 11:15',
      status: 'PENDING',
      type: 'VOID_TRANSACTION',
      trx_id: 'TRX-2026-904'
    }
  ]);

  const [voidedTransactionsCount, setVoidedTransactionsCount] = useState<number>(0);
  const [voidedTransactionsTotalAmount, setVoidedTransactionsTotalAmount] = useState<number>(0);
  const [govAuditBanner, setGovAuditBanner] = useState<string | null>(null);

  const handleApproveGovRequest = (reqId: string, action: 'APPROVED' | 'REJECTED') => {
    setPendingApprovals(prev => prev.map(item => item.id === reqId ? { ...item, status: action } : item));
    const reqItem = pendingApprovals.find(r => r.id === reqId);

    if (action === 'APPROVED' && reqItem) {
      if (reqItem.type === 'VOID_TRANSACTION' || reqItem.rule_code.includes('GD-06')) {
        setCurrPeriodRevenue(prev => Math.max(0, prev - reqItem.amount));
        setVoidedTransactionsCount(prev => prev + 1);
        setVoidedTransactionsTotalAmount(prev => prev + reqItem.amount);
        setGovAuditBanner(`✓ PERSETUJUAN HAPUS NOTA BERHASIL! Nota POS '${reqItem.title}' (Rp ${reqItem.amount.toLocaleString('id-ID')}) telah DI-ACC & DIHAPUS oleh Kepala Cabang / Owner.`);
        return;
      }
    }

    setGovAuditBanner(`Permohonan Otorisasi '${reqItem?.title}' berhasil di-${action === 'APPROVED' ? 'SETUJUI (APPROVED)' : 'TOLAK (REJECTED)'} oleh Kepala Cabang / Owner.`);
  };

  const handleRequestVoidTransaction = (trxId: string, amount: number, custName: string) => {
    const reason = prompt(`Masukkan alasan permohonan pembatalan / hapus Nota POS #${trxId}:`, 'Salah input item kuantitas di kasir');
    if (!reason) return;

    const newReq = {
      id: `REQ-VOID-${Math.floor(100 + Math.random() * 900)}`,
      rule_code: 'GD-06: VOID / HAPUS NOTA POS',
      applicant_name: `${posCashierName || 'Siti Rahma'} (${loggedInEmp?.role || 'Kasir POS'})`,
      title: `Permohonan Hapus / Void Nota POS #${trxId}`,
      description: `Alasan Kasir: "${reason}". Pembatalan nota senilai Rp ${amount.toLocaleString('id-ID')} untuk ${custName}.`,
      amount: amount,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDING',
      type: 'VOID_TRANSACTION' as const,
      trx_id: trxId
    };

    setPendingApprovals(prev => [newReq, ...prev]);
    alert(`✓ Permohonan Hapus / Void Nota POS #${trxId} (Rp ${amount.toLocaleString('id-ID')}) berhasil dikirim ke Kepala Cabang & Owner untuk di-ACC!`);
  };

  const handleSendNotaViaWhatsApp = () => {
    if (!lastTransaction) return;

    const targetCustomer = customerList.find(c => c.nama.toLowerCase().trim() === lastTransaction.customer_name.toLowerCase().trim());
    const currentCustObj = customerList.find(c => c.id === selectedPosCustomerId);
    const rawPhone = targetCustomer?.no_hp || currentCustObj?.no_hp || '08123456789';
    const cleanPhone = normalizePhoneNumber(rawPhone) || '628123456789';

    const bizName = clientActivationData?.businessName || 'PILIN Clean & Care';
    const bizPhone = clientActivationData?.phone || '081234567890';
    const bizAddr = tenantAddress || 'Jl. Raya Utama No. 88, Jakarta';
    const branchName = lastTransaction.branch_name || 'Cabang Utama (BRANCH_001)';
    const estCompletion = lastTransaction.completion_date || 'Est. 2 Hari Pengerjaan';

    const textLines = [
      `🧾 *NOTA TRANSAKSI RESMI ${bizName.toUpperCase()}*`,
      `📍 ${bizAddr}`,
      `📞 Telp/WA: ${bizPhone}`,
      `==============================`,
      `*ID Nota*       : ${lastTransaction.id}`,
      `*ID Cabang*     : ${branchName}`,
      `*Tanggal Nota*  : ${lastTransaction.timestamp}`,
      `*Estimasi Selesai*: ${estCompletion}`,
      `*Kasir*         : ${lastTransaction.cashier_name}`,
      `*Pelanggan*     : Kak ${lastTransaction.customer_name}`,
      `*Metode Bayar*  : ${lastTransaction.method.toUpperCase()}`,
      `*Status Nota*   : ${lastTransaction.payment_status}`,
      ``,
      `🛍️ *DAFTAR LAYANAN & RETAIL:*`,
      ...(lastTransaction.items || []).map((item, idx) => `  ${idx + 1}. ${item.nama} (${item.qty}x @ Rp ${item.unit_price.toLocaleString('id-ID')}) = Rp ${(item.qty * item.unit_price).toLocaleString('id-ID')}`),
      ``,
      `📦 *Rincian Tagihan:*`,
      `• Subtotal      : Rp ${lastTransaction.subtotal.toLocaleString('id-ID')}`,
      lastTransaction.discount > 0 ? `• Diskon        : -Rp ${lastTransaction.discount.toLocaleString('id-ID')}` : '',
      `• *TOTAL BIAYA* : Rp ${lastTransaction.total.toLocaleString('id-ID')}`,
      lastTransaction.dp_paid > 0 ? `• DP Dibayar    : Rp ${lastTransaction.dp_paid.toLocaleString('id-ID')}` : '',
      lastTransaction.remaining_balance > 0 ? `• Sisa Bayar    : Rp ${lastTransaction.remaining_balance.toLocaleString('id-ID')}` : '',
      `==============================`,
      `📜 *Syarat & Ketentuan:*`,
      `${tenantTerms}`,
      `==============================`,
      `Terima kasih telah mempercayakan pengerjaan Anda kepada ${bizName}. ✨`
    ].filter(Boolean);

    // Record Transactional WA Usage (Rule V1.1 #6A & #12)
    const deductRes = UsageWalletService.deductUsageFee({
      communicationType: 'TRANSACTIONAL',
      featureCode: 'POS',
      quantity: 1,
      recipientRef: cleanPhone,
      customerName: lastTransaction.customer_name
    });

    setSaldoPilin(UsageWalletService.getBalance());
    setUsageLedger(UsageWalletService.getLedger());
    setActiveLowBalAlert(UsageWalletService.getActiveAlert());

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textLines.join('\n'))}`;
    window.open(waUrl, '_blank');
  };

  const handlePrintNota58mm = () => {
    if (!lastTransaction) return;

    const printWindow = window.open('', '_blank', 'width=420,height=650');
    if (!printWindow) {
      alert('Mohon izinkan pop-up browser untuk mencetak nota thermal 58mm.');
      return;
    }

    const bizName = clientActivationData?.businessName || 'PILIN Clean & Care';
    const bizPhone = clientActivationData?.phone || '081234567890';
    const bizAddr = tenantAddress || 'Jl. Raya Utama No. 88, Jakarta';
    const branchName = lastTransaction.branch_name || 'Cabang Utama (BRANCH_001)';
    const estCompletion = lastTransaction.completion_date || 'Est. 2 Hari Pengerjaan';

    const formattedTerms = tenantTerms.split('\n').map(line => `<div class="mb-1">${line}</div>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Nota POS 58mm - ${lastTransaction.id}</title>
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 58mm;
            max-width: 58mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            font-size: 10px;
            color: #000;
            background: #fff;
            line-height: 1.4;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .mb-1 { margin-bottom: 3px; }
          .mt-2 { margin-top: 6px; }
          .logo { font-size: 13px; font-weight: bold; }
          .terms { font-size: 8px; line-height: 1.3; }
        </style>
      </head>
      <body>
        <div class="text-center bold logo">${bizName.toUpperCase()}</div>
        <div class="text-center" style="font-size: 8px;">${bizAddr}</div>
        <div class="text-center" style="font-size: 8px;">Telp/WA: ${bizPhone}</div>
        <div class="text-center" style="font-size: 8px;">================================</div>
        
        <div class="row"><span>ID Nota:</span><span class="bold">${lastTransaction.id}</span></div>
        <div class="row"><span>Cabang:</span><span class="bold">${branchName}</span></div>
        <div class="row"><span>Tgl Nota:</span><span>${lastTransaction.timestamp.split(',')[0] || lastTransaction.timestamp}</span></div>
        <div class="row"><span>Tgl Selesai:</span><span class="bold">${estCompletion}</span></div>
        <div class="row"><span>Kasir:</span><span>${lastTransaction.cashier_name}</span></div>
        <div class="row"><span>Pelanggan:</span><span class="bold">${lastTransaction.customer_name}</span></div>
        <div class="row"><span>Metode:</span><span>${lastTransaction.method.toUpperCase()}</span></div>
        
        <div class="divider"></div>
        <div class="bold mb-1">RINCIAN LAYANAN & RETAIL:</div>
        ${(lastTransaction.items || []).map(item => `
          <div class="row mb-1">
            <span>${item.nama} (${item.qty}x)</span>
            <span class="bold">Rp ${(item.qty * item.unit_price).toLocaleString('id-ID')}</span>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        <div class="bold mb-1">RINGKASAN TAGIHAN:</div>
        <div class="row mb-1"><span>Subtotal</span><span>Rp ${lastTransaction.subtotal.toLocaleString('id-ID')}</span></div>
        ${lastTransaction.discount > 0 ? `<div class="row mb-1"><span>Diskon</span><span>-Rp ${lastTransaction.discount.toLocaleString('id-ID')}</span></div>` : ''}
        
        <div class="double-divider"></div>
        <div class="row bold" style="font-size: 11px;"><span>TOTAL BIAYA:</span><span>Rp ${lastTransaction.total.toLocaleString('id-ID')}</span></div>
        ${lastTransaction.dp_paid > 0 ? `<div class="row"><span>DP Dibayar:</span><span>Rp ${lastTransaction.dp_paid.toLocaleString('id-ID')}</span></div>` : ''}
        ${lastTransaction.remaining_balance > 0 ? `<div class="row bold"><span>SISA BAYAR:</span><span>Rp ${lastTransaction.remaining_balance.toLocaleString('id-ID')}</span></div>` : ''}
        <div class="row"><span>STATUS:</span><span class="bold">${lastTransaction.payment_status}</span></div>
        
        <div class="divider"></div>
        <div class="bold mb-1" style="font-size: 9px;">SYARAT & KETENTUAN:</div>
        <div class="terms">${formattedTerms}</div>

        <div class="divider"></div>
        <div class="text-center mt-2" style="font-size: 8px;">
          Terima kasih atas kunjungan Anda!<br/>
          Simpan nota ini sebagai bukti pengerjaan resmi.
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const currentSapaanPreview = RetentionDomainService.generatePreview(
    sapaanTargetCust,
    sapaanCategory,
    customSapaanBody || undefined
  );

  const handleScheduleSapaan = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustObj = customerList.find(c => c.nama === sapaanTargetCust);
    const scheduled = RetentionDomainService.scheduleSapaan({
      customer_name: sapaanTargetCust,
      customer_phone: targetCustObj?.no_hp_normalized || targetCustObj?.no_hp || '628123456789',
      category: sapaanCategory,
      message_text: currentSapaanPreview.fullMessageBody,
    });

    setSapaanLogs(RetentionDomainService.getSapaanLogs());
    setSapaanBannerMessage(`Pesan sapaan (${scheduled.category}) untuk ${scheduled.customer_name} berhasil dijadwalkan!`);
  };
  const [workOrders, setWorkOrders] = useState(WorkQueueService.getOrders());
  const [showSpkForm, setShowSpkForm] = useState(false);
  const [spkCustomer, setSpkCustomer] = useState('Budi Santoso');
  const [spkService, setSpkService] = useState('Standard Service 01');
  const [spkWorker, setSpkWorker] = useState('');
  const [workBannerMessage, setWorkBannerMessage] = useState<string | null>(null);

  const handleCreateSpk = (e: React.FormEvent) => {
    e.preventDefault();
    const created = WorkQueueService.createWorkOrder({
      customer_name: spkCustomer,
      service_name: spkService,
      worker_name: spkWorker,
    });
    setWorkOrders(WorkQueueService.getOrders());
    setWorkBannerMessage(`SPK Baru '${created.order_number}' berhasil diterbitkan untuk ${created.customer_name}.`);
    setSpkWorker('');
    setShowSpkForm(false);
  };

  const handleUpdateOrderStatus = (id: string, targetStatus: ServiceOrderStatus) => {
    const result = WorkQueueService.updateOrderStatus(id, targetStatus);
    setWorkOrders(WorkQueueService.getOrders());
    setWorkBannerMessage(result.message);
  };

  const handleUpdateOrderQC = (id: string, qc: QCStatus) => {
    const result = WorkQueueService.updateOrderQC(id, qc);
    setWorkOrders(WorkQueueService.getOrders());
    setWorkBannerMessage(result.message);
  };

  const totalCart = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        {/* BACKGROUND GLOW ACCENTS */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
        {/* LOGO & BRAND CARD */}
        <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 backdrop-blur-xl relative z-10 animate-fadeIn">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
              <img src="/logo.png" alt="PILIN Logo" className="w-20 h-20 object-contain rounded-xl shadow" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-wider">PILIN</h1>
            <p className="text-xs text-orange-400 font-mono font-semibold">Sistem Operasional & Manajemen Cabang Terintegrasi</p>
          </div>

          {loginErrorMsg && (
            <div className="bg-rose-950/80 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 font-bold text-center animate-fadeIn">
              ⚠️ {loginErrorMsg}
            </div>
          )}

          {/* FORM LOG-IN PENGGUNA TERDAFTAR (DATA DIDAPATKAN DARI SALES ONBOARDING) */}
          <form onSubmit={handleExecuteLogin} className="space-y-4 text-xs">
              {/* ROLE SELECTOR TABS */}
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Pilih Akses Role Log-in *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRoleSelect('PEGAWAI');
                      setLoginUsername('');
                      setLoginPassword('');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      loginRoleSelect === 'PEGAWAI'
                        ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    👤 Pegawai
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRoleSelect('KEPALA_CABANG');
                      setLoginUsername('');
                      setLoginPassword('');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      loginRoleSelect === 'KEPALA_CABANG'
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    🏢 Kepala Cabang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRoleSelect('OWNER');
                      setLoginUsername('');
                      setLoginPassword('');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                      loginRoleSelect === 'OWNER'
                        ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    👑 Owner
                  </button>
                </div>
              </div>

              {/* USERNAME / EMPLOYEE SELECTION INPUT */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  {loginRoleSelect === 'OWNER' ? 'Alamat Email Owner (Manual Input) *' : 'Nama Pegawai Terdaftar (Dari Master Data Owner) *'}
                </label>

                {loginRoleSelect === 'OWNER' ? (
                  <div className="space-y-1.5">
                    <input
                      type="email"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Masukkan Alamat Email Owner..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                    />
                    {!ownerEmail && (
                      <span className="text-[10px] text-amber-400 font-mono block">
                        ⚠️ Email Owner belum terdaftar. Gunakan email yang telah didaftarkan oleh Tim Sales saat Onboarding.
                      </span>
                    )}
                  </div>
                ) : employeeMasterList.length === 0 ? (
                  <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2 text-[11px] text-amber-300 font-medium">
                    <p>⚠️ Belum ada pegawai terdaftar di Master Data. Silakan Owner log-in terlebih dahulu untuk mendaftarkan akun &amp; password pegawai baru!</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginRoleSelect('OWNER');
                        setLoginUsername('');
                        setLoginPassword('');
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition-all"
                    >
                      👑 Log-in Sebagai Owner (Untuk Daftarkan Pegawai)
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={loginUsername}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      setLoginUsername(selectedName);
                      const matched = employeeMasterList.find(emp => emp.nama === selectedName);
                      if (matched) {
                        setLoginPassword(matched.password_pin || '1234');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-400 text-xs"
                  >
                    <option value="">-- Pilih Nama Pegawai Terdaftar --</option>
                    {employeeMasterList.map((emp) => (
                      <option key={emp.id} value={emp.nama}>
                        👤 {emp.nama} ({emp.role}) — 🔑 Password: {emp.password_pin || '1234'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* PASSWORD INPUT */}
              {(loginRoleSelect === 'OWNER' || employeeMasterList.length > 0) && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    {loginRoleSelect === 'OWNER' ? 'Password Owner *' : 'Password / PIN Log-in (Diberikan oleh Owner) *'}
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={12}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={loginRoleSelect === 'OWNER' ? 'Masukkan Password Owner' : 'Masukkan Password / PIN dari Owner'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-mono font-bold text-sm tracking-widest text-center focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* QUICK SELECTOR CARDS FOR REGISTERED EMPLOYEES */}
              {employeeMasterList.length > 0 && loginRoleSelect !== 'OWNER' && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-amber-400 font-mono block">
                    📋 Klik Akun Pegawai Untuk Auto-Fill Password & Log-In:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {employeeMasterList.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => {
                          setLoginRoleSelect(emp.role.includes('Kepala') ? 'KEPALA_CABANG' : 'PEGAWAI');
                          setLoginUsername(emp.nama);
                          setLoginPassword(emp.password_pin || '1234'); // Auto-fills employee password!
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center space-x-1 ${
                          loginUsername === emp.nama
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                        }`}
                      >
                        <span>👤 {emp.nama} ({emp.role}) • 🔑 Pass: {emp.password_pin || '1234'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loginRoleSelect !== 'OWNER' && employeeMasterList.length === 0}
                className="w-full py-3 bg-gradient-to-r from-amber-600 via-emerald-600 to-blue-600 hover:opacity-90 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 mt-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>MASUK SISTEM (LOG IN)</span>
              </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* HEADER NAVBAR WITH ROLE ACCESS SWITCHER */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="PILIN Logo"
            className="w-10 h-10 object-contain rounded-lg shadow-lg shadow-orange-500/20 bg-slate-900 border border-slate-800 p-0.5"
          />
          <div>
            <h1 className="text-xl font-black text-white tracking-wider">PILIN</h1>
          </div>
        </div>

        {/* 3 ROLE ACCESS SWITCHER & SIGN OUT BUTTON */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            <span className="text-[11px] font-bold text-slate-400 px-2 uppercase tracking-wider">Akses Role:</span>
            
            <button
              onClick={() => {
                setActiveRole('PEGAWAI');
                setActiveTab('pos');
                if (loggedInEmp) {
                  const targetBranchId = branchesList.find(b => b.name.toLowerCase().includes(loggedInEmp.branch.toLowerCase()) || loggedInEmp.branch.toLowerCase().includes(b.name.toLowerCase()))?.id || 'BRANCH_001';
                  setSelectedBranchId(targetBranchId);
                } else if (selectedBranchId === 'ALL_BRANCHES') {
                  setSelectedBranchId('BRANCH_001');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeRole === 'PEGAWAI'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>👤 1. Pegawai</span>
            </button>

            <button
              onClick={() => {
                setActiveRole('KEPALA_CABANG');
                setActiveTab('management');
                if (loggedInEmp) {
                  const targetBranchId = branchesList.find(b => b.name.toLowerCase().includes(loggedInEmp.branch.toLowerCase()) || loggedInEmp.branch.toLowerCase().includes(b.name.toLowerCase()))?.id || 'BRANCH_001';
                  setSelectedBranchId(targetBranchId);
                } else if (selectedBranchId === 'ALL_BRANCHES') {
                  setSelectedBranchId('BRANCH_001');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeRole === 'KEPALA_CABANG'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>🏢 2. Kepala Cabang</span>
            </button>

            <button
              onClick={() => {
                setActiveRole('OWNER');
                setActiveTab('dashboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeRole === 'OWNER'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>👑 3. Owner</span>
            </button>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Sign Out / Keluar</span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {/* ENVIRONMENT MODE SWITCHER TOGGLE */}
          <button
            onClick={() => setSystemEnvMode(prev => prev === 'DEMO' ? 'LIVE' : 'DEMO')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border flex items-center space-x-1.5 shadow ${
              systemEnvMode === 'LIVE'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Klik untuk beralih antara Mode Demo dan Mode Live Production"
          >
            <span className={`w-2 h-2 rounded-full mr-1 ${systemEnvMode === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span>
            <span>{systemEnvMode === 'LIVE' ? '🟢 LIVE PRODUCTION' : '🎮 Mode Demo / Trial'}</span>
          </button>

          {/* SELF-SERVICE GANTI PIN BUTTON FOR PEGAWAI / KEPALA CABANG */}
          {(activeRole === 'PEGAWAI' || activeRole === 'KEPALA_CABANG') && (
            <button
              onClick={() => setShowPinChangeModal(true)}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 shadow-sm"
              title="Ganti PIN 4 Karakter Mandiri"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>🔑 PIN: {selfServicePin} (Ganti PIN Mandiri)</span>
            </button>
          )}

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse mr-2"></span>
            PILIN (Multi-Branch)
          </span>
          <div className="text-right text-xs">
            <p className="font-bold text-white uppercase tracking-wider">
              {activeRole === 'OWNER' ? '👑 Owner Access' : activeRole === 'KEPALA_CABANG' ? '🏢 Kepala Cabang' : '👤 Pegawai / Staf'}
            </p>
            <p className="text-slate-400">Tenant Scope</p>
          </div>
        </div>
      </header>

      {/* SELF-SERVICE GANTI PIN MODAL */}
      {showPinChangeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Ganti PIN / Password Mandiri (4 Digit)</span>
              </h3>
              <button onClick={() => setShowPinChangeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateSelfPin} className="space-y-3 text-xs">
              <p className="text-slate-300">
                PIN default dari Owner saat pembuatan akun adalah 4 karakter. Kamu dapat menggantinya sendiri secara mandiri di sini:
              </p>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">PIN / Password Baru (4 Karakter) *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={selfServicePin}
                  onChange={(e) => setSelfServicePin(e.target.value)}
                  placeholder="Contoh: 8888"
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold text-base text-center focus:outline-none focus:border-amber-400 tracking-widest"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinChangeModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg shadow"
                >
                  💾 Simpan PIN Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pinSuccessMsg && (
        <div className="bg-amber-950/80 border border-amber-500/40 px-6 py-2 flex items-center justify-between text-xs text-amber-300 font-bold animate-fadeIn">
          <span>{pinSuccessMsg}</span>
          <button onClick={() => setPinSuccessMsg(null)} className="underline text-amber-400">Tutup</button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        {/* ROLE-FILTERED SIDEBAR NAVIGATION (DEMO FOCUS ENHANCED) */}
        <aside className="w-64 bg-slate-900/90 border-r border-slate-800 p-4 flex flex-col space-y-5 text-xs overflow-y-auto shrink-0">
          
          {/* DASHBOARD 1: PEGAWAI (STAF OPERASIONAL ONLY) */}
          {activeRole === 'PEGAWAI' && (
            <div className="p-2.5 rounded-xl border border-blue-500/40 bg-blue-950/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                  <span>👤 DASHBOARD PEGAWAI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300">AKTIF</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('pos')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'pos' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <span>Kasir POS Commerce</span>
                  </div>
                  {!isAuthorizedPosCashier && (
                    <span className="text-[9px] bg-slate-800 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded font-mono">🔒 Non-Kasir</span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('work')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'work' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Layanan & Pengerjaan SPK</span>
                </button>

                {isAuthorizedCustomerViewer && (
                  <button
                    onClick={() => setActiveTab('customers')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                      activeTab === 'customers' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Database Pelanggan</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('sapaan')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'sapaan' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>WA Engine: Hypnoselling & Sapaan</span>
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'attendance' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Presensi & Foto Selfi Absen</span>
                </button>

                <button
                  onClick={() => setActiveTab('broadcast')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'broadcast' ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Broadcast Teks & Gambar</span>
                </button>
              </div>
            </div>
          )}

          {/* DASHBOARD 2: KEPALA CABANG (MANAJER CABANG ONLY) */}
          {activeRole === 'KEPALA_CABANG' && (
            <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                  <span>🏢 DASHBOARD KEPALA CABANG</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300">AKTIF</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('management')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'management' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-blue-400" />
                  <span>Management Control & Omzet</span>
                </button>

                <button
                  onClick={() => setActiveTab('work')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'work' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>Lifecycle SPK & Pengerjaan</span>
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'customers' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Database Pelanggan</span>
                </button>

                <button
                  onClick={() => setActiveTab('reminder_report')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'reminder_report' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>Laporan WA Reminder & Omzet</span>
                </button>

                <button
                  onClick={() => setActiveTab('expense')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'expense' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Input Pengeluaran Cabang</span>
                </button>

                <button
                  onClick={() => setActiveTab('broadcast')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'broadcast' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>Broadcast Teks & Gambar</span>
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'attendance' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span>Presensi Diri Sendiri</span>
                </button>

                <button
                  onClick={() => setActiveTab('gamification')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'gamification' ? 'bg-emerald-600 text-white font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Kinerja & Gamifikasi Staf</span>
                </button>
              </div>
            </div>
          )}

          {/* DASHBOARD 3: OWNER (PEMILIK USAHA ONLY) */}
          {activeRole === 'OWNER' && (
            <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center space-x-1">
                  <span>👑 DASHBOARD OWNER</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300">AKTIF</span>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'dashboard' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-blue-400" />
                  <span>Executive Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'overview' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span>Input Master Data (Pegawai, Layanan & BOM)</span>
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'customers' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Database Pelanggan</span>
                </button>

                <button
                  onClick={() => setActiveTab('finance')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'finance' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Laporan Rugi Laba & Keuangan</span>
                </button>

                <button
                  onClick={() => setActiveTab('revenue')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'revenue' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-4 h-4 text-emerald-400" />
                  <span>Promosi Otomatis</span>
                </button>

                <button
                  onClick={() => setActiveTab('control')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'control' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Otorisasi & Control</span>
                </button>

                <button
                  onClick={() => setActiveTab('intelligence')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'intelligence' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <PieChart className="w-4 h-4 text-indigo-400" />
                  <span>Analisis Inteligensi</span>
                </button>

                <button
                  onClick={() => setActiveTab('importer')}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-left transition-all ${
                    activeTab === 'importer' ? 'bg-amber-600 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>System & Import</span>
                </button>
              </div>
            </div>
          )}

        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* BUSINESS DASHBOARD HOME (LAYAR UTAMA DASHBOARD OWNER - LAPORAN RUGI LABA & KELEMBAGAAN) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Welcome Banner */}
              <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 rounded-xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500 text-slate-950 font-mono">
                      👑 TIER 3 EXECUTIVE CONTROL
                    </span>
                    <span className="text-xs text-amber-300 font-mono font-bold">PT BOS PILIN (Multi-Branch)</span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">Layar Utama Dashboard Owner: Laporan Rugi Laba & Keuangan</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    "Pegawai mencatat. Sistem mengingat. Kepala Cabang mengendalikan. Owner melihat bisnis."
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setActiveTab('finance')}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Buka Laporan Keuangan Perusahaan</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('management')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-2"
                  >
                    <ClipboardList className="w-4 h-4 text-blue-400" />
                    <span>Management Control</span>
                  </button>
                </div>
              </div>

              {/* MULTI-BRANCH SELECTOR & BRANCH DUPLICATION CONTROL BAR */}
              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Pilih Cabang Perusahaan & Duplikasi Cabang Baru</h3>
                      <p className="text-[11px] text-blue-400 font-semibold mt-0.5">
                        📌 Owner dapat melihat laporan keuangan setiap cabang atau membuat duplikasi cabang baru secara dinamis.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDuplicateBranch(selectedBranchId)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center space-x-2"
                  >
                    <span>📋 + Duplikasi Cabang Baru</span>
                  </button>
                </div>

                {branchBannerMsg && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300 font-bold animate-fadeIn">
                    <span>{branchBannerMsg}</span>
                    <button onClick={() => setBranchBannerMsg(null)} className="underline text-emerald-400">Tutup</button>
                  </div>
                )}

                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6">
                    <label className="text-[11px] text-slate-400 font-semibold block mb-1">Tampilkan Laporan Keuangan Untuk Cabang:</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full bg-slate-950 border border-blue-500/40 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 focus:outline-none focus:border-blue-400"
                    >
                      {branchesList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} — Penanggung Jawab: {b.manager}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Cabang Aktif Dipilih:</span>
                      <span className="font-bold text-white text-xs">{branchesList.find(b => b.id === selectedBranchId)?.name}</span>
                      <span className="text-[10px] text-slate-500 block font-mono mt-0.5">{branchesList.find(b => b.id === selectedBranchId)?.location}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 block font-bold font-mono">100% TERISI DATA</span>
                      <span className="text-[10px] text-slate-400">P&L Status: Real-Time</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic P&L Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Pendapatan (Cash In Total)</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">Rp {pnlReport.totalRevenue.toLocaleString('id-ID')}</p>
                  
                  {/* BREAKDOWN TUNAI VS TRANSFER PILLS */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                    <div className="bg-slate-950 p-1.5 rounded border border-emerald-500/30">
                      <span className="text-slate-400 block font-semibold">💵 Tunai (Cash)</span>
                      <span className="font-mono font-bold text-emerald-300">
                        Rp {Math.round(pnlReport.totalRevenue * 0.6).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="bg-slate-950 p-1.5 rounded border border-blue-500/30">
                      <span className="text-slate-400 block font-semibold">💳 Transfer/QRIS</span>
                      <span className="font-mono font-bold text-blue-300">
                        Rp {Math.round(pnlReport.totalRevenue * 0.4).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Total Pengeluaran (Cash Out)</p>
                  <p className="text-2xl font-bold text-rose-400 mt-1">Rp {pnlReport.totalExpenses.toLocaleString('id-ID')}</p>
                  <p className="text-[11px] text-slate-500 mt-2">Di-input Kepala Cabang</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Laba Bersih (Net Profit)</p>
                  <p className={`text-2xl font-bold mt-1 ${pnlReport.netProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    Rp {pnlReport.netProfit.toLocaleString('id-ID')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-2">Revenue - Expenses</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                  <p className="text-xs text-slate-400 font-medium">Margin Net Profit</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{pnlReport.profitMarginPercent}%</p>
                  <p className="text-[11px] text-slate-500 mt-2">Rasio Laba Bersih</p>
                </div>
              </div>

              {/* MULTI-BRANCH REVENUE BREAKDOWN EXECUTIVE WIDGET FOR OWNER */}
              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Rincian Omzet Konsolidasi Per Cabang (Multi-Branch Breakdown)</h3>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950 px-2.5 py-1 rounded border border-blue-500/40">
                    {branchesList.filter(b => b.id !== 'ALL_BRANCHES').length} Cabang Terdaftar
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {branchesList.filter(b => b.id !== 'ALL_BRANCHES').map((branch) => {
                    const displayRev = branch.revenue + (branch.id === 'BRANCH_001' ? currPeriodRevenue : 0);
                    return (
                      <div
                        key={branch.id}
                        onClick={() => setSelectedBranchId(branch.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          selectedBranchId === branch.id
                            ? 'bg-slate-950 border-amber-400 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white block">{branch.name}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {branch.id}
                          </span>
                        </div>
                        <p className="text-xl font-bold font-mono text-emerald-400 mt-2">
                          Rp {displayRev.toLocaleString('id-ID')}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-900">
                          <span>Penanggung Jawab: <strong className="text-slate-200">{branch.manager}</strong></span>
                          <span className="text-blue-400 font-bold underline">Filter Cabang ➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ACCUMULATIVE VOIDED TRANSACTIONS EXECUTIVE SUMMARY FOR OWNER */}
              <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-5 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Akumulasi Transaksi Dibatalkan / Dihapus (Void Summary)</h3>
                      <p className="text-[11px] text-rose-400 font-semibold mt-0.5">
                        📌 Laporan Eksekutif Owner: Total akumulasi nota transaksi yang disetujui (ACC) untuk dihapus/void.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-rose-950 px-2.5 py-1 rounded border border-rose-500/40">
                    GD-06 GOVERNANCE COMPLIANT
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1">
                    <span className="text-xs text-slate-400 block font-medium">Jumlah Nota Dibatalkan / Dihapus:</span>
                    <p className="text-2xl font-extrabold text-rose-400 font-mono">
                      {voidedTransactionsCount} <span className="text-sm font-normal text-slate-400">Nota POS</span>
                    </p>
                    <span className="text-[10px] text-slate-500 block">Di-ACC Kepala Cabang / Owner</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1">
                    <span className="text-xs text-slate-400 block font-medium">Total Nominal Transaksi Dihapus:</span>
                    <p className="text-2xl font-extrabold text-rose-400 font-mono">
                      Rp {voidedTransactionsTotalAmount.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-rose-300 block">Telah dikurangi dari omzet kotor</span>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">Status Audit Trail:</span>
                      <strong className="text-emerald-400 font-mono text-xs block mt-1">100% AUDITED &amp; VERIFIED</strong>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Tercatat di Log Keamanan Tier 3</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXECUTIVE AUTOMATIC SYSTEM SIGN BADGES */}
              {(() => {
                const marginPct = pnlReport.profitMarginPercent;
                const isAman = marginPct >= 30;
                const isWaspada = marginPct >= 15 && marginPct < 30;

                return (
                  <div className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
                    isAman
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : isWaspada
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-xl border font-bold text-lg ${
                        isAman ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : isWaspada ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                      }`}>
                        {isAman ? '🟢' : isWaspada ? '🟡' : '🔴'}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                          <span>SIGN SISTEM KEUANGAN PERUSAHAAN:</span>
                          <span className={`px-2 py-0.5 rounded text-xs uppercase font-extrabold font-mono ${
                            isAman ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : isWaspada ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}>
                            {isAman ? 'SIGN: AMAN (Kondisi Sangat Sehat)' : isWaspada ? 'SIGN: WASPADA (Perlu Evaluasi)' : 'SIGN: BAHAYA (Peringatan Margin Low)'}
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {isAman
                            ? 'Sistem memproses data secara otomatis: Rasio Margin Laba Bersih di atas 30%. Operasional berjalan sangat sehat & menguntungkan.'
                            : isWaspada
                            ? 'Sistem memproses data: Margin Laba Bersih di kisaran 15%-30%. Disarankan mengaktifkan promo jam sepi atau efisiensi biaya operasional.'
                            : 'Sistem memproses data: Margin Laba Bersih di bawah 15%. Perlu tindakan cepat penyesuaian HPP & pengawasan pengeluaran.'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* VISUAL GRAFIK GARIS OMZET & DONUT CHART PENGELUARAN */}
              {(() => {
                const multiReport = FinancialReportService.getMultiPeriodComparison(pnlReport.totalRevenue, pnlReport.totalExpenses);
                const dailyReport = FinancialReportService.getDailyPeriodComparison(pnlReport.totalRevenue, pnlReport.totalExpenses);
                
                const monthlyPoints = [
                  { label: multiReport[0].periodLabel, rev: multiReport[0].revenue, x: 50, y: 190 },
                  { label: multiReport[1].periodLabel, rev: multiReport[1].revenue, x: 130, y: 175 },
                  { label: multiReport[2].periodLabel, rev: multiReport[2].revenue, x: 210, y: 160 },
                  { label: multiReport[3].periodLabel, rev: multiReport[3].revenue, x: 290, y: 145 },
                  { label: multiReport[4].periodLabel, rev: multiReport[4].revenue, x: 370, y: 120 },
                  { label: multiReport[5].periodLabel, rev: multiReport[5].revenue, x: 450, y: 90 },
                  { label: multiReport[6].periodLabel, rev: multiReport[6].revenue, x: 530, y: 55 }
                ];

                const dailyPoints = [
                  { label: dailyReport[0].periodLabel, rev: dailyReport[0].revenue, x: 50, y: 185 },
                  { label: dailyReport[1].periodLabel, rev: dailyReport[1].revenue, x: 130, y: 165 },
                  { label: dailyReport[2].periodLabel, rev: dailyReport[2].revenue, x: 210, y: 150 },
                  { label: dailyReport[3].periodLabel, rev: dailyReport[3].revenue, x: 290, y: 160 },
                  { label: dailyReport[4].periodLabel, rev: dailyReport[4].revenue, x: 370, y: 130 },
                  { label: dailyReport[5].periodLabel, rev: dailyReport[5].revenue, x: 450, y: 80 },
                  { label: dailyReport[6].periodLabel, rev: dailyReport[6].revenue, x: 530, y: 110 }
                ];

                const activePoints = chartViewMode === 'MONTHLY' ? monthlyPoints : dailyPoints;
                const activePathD = chartViewMode === 'MONTHLY' 
                  ? `M 50 190 L 130 175 L 210 160 L 290 145 L 370 120 L 450 90 L 530 55`
                  : `M 50 185 L 130 165 L 210 150 L 290 160 L 370 130 L 450 80 L 530 110`;
                
                const activeAreaD = chartViewMode === 'MONTHLY'
                  ? `M 50 190 L 130 175 L 210 160 L 290 145 L 370 120 L 450 90 L 530 55 L 530 230 L 50 230 Z`
                  : `M 50 185 L 130 165 L 210 150 L 290 160 L 370 130 L 450 80 L 530 110 L 530 230 L 50 230 Z`;

                return (
                  <div className="grid grid-cols-12 gap-6">
                    {/* GRAFIK GARIS OMZET (LEFT 7 COLS) */}
                    <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span>Grafik Garis Tren Omzet & Pemasukan</span>
                          </h3>
                          <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                            📈 Terlihat Jelas Perbedaan Turun-Naik Omzet ({chartViewMode === 'MONTHLY' ? 'Tampilan Bulanan' : 'Tampilan Harian Minggu Ini'}).
                          </p>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                          <button
                            type="button"
                            onClick={() => setChartViewMode('MONTHLY')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              chartViewMode === 'MONTHLY'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            📅 Bulan
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartViewMode('DAILY')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              chartViewMode === 'DAILY'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            ☀️ Hari
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative">
                        <svg className="w-full h-64 overflow-visible" viewBox="0 0 620 250">
                          <defs>
                            <linearGradient id="lineGradHome" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          <line x1="40" y1="40" x2="580" y2="40" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                          <line x1="40" y1="100" x2="580" y2="100" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                          <line x1="40" y1="160" x2="580" y2="160" stroke="#334155" strokeDasharray="4 4" strokeWidth="1" />
                          <line x1="40" y1="220" x2="580" y2="220" stroke="#334155" strokeWidth="1" />

                          <text x="35" y="44" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                            {chartViewMode === 'MONTHLY' ? 'Rp 4.5M' : 'Rp 1M'}
                          </text>
                          <text x="35" y="104" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                            {chartViewMode === 'MONTHLY' ? 'Rp 3.5M' : 'Rp 650K'}
                          </text>
                          <text x="35" y="164" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                            {chartViewMode === 'MONTHLY' ? 'Rp 2.5M' : 'Rp 350K'}
                          </text>
                          <text x="35" y="224" fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">Rp 0</text>

                          <path d={activeAreaD} fill="url(#lineGradHome)" />
                          <path d={activePathD} fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />

                          {activePoints.map((pt, idx) => (
                            <g key={idx} className="group cursor-pointer">
                              <circle cx={pt.x} cy={pt.y} r="6" fill="#10b981" stroke="#022c22" strokeWidth="2.5" />
                              <circle cx={pt.x} cy={pt.y} r="12" fill="#10b981" opacity="0.2" className="animate-ping" />
                              
                              <rect x={pt.x - 38} y={pt.y - 32} width="76" height="20" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                              <text x={pt.x} y={pt.y - 18} fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                {chartViewMode === 'MONTHLY' ? `Rp ${(pt.rev / 1000000).toFixed(2)}M` : `Rp ${(pt.rev / 1000).toFixed(0)}K`}
                              </text>

                              <text x={pt.x} y="242" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">
                                {pt.label.split(' ')[0]}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold">
                          <span>🟢 Tren Omzet Meningkat Konsisten Berkelanjutan</span>
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          Peak Volume: <strong>{activePoints[activePoints.length - 1].label} (Rp {pnlReport.totalRevenue.toLocaleString('id-ID')})</strong>
                        </span>
                      </div>
                    </div>

                    {/* GRAFIK DONUT PENGELUARAN (RIGHT 5 COLS) */}
                    <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                            <PieChart className="w-4 h-4 text-rose-400" />
                            <span>Grafik Donut Proporsi Pengeluaran</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">Komposisi Biaya Operasional Cabang</p>
                        </div>
                        <span className="text-xs text-rose-400 font-mono font-bold">
                          Rp {pnlReport.totalExpenses.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-center py-2 relative">
                        <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#e11d48" strokeWidth="16" strokeDasharray="130 240" strokeDashoffset="0" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#f59e0b" strokeWidth="16" strokeDasharray="60 240" strokeDashoffset="-130" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#3b82f6" strokeWidth="16" strokeDasharray="30 240" strokeDashoffset="-190" />
                          <circle cx="50" cy="50" r="38" fill="none" stroke="#a855f7" strokeWidth="16" strokeDasharray="20 240" strokeDashoffset="-220" />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Outflow</span>
                          <span className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                            Rp {pnlReport.totalExpenses.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs pt-1">
                        <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                            <span className="text-slate-300 font-semibold">OPERATIONAL (Bahan, Tisu, Operasional)</span>
                          </div>
                          <span className="font-mono text-rose-400 font-bold">54%</span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                            <span className="text-slate-300 font-semibold">UTILITIES (Listrik, Air, Internet)</span>
                          </div>
                          <span className="font-mono text-amber-400 font-bold">25%</span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            <span className="text-slate-300 font-semibold">SUPPLIES (Perlengkapan Service)</span>
                          </div>
                          <span className="font-mono text-blue-400 font-bold">13%</span>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800">
                          <div className="flex items-center space-x-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            <span className="text-slate-300 font-semibold">MAINTENANCE (Perawatan Alat)</span>
                          </div>
                          <span className="font-mono text-purple-400 font-bold">8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TABEL PERHITUNGAN GAJI OPERASIONAL SDM & INSENTIF SPK (LAYAR UTAMA DASHBOARD OWNER) */}
              {(() => {
                const payrollCalc = FinancialReportService.calculateStaffPayrollList(staffPayrollList);
                const totalLaborCost = payrollCalc.reduce((sum, item) => sum + item.totalPayrollCost, 0);

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg animate-fadeIn">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>Tabel Perhitungan Gaji Pegawai & Insentif SPK (Labor Cost SDM)</span>
                        </h3>
                        <p className="text-[11px] text-blue-400 font-semibold mt-0.5">
                          📌 Owner Mengatur Gaji Pokok & Insentif Per SPK Selesai Sebagai Acuan Otomatis Biaya Operasional Pegawai.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-semibold">Total Biaya Gaji SDM:</span>
                        <span className="text-sm font-bold font-mono text-blue-400">Rp {totalLaborCost.toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* TABLE PERHITUNGAN GAJI PEGAWAI */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                            <th className="p-3">ID Staf</th>
                            <th className="p-3">Nama Pegawai</th>
                            <th className="p-3">Role / Jabatan</th>
                            <th className="p-3 text-center">SPK Selesai (Proses Kerja)</th>
                            <th className="p-3 text-right">Gaji Pokok (Rp)</th>
                            <th className="p-3 text-right">Insentif / SPK (Rp)</th>
                            <th className="p-3 text-right">Total Bonus Insentif (Rp)</th>
                            <th className="p-3 text-right font-bold text-white">Total Gaji & Labor Cost (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {payrollCalc.map((stf) => (
                            <tr key={stf.staffId} className="hover:bg-slate-800/40 transition-all text-slate-300">
                              <td className="p-3 font-mono text-[11px] text-blue-400 font-bold">{stf.staffId}</td>
                              <td className="p-3 font-bold text-white">{stf.staffName}</td>
                              <td className="p-3 text-slate-400 text-[11px]">{stf.role}</td>
                              <td className="p-3 text-center font-mono font-bold text-amber-400">
                                <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                                  {stf.spkCompletedCount} SPK Selesai
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  value={stf.baseSalary}
                                  onChange={(e) => handleUpdateStaffBaseSalary(stf.staffId, parseFloat(e.target.value) || 0)}
                                  className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input
                                  type="number"
                                  value={stf.incentiveRatePerSpk}
                                  onChange={(e) => handleUpdateStaffIncentive(stf.staffId, parseFloat(e.target.value) || 0)}
                                  className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-emerald-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                                + Rp {stf.totalIncentive.toLocaleString('id-ID')}
                              </td>
                              <td className="p-3 text-right font-mono font-extrabold text-white text-sm">
                                Rp {stf.totalPayrollCost.toLocaleString('id-ID')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PUSAT INPUT MASTER DATA OWNER (EXECUTIVE SETUP SURFACE) */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Pusat Input Master Data Perusahaan (Role Owner)</h2>
                    <p className="text-xs text-slate-400">Pengaturan Data Induk Perusahaan: Data Pegawai, Katalog Layanan, Bahan Baku (BOM), & Ambang Retensi WA</p>
                  </div>
                </div>

                <div className="bg-purple-950 px-4 py-2 rounded-xl border border-purple-500/40 text-right text-xs">
                  <span className="text-purple-300 font-bold block text-[11px]">👑 OWNER EXECUTIVE SETUP</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {employeeMasterList.length} Staf | {masterCatalogList.length} Layanan Master
                  </span>
                </div>
              </div>

              {/* PANEL 1: MASTER DATA PEGAWAI & STAF (NAMA, NO KONTAK, EMAIL, ROLE) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>1. Master Data Pegawai & Staf (Nama, No Kontak, Email, & Role Jabatan)</span>
                    </h3>
                    <p className="text-[11px] text-blue-400 font-semibold mt-0.5">
                      📌 Tempat Owner Mendaftarkan Pegawai Baru (Kasir, Kepala Cabang, Teknisi SPK, Operator WA).
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedEmpIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteEmployees}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1 animate-fadeIn"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>🗑️ Hapus ({selectedEmpIds.length}) Pegawai Terpilih</span>
                      </button>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Total: {employeeMasterList.length} Staf Terdaftar
                    </span>
                  </div>
                </div>

                {empBannerMsg && (
                  <div className="bg-blue-950/80 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-blue-300 font-bold animate-fadeIn">
                    <span>{empBannerMsg}</span>
                    <button onClick={() => setEmpBannerMsg(null)} className="underline text-blue-400">Tutup</button>
                  </div>
                )}

                {/* FORM INPUT MASTER PEGAWAI BARU */}
                <form onSubmit={handleAddMasterEmployee} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white text-xs flex items-center space-x-1">
                    <span>+ Register Pegawai / Staf Baru</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Pegawai *</label>
                      <input
                        type="text"
                        required
                        value={newEmpNama}
                        onChange={(e) => setNewEmpNama(e.target.value)}
                        placeholder="Contoh: Rina Melati"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">No Kontak / WhatsApp *</label>
                      <input
                        type="text"
                        required
                        value={newEmpPhone}
                        onChange={(e) => setNewEmpPhone(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Alamat Email (Opsional)</label>
                      <input
                        type="email"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        placeholder="rina@pilin.id"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Jabatan / Role Cabang *</label>
                      <select
                        value={newEmpRole}
                        onChange={(e) => setNewEmpRole(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
                      >
                        <option value="Kasir Utama">Kasir POS Utama</option>
                        <option value="Kepala Cabang">Kepala Cabang</option>
                        <option value="Produksi">Produksi</option>
                        <option value="Admin">Admin</option>
                        <option value="LAINNYA">✏️ Lainnya (Input Manual Owner...)</option>
                      </select>
                      {(newEmpRole === 'LAINNYA' || newEmpRole.includes('Lainnya')) && (
                        <input
                          type="text"
                          required
                          value={newEmpCustomRole}
                          onChange={(e) => setNewEmpCustomRole(e.target.value)}
                          placeholder="Ketik Nama Jabatan (Contoh: Quality Control / Kurir)"
                          className="w-full bg-slate-900 border-2 border-amber-500/80 rounded px-2.5 py-1.5 mt-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400 text-xs shadow-sm animate-fadeIn"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-blue-400 font-bold block mb-1 flex items-center space-x-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>🏢 Penugasan Lokasi Cabang *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newEmpBranch}
                        onChange={(e) => setNewEmpBranch(e.target.value)}
                        placeholder="Ketik Lokasi / Nama Cabang (Contoh: Cabang Utama - Jakarta Pusat)"
                        className="w-full bg-slate-900 border-2 border-blue-500/80 rounded px-2.5 py-1.5 text-blue-300 font-bold focus:outline-none focus:border-blue-400 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-amber-400 font-bold block mb-1 flex items-center space-x-1">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        <span>🔑 Password Log-in Pegawai *</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={8}
                        value={newEmpPin}
                        onChange={(e) => setNewEmpPin(e.target.value)}
                        placeholder="Masukkan Password 4 Digit (contoh: 1234)"
                        className="w-full bg-slate-900 border-2 border-amber-500/80 rounded px-2.5 py-1.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-1.5 text-xs"
                    >
                      <span>💾 Simpan Pegawai, Lokasi Cabang & Password Ke Database</span>
                    </button>
                  </div>
                </form>

                {/* TABLE MASTER PEGAWAI TERDAFTAR */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={employeeMasterList.length > 0 && selectedEmpIds.length === employeeMasterList.length}
                            onChange={(e) => handleToggleSelectAllEmp(e.target.checked)}
                            className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                            title="Pilih Semua Pegawai"
                          />
                        </th>
                        <th className="p-3">ID Staf</th>
                        <th className="p-3">Nama Pegawai</th>
                        <th className="p-3">No Kontak (WA)</th>
                        <th className="p-3">Alamat Email</th>
                        <th className="p-3">Role / Jabatan</th>
                        <th className="p-3">🔑 Password Log-in (4 Digit)</th>
                        <th className="p-3">Lokasi Cabang</th>
                        <th className="p-3 text-center">Aksi (Hapus)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {employeeMasterList.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedEmpIds.includes(emp.id)}
                              onChange={() => handleToggleSelectEmp(emp.id)}
                              className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono text-[11px] text-blue-400 font-bold">{emp.id}</td>
                          <td className="p-3 font-bold text-white">{emp.nama}</td>
                          <td className="p-3 font-mono text-emerald-400">{emp.no_hp}</td>
                          <td className="p-3 text-slate-400 font-mono">{emp.email}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30">
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-amber-300">
                            <div className="flex items-center space-x-2">
                              <span className="bg-slate-950 px-2.5 py-1 rounded border border-amber-500/40 font-bold text-amber-300">
                                🔑 {emp.password_pin || '1234'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newP = prompt(`Masukkan Password / PIN 4-Digit Baru untuk ${emp.nama}:`, emp.password_pin || '1234');
                                  if (newP && newP.trim()) {
                                    handleOwnerUpdateEmployeePin(emp.id, newP.trim());
                                  }
                                }}
                                className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] rounded font-sans font-bold border border-amber-500/40 transition-all"
                                title="Owner Edit Password Pegawai Ini"
                              >
                                ✏️ Ubah Password
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">{emp.branch}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus pegawai ${emp.nama} (${emp.role}) dari Master Database?`)) {
                                  handleDeleteMasterEmployee(emp.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[11px] font-bold transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto"
                              title="Hapus Pegawai Ini dari Database"
                            >
                              <Ban className="w-3 h-3 text-rose-400" />
                              <span>🗑️ Hapus</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PANEL 2: MASTER LAYANAN, HARGA JUAL POS, HPP, & BAHAN BAKU (BOM) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                {/* PENGATURAN SYARAT & KETENTUAN NOTA POS (INPUT MANUAL OWNER) */}
                {activeRole === 'OWNER' && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                      <h4 className="font-bold text-amber-300 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span>Pengaturan Syarat &amp; Ketentuan (T&amp;C) Struk Nota POS (Owner Only)</span>
                      </h4>
                      <span className="text-[10px] text-amber-400 font-mono bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                        Tercetak Otomatis pada Struk Thermal 58mm &amp; Pesan WA
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={tenantTerms}
                      onChange={(e) => setTenantTerms(e.target.value)}
                      placeholder="Input Syarat & Ketentuan Nota POS di sini..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
                    />
                  </div>
                )}

                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <PackageCheck className="w-4 h-4 text-emerald-400" />
                      <span>2. Master Layanan, Harga Jual POS, HPP, & Bahan Baku / BOM</span>
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedCatalogIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDeleteCatalogItems}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1 animate-fadeIn"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>🗑️ Hapus ({selectedCatalogIds.length}) Layanan Terpilih</span>
                      </button>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Total: {masterCatalogList.length} Layanan Master
                    </span>
                  </div>
                </div>

                {catalogBannerMsg && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300 font-bold animate-fadeIn">
                    <span>{catalogBannerMsg}</span>
                    <button onClick={() => setCatalogBannerMsg(null)} className="underline text-emerald-400">Tutup</button>
                  </div>
                )}

                {/* FORM INPUT MASTER LAYANAN & BOM */}
                <form onSubmit={handleAddMasterCatalogItem} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  <h4 className="font-bold text-white text-xs flex items-center space-x-1">
                    <span>+ Register Layanan & Rincian Bahan Baku (BOM) Baru</span>
                  </h4>

                  <div className={`grid ${activeRole === 'OWNER' ? 'grid-cols-5' : 'grid-cols-4'} gap-3`}>
                    {activeRole === 'OWNER' && (
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">🏢 Jenis Usaha (Template BOM) *</label>
                        <select
                          value={selectedCatalogIndustry}
                          onChange={(e) => handleCatalogIndustryChange(e.target.value as IndustryCategory)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                        >
                          <option value="PET_SHOP">🐾 Pet Shop & Pet Clinic</option>
                          <option value="AUTO_CARE">🚗 Auto Care / Car Wash & Detailing</option>
                          <option value="SHOE_LEATHER">👟 Shoe & Leather Care (Laundry Sepatu/Tas)</option>
                          <option value="SPA_SALON">💆‍♀️ Spa & Salon Kecantikan</option>
                          <option value="LAUNDRY_CLOTHES">🧺 Laundry Pakaian & Dry Clean</option>
                          <option value="TOKO_KUE">🎂 Toko Kue / Bakery & Pastry</option>
                          <option value="FITNESS_GYM">🏋️‍♂️ Fitness / Gym & Health Club</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Nama Layanan *</label>
                      <input
                        type="text"
                        required
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        placeholder="Contoh: Grooming Cat Special / Spa Treatment..."
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Harga Jual POS (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        placeholder="Contoh: 150000"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Perkiraan HPP (Rp)</label>
                      <input
                        type="number"
                        value={newServiceHpp}
                        onChange={(e) => setNewServiceHpp(e.target.value)}
                        placeholder="Default 40% dari Harga"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Rincian Bahan Baku (BOM Auto-Fill) *</label>
                      <input
                        type="text"
                        required
                        value={newServiceBom}
                        onChange={(e) => setNewServiceBom(e.target.value)}
                        placeholder="BOM Otomatis mengikuti Jenis Usaha..."
                        className="w-full bg-slate-900 border border-emerald-500/40 rounded px-2.5 py-1.5 text-emerald-300 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-all"
                  >
                    💾 Simpan Master Layanan & BOM Baru
                  </button>
                </form>

                {/* TABLE MASTER LAYANAN TERDAPAT */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3 text-center w-10">
                          <input
                            type="checkbox"
                            checked={masterCatalogList.length > 0 && selectedCatalogIds.length === masterCatalogList.length}
                            onChange={(e) => handleToggleSelectAllCatalog(e.target.checked)}
                            className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                            title="Pilih Semua Layanan"
                          />
                        </th>
                        <th className="p-3">SKU</th>
                        <th className="p-3">Nama Layanan Master</th>
                        <th className="p-3 text-right">Harga Jual POS (Rp)</th>
                        <th className="p-3 text-right">HPP (Rp)</th>
                        <th className="p-3">Rincian Bahan Baku (BOM / Material)</th>
                        <th className="p-3 text-center">Aksi (Hapus)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {masterCatalogList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedCatalogIds.includes(item.id)}
                              onChange={() => handleToggleSelectCatalog(item.id)}
                              className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono text-[11px] text-purple-400 font-bold">{item.sku}</td>
                          <td className="p-3 font-bold text-white">{item.nama}</td>
                          <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                            Rp {item.base_harga.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono">
                            Rp {item.hpp.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-slate-300 text-[11px]">
                            <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-amber-300 font-mono">
                              {item.bahan_baku || 'Bahan Baku Service Standard'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus layanan '${item.nama}' (${item.sku}) dari Katalis Master?`)) {
                                  handleDeleteMasterCatalogItem(item.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[11px] font-bold transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto"
                              title="Hapus Layanan Ini dari Katalis Master"
                            >
                              <Ban className="w-3 h-3 text-rose-400" />
                              <span>🗑️ Hapus</span>
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

          {/* MANAGEMENT CONTROL SURFACE (PHASE 6 & 7 INTEGRATION) */}
          {activeTab === 'management' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ClipboardList className="w-6 h-6 text-blue-400" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Pusat Kendali Operasional & Management Control Cabang</h2>
                      <p className="text-sm text-slate-400">
                        Monitoring Closed-Loop Menghubungkan Progress SPK Pengerjaan Tim, Kuantitas Omzet, SLA, & Action Plan Cabang
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
                    <span className="text-xs text-slate-400 font-medium px-2">Role Context:</span>
                    {(['OWNER', 'KEPALA_CABANG', 'PEGAWAI'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setActiveRole(r);
                          if (r === 'PEGAWAI') {
                            setActiveTab('pos');
                          } else if (r === 'KEPALA_CABANG') {
                            setActiveTab('management');
                          } else {
                            setActiveTab('dashboard');
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          activeRole === r
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                        }`}
                      >
                        {r === 'KEPALA_CABANG' ? 'KEPALA CABANG' : r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 1. NOTIFIKASI MEMINTA PERSETUJUAN DISKON > 10% & HAPUS / VOID NOTA POS (KEPALA CABANG & OWNER APPROVAL) */}
              <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-fadeIn">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">1. Permohonan Otorisasi Approval Kepala Cabang (Notifikasi Aktif)</h3>
                      <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                        📌 Meminta Persetujuan: Diskon Kasir &gt; 10% (Rule GD-05) & Hapus / Void Nota POS (Rule GD-06).
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950 px-2.5 py-1 rounded border border-amber-500/40">
                    {pendingApprovals.filter(a => a.status === 'PENDING').length} Request Pending
                  </span>
                </div>

                {govAuditBanner && (
                  <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300 font-bold animate-fadeIn">
                    <span>{govAuditBanner}</span>
                    <button onClick={() => setGovAuditBanner(null)} className="underline text-emerald-400">Tutup</button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {pendingApprovals.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border space-y-3 transition-all ${
                        req.status === 'PENDING'
                          ? 'bg-slate-950 border-amber-500/40'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-950/40 border-emerald-500/40 opacity-70'
                          : 'bg-rose-950/40 border-rose-500/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          req.type === 'VOID_TRANSACTION' || req.rule_code.includes('GD-06')
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {req.rule_code}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{req.timestamp}</span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-xs">{req.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Pemohon: <strong className="text-slate-200">{req.applicant_name}</strong>
                          {req.amount > 0 && (
                            <span> | Nominal: <strong className="text-rose-400 font-mono">Rp {req.amount.toLocaleString('id-ID')}</strong></span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-300 italic mt-0.5">"{req.description}"</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-[10px] text-slate-500 font-mono">ID: {req.id}</span>
                        {req.status === 'PENDING' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleApproveGovRequest(req.id, 'REJECTED')}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all"
                            >
                              ✕ Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveGovRequest(req.id, 'APPROVED')}
                              className={`px-3 py-1 text-white text-xs font-bold rounded-lg shadow transition-all ${
                                req.type === 'VOID_TRANSACTION' || req.rule_code.includes('GD-06')
                                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                              }`}
                            >
                              ✓ Setujui (ACC {req.type === 'VOID_TRANSACTION' || req.rule_code.includes('GD-06') ? 'Hapus Nota' : 'Diskon'})
                            </button>
                          </div>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                            req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            STATUS: {req.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. REKAPITULASI KUANTITAS OMZET & LAPORAN PESAN WA (TERKIRIM VS TIDAK TERKIRIM) */}
              <div className="grid grid-cols-12 gap-6">
                {/* KUANTITAS OMZET CABANG */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
                  <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Kuantitas Nota Transaksi & Total Omzet Cabang</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-400">Sesi Real-Time</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block">Total Kuantitas Nota POS</span>
                      <span className="text-2xl font-bold font-mono text-white mt-1 block">
                        {currPeriodRevenue > 0 ? (lastTransaction ? 1 : 0) : 0} Nota
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-1">✓ Transaksi Input Kasir</span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block">Total Nilai Omzet (Cash In)</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                        Rp {currPeriodRevenue.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">Hasil Input 3 Kasir</span>
                    </div>
                  </div>
                </div>

                {/* LAPORAN PESAN WA TERKIRIM VS TIDAK TERKIRIM */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
                  <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span>Laporan Pesan WA Terkirim vs Mandat Pending</span>
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Total: {sentCustNotifications.length + pendingGamificationMandates.filter(m => m.status === 'PENDING_CASHIER_SEND').length} Pesan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block">Pesan WA Terkirim (Sent)</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                        {sentCustNotifications.length} Pesan
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold block mt-1">✓ Terverifikasi Kasir</span>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block">Mandat WA Pending di Kasir</span>
                      <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                        {pendingGamificationMandates.filter(m => m.status === 'PENDING_CASHIER_SEND').length} Mandat
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold block mt-1">⏳ Menunggu Submit Kasir</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. ALERT NOTA SPK TERLAMBAT (USAHA JASA - SLA WARNING) */}
              {(() => {
                const liveOrders = WorkQueueService.getOrders(selectedBranchId);
                const overdueOrders = liveOrders.filter(o => o.elapsed_minutes > o.target_minutes && o.status !== 'CLOSED' && o.status !== 'DELIVERED');

                return (
                  <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-5 space-y-3 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                        <div>
                          <h3 className="font-bold text-white text-sm">3. Alert Nota SPK Terlambat / Melebihi SLA (Usaha Jasa)</h3>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950 px-2.5 py-1 rounded border border-rose-500/40">
                        {overdueOrders.length} SPK Perlu Atensi SLA
                      </span>
                    </div>

                    {overdueOrders.length > 0 ? (
                      overdueOrders.map((ord) => (
                        <div key={ord.id} className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-amber-400 font-mono text-sm">{ord.order_number}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ⚠️ MELEBIHI ESTIMASI SLA (+{ord.elapsed_minutes - ord.target_minutes} MENIT)
                              </span>
                            </div>
                            <p className="text-white font-bold">Pelanggan: {ord.customer_name} | Layanan: {ord.service_name}</p>
                            <p className="text-slate-400 text-[11px]">Teknisi Penanggung Jawab: <strong className="text-slate-200">{ord.worker_name}</strong></p>
                          </div>

                          <div className="text-right space-y-2">
                            <span className="text-[10px] text-rose-300 block font-semibold">Estimasi SLA: {ord.target_minutes} Menit | Berjalan: {ord.elapsed_minutes} Menit</span>
                            <button
                              onClick={() => alert(`⚡ Notifikasi Teguran SLA Berhasil Diberikan ke Teknisi ${ord.worker_name}!`)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow text-xs transition-all"
                            >
                              ⚡ Beri Peringatan SLA Ke Teknisi
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-center text-xs text-emerald-300 font-bold">
                        ✓ Tidak ada Nota SPK yang melebihi batas waktu SLA saat ini. Seluruh pengerjaan tim tepat waktu!
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* LIVE STATUS PROGRESS SPK PENGERJAAN TIM (INTEGRATED LIVE SPK WORKFLOW) */}
              {(() => {
                const liveOrders = WorkQueueService.getOrders(selectedBranchId);
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <Wrench className="w-4 h-4 text-amber-400" />
                          <span>Live Progress Layanan & SPK Pengerjaan Tim (Status Real-Time)</span>
                        </h3>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-500/40">
                        {liveOrders.length} SPK Aktif Diproses
                      </span>
                    </div>

                    {/* LIVE SPK PROGRESS CARDS */}
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">1. Diterima (RECEIVED)</span>
                        <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                          {liveOrders.filter(o => o.status === 'RECEIVED').length} Order
                        </span>
                        <span className="text-[10px] text-slate-500">Antrean Siap Diambil Teknisi</span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">2. Sedang Diproses (IN_PROGRESS)</span>
                        <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                          {liveOrders.filter(o => o.status === 'IN_PROGRESS').length} Order
                        </span>
                        <span className="text-[10px] text-blue-400">Tim Sedang Mengerjakan Unit</span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">3. Inspeksi QC (QUALITY CONTROL)</span>
                        <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
                          {liveOrders.filter(o => o.status === 'QC').length} Order
                        </span>
                        <span className="text-[10px] text-purple-300">Pemeriksaan Hasil Akhir</span>
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">4. Selesai (FINISHED / COMPLETED)</span>
                        <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                          {liveOrders.filter(o => (o.status as string) === 'FINISHED' || (o.status as string) === 'COMPLETED' || o.status === 'READY_FOR_PICKUP').length} Order
                        </span>
                        <span className="text-[10px] text-emerald-400">Siap Diambil Konsumen</span>
                      </div>
                    </div>

                    {/* LIVE SPK TABLE */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                            <th className="p-3">No. SPK</th>
                            <th className="p-3">Nama Konsumen & Layanan POS</th>
                            <th className="p-3">Teknisi / Penanggung Jawab</th>
                            <th className="p-3 text-center">Status Lifecycle SPK</th>
                            <th className="p-3 text-center">Hasil Inspeksi QC</th>
                            <th className="p-3 text-right">Aksi Kepala Cabang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {liveOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                              <td className="p-3 font-mono font-bold text-amber-400">{ord.order_number}</td>
                              <td className="p-3">
                                <div className="font-bold text-white">{ord.customer_name}</div>
                                <div className="text-[11px] text-slate-400">{ord.service_name}</div>
                              </td>
                              <td className="p-3 font-semibold text-slate-200">
                                {ord.worker_name ? (
                                  <span className="flex items-center space-x-1">
                                    <span>👤</span>
                                    <span>{ord.worker_name}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">Belum Ditempatkan</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono ${
                                  (ord.status as string) === 'FINISHED' || (ord.status as string) === 'COMPLETED' || ord.status === 'READY_FOR_PICKUP'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : ord.status === 'QC'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : ord.status === 'IN_PROGRESS'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  (ord.qc_status as string) === 'PASS' || ord.qc_status === 'PASSED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : (ord.qc_status as string) === 'FAIL' || ord.qc_status === 'FAILED'
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {ord.qc_status || 'PENDING QC'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-1.5">
                                <button
                                  onClick={() => {
                                    const nextStg: ServiceOrderStatus = ord.status === 'RECEIVED' ? 'IN_PROGRESS' : ord.status === 'IN_PROGRESS' ? 'QC' : 'READY_FOR_PICKUP';
                                    handleUpdateOrderStatus(ord.id, nextStg);
                                  }}
                                  className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded text-[10px] font-bold transition-all"
                                >
                                  ▶ Progres Status
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderQC(ord.id, 'PASSED')}
                                  className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-bold transition-all"
                                >
                                  ✓ QC Pass
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              <ManagementControlDashboard
                businessId="00000000-0000-0000-0000-000000000001"
                branchId="00000000-0000-0000-0000-000000000010"
                actorUserId="00000000-0000-0000-0000-000000000100"
                actorRole={activeRole}
              />
            </div>
          )}

          {/* SERVICE WORK OPERATIONS SURFACE (DOMAIN 05 - PHASE 8 FOCUS) */}
          {activeTab === 'work' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Antrean Layanan & Pengerjaan Operasional</h2>
                  </div>
                </div>
                <button
                  onClick={() => setShowSpkForm(!showSpkForm)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-md shadow-amber-500/20 transition-all"
                >
                  {showSpkForm ? 'Batal Terbit' : '+ Terbit SPK / Service Order Baru'}
                </button>
              </div>

              {/* Work Operations Action Banner */}
              {workBannerMessage && (
                <div className="bg-amber-950/60 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    <p className="text-sm font-bold text-amber-300">{workBannerMessage}</p>
                  </div>
                  <button
                    onClick={() => setWorkBannerMessage(null)}
                    className="text-xs text-amber-400 hover:text-amber-200 underline"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Quick SPK Creation Form */}
              {showSpkForm && (
                <form onSubmit={handleCreateSpk} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Form Penerbitan SPK Baru</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Pilih Pelanggan *</label>
                      <select
                        value={spkCustomer}
                        onChange={(e) => setSpkCustomer(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {customerList.map((c) => (
                          <option key={c.id} value={c.nama}>
                            {c.nama} ({c.no_hp_normalized || c.no_hp})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Pilih Layanan / Service *</label>
                      <select
                        value={spkService}
                        onChange={(e) => setSpkService(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {posCatalog.map((s) => (
                          <option key={s.id} value={s.nama}>
                            {s.nama} ({s.sku} - Rp {s.base_harga.toLocaleString('id-ID')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Staf Penanggung Jawab / Teknisi</label>
                      <input
                        type="text"
                        value={spkWorker}
                        onChange={(e) => setSpkWorker(e.target.value)}
                        placeholder="Contoh: Teknisi Budi"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowSpkForm(false)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm"
                    >
                      Terbit SPK
                    </button>
                  </div>
                </form>
              )}

              {/* Service Orders Queue List Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Daftar Antrean Service Order Aktif</h3>
                  <span className="text-xs text-slate-400">Total: {workOrders.length} Order Dalam Proses</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3">No. Order SPK</th>
                        <th className="p-3">Pelanggan</th>
                        <th className="p-3">Layanan</th>
                        <th className="p-3">Penanggung Jawab</th>
                        <th className="p-3">Status Lifecycle</th>
                        <th className="p-3">SLA Status</th>
                        <th className="p-3">QC Inspection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {workOrders.map((wo) => {
                        const sla = WorkDomainService.calculateSLA(wo.elapsed_minutes, wo.target_minutes);
                        return (
                          <tr key={wo.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-mono font-bold text-amber-400">{wo.order_number}</td>
                            <td className="p-3 font-bold text-white">{wo.customer_name}</td>
                            <td className="p-3 text-slate-300">{wo.service_name}</td>
                            <td className="p-3 text-slate-400">{wo.worker_name}</td>
                            <td className="p-3">
                              <div className="flex flex-col space-y-1">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
                                  {wo.status}
                                </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(['RECEIVED', 'DIAGNOSIS', 'IN_PROGRESS', 'QC', 'READY_FOR_PICKUP', 'DELIVERED'] as const).map((st) => {
                                    const isCurrent = wo.status === st;
                                    const canTransition = isCurrent || WorkDomainService.validateServiceOrderTransition(wo.status, st).isValid;
                                    return (
                                      <button
                                        key={st}
                                        disabled={!canTransition}
                                        onClick={() => handleUpdateOrderStatus(wo.id, st)}
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all ${
                                          isCurrent
                                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                                            : canTransition
                                            ? 'bg-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300 border border-slate-700'
                                            : 'bg-slate-900 text-slate-600 cursor-not-allowed opacity-40 border border-slate-800/40'
                                        }`}
                                      >
                                        {st === 'DIAGNOSIS' ? 'DIAG' : st.substring(0, 3)}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                sla.slaStatus === 'ON_TRACK'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : sla.slaStatus === 'AT_RISK'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                {sla.slaStatus} ({wo.elapsed_minutes}/{wo.target_minutes} min)
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleUpdateOrderQC(wo.id, 'PASSED')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                    wo.qc_status === 'PASSED' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  PASS
                                </button>
                                <button
                                  onClick={() => handleUpdateOrderQC(wo.id, 'FAILED')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                    wo.qc_status === 'FAILED' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                  }`}
                                >
                                  FAIL
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* POS COMMERCE TERMINAL (ENHANCED POS KASIR WORKFLOW - PEGAWAI TIER 1) */}
          {activeTab === 'pos' && (
            <div className="space-y-6">
              {!isAuthorizedPosCashier && (
                <div className="bg-rose-950/80 border-2 border-rose-500/60 rounded-xl p-4 flex items-center justify-between text-xs text-rose-200 animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-rose-200 text-sm flex items-center space-x-1.5">
                        <span>⛔ OTORISASI TERBATAS: INPUT NOTA POS HANYA UNTUK ADMIN & KASIR</span>
                      </h4>
                      <p className="text-[11px] text-rose-300 mt-0.5">
                        Sesuai Kebijakan Operasional PILIN: Peran Anda saat ini (<strong>{loggedInEmp?.role || (activeRole === 'KEPALA_CABANG' ? 'Kepala Cabang' : 'Staf Non-Kasir')}</strong>) tidak diizinkan meng-input Nota Transaksi POS Kasir. Silakan minta <strong>Kasir Utama</strong> atau <strong>Admin / Owner</strong> untuk membuat nota transaksi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeRole === 'KEPALA_CABANG' ? 'management' : 'work')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-all text-xs shrink-0 shadow-md"
                  >
                    Buka Menu {activeRole === 'KEPALA_CABANG' ? 'Management' : 'Layanan SPK'} →
                  </button>
                </div>
              )}
              {activeRole === 'OWNER' && (
                <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-300">Monitoring Nota POS Konsolidasi Role Owner (Tier 3)</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('finance')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-all"
                  >
                    Buka Laporan Rugi Laba & Keuangan →
                  </button>
                </div>
              )}

              {activeRole === 'KEPALA_CABANG' && (
                <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-300">Catatan Operasional Kepala Cabang (Tier 2)</h4>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('management')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition-all"
                  >
                    Buka Management Control & Omzet →
                  </button>
                </div>
              )}

              {/* HEADER KONTROL KASIR: NAMA PEGAWAI & TANGGAL WAKTU REAL-TIME */}
              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Kasir POS Commerce</h2>
                  </div>
                </div>

                {/* EDITABLE CASHIER EMPLOYEE NAME & REAL-TIME TIMESTAMP STAMP */}
                <div className="flex items-center space-x-4 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
                  <div className="text-right text-xs space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-semibold">Nama Pegawai Kasir:</span>
                      <input
                        type="text"
                        value={posCashierName}
                        onChange={(e) => setPosCashierName(e.target.value)}
                        placeholder="Nama Pegawai / Kasir..."
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-emerald-400 font-bold focus:outline-none focus:border-blue-500 w-48 text-right"
                      />
                    </div>
                    <div className="flex items-center justify-end space-x-1.5 text-[11px] text-slate-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>📅 {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} | 🕒 {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CLEAN CASHIER TRANSACTION DATA SUMMARY BAR (NO INTRUSIVE NOTA OVERLAY ON CASHIER DASHBOARD) */}
              {lastTransaction && activeRole === 'PEGAWAI' && (
                <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3 animate-fadeIn shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        ✓ DATA TRANSAKSI TERAKHIR TERINPUT #{lastTransaction.id}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        ({lastTransaction.customer_name})
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowKasirFullStruk(true)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all"
                      >
                        👁️ Full Preview Struk
                      </button>
                      <button
                        type="button"
                        onClick={handleSendNotaViaWhatsApp}
                        className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>📲 Kirim WA</span>
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintNota58mm}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ Cetak 58mm</span>
                      </button>
                    </div>
                  </div>

                  {/* DATA GRID INSTEAD OF RECEIPT UI */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Layanan Terdaftar</span>
                      <span className="text-white font-bold text-[11px] truncate block">
                        {lastTransaction.items?.map(i => `${i.nama} (${i.qty}x)`).join(', ') || 'Service POS'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Subtotal &amp; Diskon</span>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        Rp {lastTransaction.total.toLocaleString('id-ID')}
                        {lastTransaction.discount > 0 && <span className="text-[10px] text-emerald-500 ml-1">(-Rp {lastTransaction.discount.toLocaleString('id-ID')})</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DP / Pembayaran</span>
                      <span className="text-amber-300 font-bold text-[11px]">
                        Rp {lastTransaction.dp_paid.toLocaleString('id-ID')} ({lastTransaction.method.toUpperCase()})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Sisa Pelunasan</span>
                      <span className={`font-bold text-[11px] ${lastTransaction.remaining_balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        Rp {lastTransaction.remaining_balance.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Status Nota</span>
                      <span className="text-emerald-300 font-bold text-[11px]">
                        {lastTransaction.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PRINTABLE DIGITAL RECEIPT MODAL / STRUK BUKTI NOTA */}
              {lastTransaction && (activeRole !== 'PEGAWAI' || showKasirFullStruk) && (
                <div className="bg-slate-950 border border-emerald-500/50 rounded-2xl p-6 space-y-4 animate-fadeIn shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>

                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                          STRUK CETAK NOTA TRANSAKSI RESMI
                        </span>
                        <h3 className="text-lg font-bold text-white mt-1">
                          TRX ID: {lastTransaction.id} — Pelanggan: {lastTransaction.customer_name}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => { setLastTransaction(null); setShowKasirFullStruk(false); }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all"
                    >
                      ✕ Tutup Struk Nota
                    </button>
                  </div>

                  {/* STRUK DETAIL GRID */}
                  <div className="grid grid-cols-4 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Nama Pegawai Kasir</span>
                      <strong className="text-white text-sm">{lastTransaction.cashier_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tanggal & Waktu Transaksi</span>
                      <strong className="text-slate-200">{lastTransaction.timestamp}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Metode Pembayaran</span>
                      <strong className="text-blue-400 font-mono">{lastTransaction.method.toUpperCase()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Status Nota Pembayaran</span>
                      <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                        lastTransaction.payment_status === 'LUNAS'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                      }`}>
                        {lastTransaction.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* MASTER TRANSACTION COMBINED PHOTO (1 FOTO SEKALIGUS UNTUK SATU NOTA TRANSAKSI) */}
                  {lastTransaction.photo_url && (
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center space-x-4">
                      <img
                        src={lastTransaction.photo_url}
                        alt="Foto Bukti Fisik Barang Nota"
                        className="w-20 h-20 object-cover rounded-lg border-2 border-emerald-500/60 shadow-md shrink-0"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] uppercase font-bold font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                            📷 1 FOTO BUKTI FISIK BARANG (COMBINED NOTA)
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">Lampiran Foto Bukti Barang Nota #{lastTransaction.id}</h4>
                        <p className="text-[11px] text-slate-400">Seluruh item jasa &amp; retail pada nota ini difoto bersamaan dalam 1 foto bukti kondisi awal fisik barang.</p>
                      </div>
                    </div>
                  )}

                  {/* FINANCIAL BREAKDOWN NOTA */}
                  <div className="grid grid-cols-4 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block">Subtotal Services</span>
                      <span className="text-white font-bold text-sm">Rp {lastTransaction.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total Diskon (GD-05 / Promo)</span>
                      <span className="text-emerald-400 font-bold text-sm">- Rp {lastTransaction.discount.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-amber-400 font-semibold block">DP (Uang Muka Dibayar)</span>
                      <span className="text-amber-300 font-bold text-sm">Rp {lastTransaction.dp_paid.toLocaleString('id-ID')}</span>
                    </div>
                    <div>
                      <span className="text-rose-400 font-semibold block">Sisa Pelunasan</span>
                      <span className="text-rose-300 font-bold text-sm">Rp {lastTransaction.remaining_balance.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* PREVIEW STRUK THERMAL PRINTER 58MM */}
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pratinjau Format Thermal 58mm (Default Printer Kasir)</span>
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        ✓ Standard Width: 58mm
                      </span>
                    </div>

                    <div className="bg-white text-slate-950 p-4 rounded-lg font-mono text-[11px] max-w-[260px] mx-auto shadow-md border border-slate-300 leading-normal space-y-1">
                      <div className="text-center font-bold text-xs">{(clientActivationData?.businessName || 'PILIN Clean & Care').toUpperCase()}</div>
                      <div className="text-center text-[9px] text-slate-600">{tenantAddress || 'Jl. Raya Utama No. 88, Jakarta'}</div>
                      <div className="text-center text-[9px] text-slate-600">Telp/WA: {clientActivationData?.phone || '081234567890'}</div>
                      <div className="text-center text-[9px] my-1">=======================</div>
                      <div className="flex justify-between"><span>ID Nota:</span><span className="font-bold">{lastTransaction.id}</span></div>
                      <div className="flex justify-between"><span>ID Cabang:</span><span className="font-bold">{lastTransaction.branch_name || 'Cabang Utama'}</span></div>
                      <div className="flex justify-between"><span>Tgl Nota:</span><span>{lastTransaction.timestamp}</span></div>
                      <div className="flex justify-between"><span>Tgl Selesai:</span><span className="font-bold">{lastTransaction.completion_date || 'Est. 2 Hari'}</span></div>
                      <div className="flex justify-between"><span>Kasir:</span><span>{lastTransaction.cashier_name}</span></div>
                      <div className="flex justify-between"><span>Pelanggan:</span><span className="font-bold">{lastTransaction.customer_name}</span></div>
                      <div className="flex justify-between"><span>Metode:</span><span>{lastTransaction.method.toUpperCase()}</span></div>
                      <div className="border-t border-dashed border-slate-800 my-1.5"></div>
                      <div className="text-[10px] font-bold text-slate-800 border-b border-slate-300 pb-0.5 mb-1">RINCIAN LAYANAN &amp; RETAIL:</div>
                      {lastTransaction.items && lastTransaction.items.length > 0 ? (
                        lastTransaction.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] text-slate-800 py-0.5">
                            <span className="truncate pr-2">{item.nama} ({item.qty}x)</span>
                            <span className="font-bold shrink-0">Rp {(item.qty * item.unit_price).toLocaleString('id-ID')}</span>
                          </div>
                        ))
                      ) : null}

                      <div className="border-t border-dashed border-slate-800 my-1.5"></div>
                      <div className="flex justify-between font-bold"><span>Subtotal:</span><span>Rp {lastTransaction.subtotal.toLocaleString('id-ID')}</span></div>
                      {lastTransaction.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Diskon:</span><span>-Rp {lastTransaction.discount.toLocaleString('id-ID')}</span></div>}
                      <div className="border-t-2 border-slate-950 my-1.5"></div>
                      <div className="flex justify-between font-bold text-xs"><span>TOTAL BIAYA:</span><span>Rp {lastTransaction.total.toLocaleString('id-ID')}</span></div>
                      {lastTransaction.dp_paid > 0 && <div className="flex justify-between"><span>DP Paid:</span><span>Rp {lastTransaction.dp_paid.toLocaleString('id-ID')}</span></div>}
                      {lastTransaction.remaining_balance > 0 && <div className="flex justify-between font-bold text-rose-700"><span>SISA BAYAR:</span><span>Rp {lastTransaction.remaining_balance.toLocaleString('id-ID')}</span></div>}
                      <div className="flex justify-between mt-1"><span className="text-[10px] text-slate-600">STATUS:</span><span className="font-bold">{lastTransaction.payment_status}</span></div>
                      <div className="border-t border-dashed border-slate-800 my-1.5"></div>
                      <div className="text-[9px] font-bold text-slate-900 mb-0.5">SYARAT &amp; KETENTUAN:</div>
                      <div className="text-[8px] text-slate-700 leading-tight space-y-0.5">
                        {tenantTerms.split('\n').map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                      </div>
                      <div className="border-t border-dashed border-slate-800 my-1.5"></div>
                      <div className="text-center text-[9px] text-slate-600 mt-1">Terima kasih atas kunjungan Anda!</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-3 flex-wrap gap-2">
                    <span className="text-xs text-slate-400">Total Tagihan Final: <strong className="text-emerald-400 text-base ml-2">Rp {lastTransaction.total.toLocaleString('id-ID')}</strong></span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleRequestVoidTransaction(lastTransaction.id, lastTransaction.total, lastTransaction.customer_name)}
                        className="px-3 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-xl transition-all"
                      >
                        ⚠️ Void Nota
                      </button>

                      <button
                        type="button"
                        onClick={handleSendNotaViaWhatsApp}
                        className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg flex items-center space-x-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>📲 Kirim via WhatsApp (wa.me)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrintNota58mm}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>🖨️ Cetak Struk (Thermal 58mm)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PENDING GAMIFICATION MANDATE NOTIFICATION CARD FOR CASHIER */}
              {pendingGamificationMandates.filter(m => m.status === 'PENDING_CASHIER_SEND').length > 0 && (
                <div className="bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border-2 border-blue-500/60 rounded-2xl p-5 space-y-3 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between border-b border-blue-500/30 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold font-mono bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-500/40">
                          📩 MANDAT PENGIRIMAN WA GAMIFIKASI DARI KEPALA CABANG
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          Kepala Cabang Meminta Kasir Mengirimkan WA Progress Gamifikasi
                        </h4>
                      </div>
                    </div>
                    <span className="text-xs text-blue-300 font-mono font-bold">
                      {pendingGamificationMandates.filter(m => m.status === 'PENDING_CASHIER_SEND').length} Mandat Pending
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {pendingGamificationMandates.filter(m => m.status === 'PENDING_CASHIER_SEND').map((mnd) => (
                      <div key={mnd.id} className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/40 flex items-center justify-between text-xs">
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-sm">{mnd.customer_name}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                              {mnd.milestone} Progress
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Pemberi Mandat: {mnd.requested_by}</span>
                          </div>
                          <p className="text-slate-300 text-xs italic bg-slate-900 p-2 rounded border border-slate-800">
                            "{mnd.message}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCashierExecuteGamificationWa(mnd.id)}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all shrink-0 flex items-center space-x-1.5 ml-4"
                        >
                          <span>📤 OK, Submit &amp; Kirim Pesan WA Sekarang</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 1: PILIH KONSUMEN ATAU REKAM KONSUMEN BARU */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-white text-sm">1. Pilih Konsumen Transaksi</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPosQuickReg(!showPosQuickReg)}
                    className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-bold transition-all"
                  >
                    {showPosQuickReg ? 'Batal Tambah' : '+ Tambah Konsumen Baru'}
                  </button>
                </div>

                {/* Inline Quick Customer Registration Form */}
                {showPosQuickReg ? (
                  <form onSubmit={handleRegisterCustomer} className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-3 animate-fadeIn">
                    <p className="text-xs font-bold text-blue-300 flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Registrasi Konsumen Baru (Sistem Normalisasi Otomatis)</span>
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">Nama Konsumen *</label>
                        <input
                          type="text"
                          required
                          value={newCustNama}
                          onChange={(e) => setNewCustNama(e.target.value)}
                          placeholder="Nama lengkap"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 font-semibold block mb-1">Nomor HP *</label>
                        <input
                          type="text"
                          required
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="0812..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
                        >
                          Simpan & Pilih Konsumen
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-8">
                      <select
                        value={selectedPosCustomerId}
                        onChange={(e) => setSelectedPosCustomerId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                      >
                        {customerList.map((c) => (
                          <option key={c.id} value={c.id}>
                            👤 {c.nama} — HP: {c.no_hp_normalized || c.no_hp} ({c.email || 'Tanpa Email'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                      {(() => {
                        const sel = customerList.find(c => c.id === selectedPosCustomerId);
                        return sel ? (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white truncate">{sel.nama}</span>
                            <span className="font-mono text-emerald-400 text-[11px] px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                              {sel.no_hp_normalized || 'Kanonikal'}
                            </span>
                          </div>
                        ) : <span className="text-slate-500">Pilih konsumen...</span>;
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2 & 3: KATALOG LAYANAN & KERANJANG DENGAN FOTO BUKTI / TRACEABILITY */}
              <div className="grid grid-cols-12 gap-6">
                {/* Product Catalog Grid (Left 6 Cols) */}
                <div className="col-span-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>2. Pilih Layanan / Produk (Katalog Standar Schema 00007)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                    {posCatalog.map((item) => (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all">
                        <div>
                          <span className="text-[10px] uppercase font-bold font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {item.sku}
                          </span>
                          <h4 className="font-bold text-white text-sm mt-2">{item.nama}</h4>
                          <p className="text-emerald-400 font-bold text-sm mt-1">Rp {item.base_harga.toLocaleString('id-ID')}</p>
                        </div>
                        <button
                          disabled={!isAuthorizedPosCashier}
                          onClick={() => {
                            if (!isAuthorizedPosCashier) {
                              alert('⛔ Input Nota Transaksi POS hanya diizinkan untuk Admin / Owner dan Kasir POS Utama.');
                              return;
                            }
                            addToCart({ id: item.id, nama: item.nama, unit_price: item.base_harga });
                          }}
                          className={`mt-4 w-full py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-1 ${
                            !isAuthorizedPosCashier
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                              : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30'
                          }`}
                        >
                          <span>{isAuthorizedPosCashier ? '+ Tambah Ke Keranjang' : '🔒 Khusus Kasir & Admin'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cart & Traceability Items Details (Right 6 Cols) */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="font-bold text-white text-sm">3. Keranjang & Lampiran Foto Bukti Barang</h3>
                      <span className="text-xs text-slate-400 font-bold">{cart.reduce((s, i) => s + i.qty, 0)} Item Dipilih</span>
                    </div>

                    {/* Cart Items List */}
                    {cart.length === 0 ? (
                      <div className="py-12 text-center text-slate-500">
                        <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">Keranjang masih kosong.</p>
                        <p className="text-[11px] text-slate-600 mt-1">Pilih layanan di sebelah kiri untuk menambah pesanan.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {cart.map((item) => (
                          <div key={item.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">{item.nama}</span>
                                <span className="text-emerald-400 font-bold">Rp {item.unit_price.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold"
                                >
                                  -
                                </button>
                                <span className="font-bold text-white w-4 text-center">{item.qty}</span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="ml-2 text-rose-400 hover:text-rose-300 font-bold text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            {/* Item Notes / Keterangan Barang */}
                            <div>
                              <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Catatan / Keterangan Kondisi Barang:</label>
                              <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => updateCartItemNotes(item.id, e.target.value)}
                                placeholder="Keterangan barang (misal: warna putih, noda di tumit)..."
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* MASTER TRANSACTION COMBINED PHOTO BOX (1 FOTO COMBINED SEKALIGUS UNTUK SATU NOTA) */}
                    {cart.length > 0 && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-blue-500/40 space-y-2 text-xs shadow-md">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-blue-300 font-bold flex items-center space-x-1">
                            <Camera className="w-3.5 h-3.5 text-blue-400" />
                            <span>📷 Lampiran 1 Foto Fisik Barang Transaksi (Gabungan Seluruh Item):</span>
                          </label>
                          {posMasterPhotoUrl && (
                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                              ✓ Foto Terlampir
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-400">
                          Sesuai instruksi: Seluruh item jasa &amp; retail pada transaksi ini difoto bersamaan dalam <strong>1 foto fisik barang combined</strong>.
                        </p>

                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={posMasterPhotoUrl}
                            onChange={(e) => setPosMasterPhotoUrl(e.target.value)}
                            placeholder="Input Link / URL 1 Foto Fisik Barang Combined (misal: https://...)"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setPosMasterPhotoUrl('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400')}
                            className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold rounded-lg transition-all flex items-center space-x-1 shrink-0"
                          >
                            <span>+ Sample Foto Combined</span>
                          </button>
                        </div>

                        {/* Master Photo Preview */}
                        {posMasterPhotoUrl && (
                          <div className="flex items-center space-x-3 pt-2 border-t border-slate-800">
                            <img
                              src={posMasterPhotoUrl}
                              alt="Foto Bukti Fisik Barang Combined"
                              className="w-14 h-14 object-cover rounded-lg border-2 border-emerald-500/60 shadow-md shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <div>
                              <p className="text-[11px] font-bold text-emerald-300">✓ 1 Foto Fisik Barang Combined Ready</p>
                              <p className="text-[10px] text-slate-400">Foto ini akan tercetak &amp; tersimpan pada Struk Nota POS resmi.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Summary, GD-05 Manual Discount (Max 10%), Manual DP & Checkout */}
                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    {/* MANUAL DISCOUNT FIELD (GD-05 Enforcement: Kasir Max 10%, > 10% Needs ACC Manager/Owner) */}
                    <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center space-x-1">
                          <span>🏷️</span>
                          <span>Diskon Manual Kasir (Nominal / Persen):</span>
                        </span>
                        <span className="text-amber-400 font-bold font-mono text-[11px]">
                          {posDiscountType === 'PERCENT'
                            ? `${posDiscountValue}% (- Rp ${getManualDiscountAmount(cart.reduce((s, i) => s + i.qty * i.unit_price, 0)).toLocaleString('id-ID')})`
                            : `- Rp ${posDiscountValue.toLocaleString('id-ID')}`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Toggle Unit: % vs Rp */}
                        <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => handleManualDiscountChange(posDiscountValue, 'PERCENT')}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              posDiscountType === 'PERCENT'
                                ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            % Persen
                          </button>
                          <button
                            type="button"
                            onClick={() => handleManualDiscountChange(posDiscountValue, 'RUPIAH')}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              posDiscountType === 'RUPIAH'
                                ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Rp Rupiah
                          </button>
                        </div>

                        {/* Manual Input Field */}
                        <input
                          type="number"
                          min="0"
                          value={posDiscountValue === 0 ? '' : posDiscountValue}
                          onChange={(e) => handleManualDiscountChange(parseFloat(e.target.value) || 0, posDiscountType)}
                          placeholder={posDiscountType === 'PERCENT' ? 'Ketik % Diskon (misal: 10)' : 'Ketik Nominal Rp (misal: 15000)'}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold font-mono"
                        />
                      </div>

                      {posDiscountNotice && (
                        <p className={`text-[11px] p-2 rounded border font-semibold ${
                          requireManagerAuth
                            ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                            : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                        }`}>
                          {posDiscountNotice}
                        </p>
                      )}

                      {/* Manager ACC PIN Field if > 10% */}
                      {requireManagerAuth && (
                        <div className="bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30 space-y-1.5 animate-fadeIn">
                          <label className="text-[11px] font-bold text-rose-300 block">
                            🔒 PIN ACC Otorisasi Manager / Owner (Diskon &gt; 10% - Rule GD-05):
                          </label>
                          <input
                            type="password"
                            value={managerPinInput}
                            onChange={(e) => setManagerPinInput(e.target.value)}
                            placeholder="Masukkan PIN ACC Manager (misal: 1234 atau 8888)"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* MANUAL DOWN PAYMENT (DP / UANG MUKA) INPUT */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-300 flex items-center space-x-1">
                          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                          <span>Input DP / Uang Muka (Diisi Manual Nominal Rp):</span>
                        </span>
                        <span className="text-amber-400 font-mono font-bold text-[11px]">
                          Rp {(parseFloat(posDpInput) || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      {/* CLEAN DP BUTTONS */}
                      {(() => {
                        const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
                        const voucherDiscount = appliedPosPromo?.discountAmount || 0;
                        const manualDiscount = getManualDiscountAmount(subtotal);
                        const total = Math.max(0, subtotal - (voucherDiscount + manualDiscount));

                        return (
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => setPosDpInput(total.toString())}
                              className="flex-1 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold rounded-lg border border-emerald-500/40 shadow-sm transition-all flex items-center justify-center space-x-1"
                            >
                              <span>💵 Set Bayar Lunas Full</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPosDpInput('0')}
                              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold rounded-lg border border-slate-700 transition-all"
                            >
                              Reset DP
                            </button>
                          </div>
                        );
                      })()}

                      <input
                        type="number"
                        min="0"
                        value={posDpInput}
                        onChange={(e) => setPosDpInput(e.target.value)}
                        placeholder="Input Nominal DP (Uang Muka) Manual dalam Rupiah..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    {/* Voucher Promo Input */}
                    <form onSubmit={handleApplyPosPromo} className="flex space-x-2 pt-0.5">
                      <input
                        type="text"
                        value={posPromoInput}
                        onChange={(e) => setPosPromoInput(e.target.value)}
                        placeholder="Voucher Promo (misal: GAJIAN10)"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={cart.length === 0}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Pasang
                      </button>
                    </form>

                    {appliedPosPromo && (
                      <div className={`p-2 rounded text-[11px] border ${
                        appliedPosPromo.discountAmount > 0
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                      }`}>
                        {appliedPosPromo.message}
                      </div>
                    )}

                    {/* Calculation Summary with DP & Remaining Balance */}
                    {(() => {
                      const subtotal = cart.reduce((s, i) => s + i.qty * i.unit_price, 0);
                      const voucherDiscount = appliedPosPromo?.discountAmount || 0;
                      const manualDiscount = getManualDiscountAmount(subtotal);
                      const totalDiscount = voucherDiscount + manualDiscount;
                      const total = Math.max(0, subtotal - totalDiscount);
                      const dpPaid = Math.min(total, parseFloat(posDpInput) || 0);
                      const remainingBalance = Math.max(0, total - dpPaid);
                      const paymentStatus = (dpPaid >= total || dpPaid === 0) ? 'LUNAS' : 'DP / PENDING PELUNASAN';

                      return (
                        <div className="space-y-1 text-xs pt-1 border-t border-slate-800">
                          <div className="flex justify-between text-slate-400">
                            <span>Subtotal</span>
                            <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                          </div>
                          {totalDiscount > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Total Diskon (GD-05 + Voucher)</span>
                              <span className="text-emerald-400 font-bold">- Rp {totalDiscount.toLocaleString('id-ID')}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold text-white pt-1">
                            <span>Total Pembayaran</span>
                            <span className="text-emerald-400">Rp {total.toLocaleString('id-ID')}</span>
                          </div>

                          {dpPaid > 0 && (
                            <>
                              <div className="flex justify-between text-amber-400 font-semibold pt-1 border-t border-slate-800/80">
                                <span>DP (Uang Muka Dibayar)</span>
                                <span>Rp {dpPaid.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-rose-400 font-bold">
                                <span>Sisa Pelunasan</span>
                                <span>Rp {remainingBalance.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-400">
                                <span>Status Transaksi</span>
                                <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/30">
                                  {paymentStatus}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Payment Method Selector */}
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">Metode Pembayaran (Schema 00008)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['cash', 'transfer'] as const).map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaymentMethod(m)}
                            className={`py-1.5 rounded text-[11px] font-bold border transition-all ${
                              paymentMethod === m
                                ? 'bg-blue-600 text-white border-blue-500 shadow'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {m.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={cart.length === 0 || !isAuthorizedPosCashier}
                      className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all ${
                        !isAuthorizedPosCashier
                          ? 'bg-rose-950 text-rose-400 cursor-not-allowed border border-rose-800/80 font-mono'
                          : cart.length > 0
                            ? 'bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white shadow-blue-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      }`}
                    >
                      {!isAuthorizedPosCashier
                        ? '🔒 OTORISASI TERBATAS (HANYA ADMIN & KASIR)'
                        : 'PROSES TRANSAKSI POS & CETAK STRUK NOTA'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LAYANAN & PENGERJAAN SPK WORKFLOW SURFACE (BOUND 100% TO POS NOTA) */}
          {activeTab === 'work' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Alur Kerja Pengerjaan SPK</h2>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowLifecycleConfig(!showLifecycleConfig)}
                    className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold rounded-xl transition-all"
                  >
                    {showLifecycleConfig ? 'Tutup Pengaturan' : '⚙️ Kustomisasi Tahapan Lifecycle Tenant'}
                  </button>
                </div>
              </div>

              {/* TENANT CUSTOM LIFECYCLE CONFIGURATION PANEL */}
              {showLifecycleConfig && (
                <form onSubmit={handleAddCustomStage} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Pengaturan Alur Lifecycle Operasional Tenant</span>
                    </h3>
                    <span className="text-xs text-slate-400">Tahapan Aktif: {tenantLifecycleStages.length} Step</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tenant dapat menambah atau mengostumisasi tahapan alur pengerjaan sesuai kebutuhan jenis usaha (*misal: WASHING, REPAINTING, DRYING, QC, FINISHED*).
                  </p>

                  <div className="flex items-center space-x-3">
                    <input
                      type="text"
                      required
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Input Nama Tahapan Baru (misal: DRYING / FINISHED / REPAINTING)..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-bold focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-all"
                    >
                      + Tambah Tahapan Lifecycle Baru
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                    <span className="text-xs text-slate-400 block w-full mb-1">Tahapan Lifecycle Terpasang:</span>
                    {tenantLifecycleStages.map((stg, idx) => (
                      <span key={stg.id} className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-slate-800 text-amber-300 border border-slate-700 flex items-center space-x-1.5">
                        <span className="text-slate-500">{idx + 1}.</span>
                        <span>{stg.label}</span>
                      </span>
                    ))}
                  </div>
                </form>
              )}

              {/* GOVERNANCE RULE NOTICE BOX */}
              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 flex items-start space-x-3 text-xs">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-300">Aturan Governance Pengerjaan SPK PILIN BOS:</h4>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Sesuai instruksi Owner: Layanan pada SPK <strong>terikat 100% pada Nota POS yang dibuat di kasir</strong>. Pilihan layanan di luar nota ditutup secara otomatis untuk mencegah manipulasi. Menu ini murni berfungsi sebagai <strong>alur kerja operasional real-time</strong> (memantau Siapa yang Memproses & Apa yang Sedang Diproses) agar progress pengerjaan transparan dan terawasi di Dashboard Kepala Cabang (Tier 2) dan Dashboard Owner (Tier 3).
                  </p>
                </div>
              </div>

              {/* SPK SUMMARY COUNTERS & VISUAL GRAFIK PRODUKTIVITAS PEGAWAI */}
              {(() => {
                const orders = WorkQueueService.getOrders(selectedBranchId);
                const totalOrders = orders.length || 1;
                const countReceived = orders.filter(o => o.status === 'RECEIVED').length;
                const countInProgress = orders.filter(o => o.status === 'IN_PROGRESS').length;
                const countQc = orders.filter(o => o.status === 'QC').length;
                const countFinished = orders.filter(o => (o.status as string) === 'FINISHED' || (o.status as string) === 'COMPLETED' || o.status === 'READY_FOR_PICKUP').length;
                const completionPct = Math.round((countFinished / totalOrders) * 100);

                return (
                  <div className="space-y-4">
                    {/* VISUAL GRAFIK PRODUKTIVITAS PEGAWAI WIDGET */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span>Grafik Visual Produktivitas Pengerjaan Pegawai & Status Progress</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Kinerja Real-Time SPK Selesai (100% Finished) vs SPK Dalam Pengerjaan Operasional
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-semibold">Tingkat Penyelesaian Selesai:</span>
                          <span className="text-xl font-bold font-mono text-emerald-400">{completionPct}% Selesai (100%)</span>
                        </div>
                      </div>

                      {/* STACKED BAR CHART VISUAL */}
                      <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 p-0.5">
                        <div
                          style={{ width: `${(countFinished / totalOrders) * 100}%` }}
                          className="h-full bg-emerald-500 transition-all duration-500 rounded-l"
                          title={`Finished: ${countFinished} SPK`}
                        />
                        <div
                          style={{ width: `${(countQc / totalOrders) * 100}%` }}
                          className="h-full bg-purple-500 transition-all duration-500"
                          title={`QC: ${countQc} SPK`}
                        />
                        <div
                          style={{ width: `${(countInProgress / totalOrders) * 100}%` }}
                          className="h-full bg-blue-500 transition-all duration-500"
                          title={`In Progress: ${countInProgress} SPK`}
                        />
                        <div
                          style={{ width: `${(countReceived / totalOrders) * 100}%` }}
                          className="h-full bg-amber-500 transition-all duration-500 rounded-r"
                          title={`Received: ${countReceived} SPK`}
                        />
                      </div>

                      {/* GRAFIK LEGEND */}
                      <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
                        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                          <div>
                            <span className="text-slate-300 font-bold block">100% FINISHED: {countFinished} SPK</span>
                            <span className="text-slate-500 text-[10px]">Pengerjaan Selesai</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800">
                          <div className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></div>
                          <div>
                            <span className="text-slate-300 font-bold block">75% INSPEKSI QC: {countQc} SPK</span>
                            <span className="text-slate-500 text-[10px]">Inspeksi Mutu</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800">
                          <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                          <div>
                            <span className="text-slate-300 font-bold block">50% IN PROGRESS: {countInProgress} SPK</span>
                            <span className="text-slate-500 text-[10px]">Proses Pengerjaan</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded border border-slate-800">
                          <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div>
                          <div>
                            <span className="text-slate-300 font-bold block">25% DITERIMA: {countReceived} SPK</span>
                            <span className="text-slate-500 text-[10px]">Antrean Masuk</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* WORK ORDERS LIST TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>Daftar SPK Pengerjaan (Alur Kerja Real-Time Tenant)</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold">
                    Terhubung Langsung ke Nota Transaksi POS Kasir ({WorkQueueService.getOrders(selectedBranchId).length} SPK Aktif)
                  </span>
                </div>

                <div className="space-y-4">
                  {WorkQueueService.getOrders(selectedBranchId).map((order) => {
                    const isCompletedStage = (order.status as string) === 'FINISHED' || (order.status as string) === 'COMPLETED' || order.status === 'READY_FOR_PICKUP';
                    const stageIndex = isCompletedStage
                      ? tenantLifecycleStages.length - 1
                      : Math.max(0, tenantLifecycleStages.findIndex(s => s.code === order.status));

                    const progressPct = isCompletedStage
                      ? 100
                      : Math.round(((stageIndex + 1) / tenantLifecycleStages.length) * 100);

                    return (
                      <div key={order.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                        <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-500/30">
                                {order.order_number}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                Terikat Nota POS
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-sm mt-1">{order.customer_name}</h4>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-400 text-[11px] block">SLA Elapsed Time:</span>
                            <span className={`font-mono font-bold ${order.elapsed_minutes > order.target_minutes ? 'text-rose-400' : 'text-amber-300'}`}>
                              {order.elapsed_minutes} m / Target {order.target_minutes} m
                            </span>
                          </div>
                        </div>

                        {/* LAYANAN DAN TEKNISI PROSES */}
                        <div className="grid grid-cols-12 gap-4 bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <div className="col-span-7 space-y-1">
                            <span className="text-slate-400 text-[11px] font-semibold block">📦 Layanan & Unit Terikat Nota POS:</span>
                            <p className="text-amber-300 font-bold text-xs">{order.service_name}</p>
                          </div>

                          <div className="col-span-5 space-y-1">
                            <span className="text-slate-400 text-[11px] font-semibold block">👷 Operator Staf/Teknisi Active Stage:</span>
                            <div className="flex items-center space-x-2">
                              <input
                                type="text"
                                defaultValue={order.worker_name}
                                onBlur={(e) => {
                                  order.worker_name = e.target.value || 'Staf Operator';
                                }}
                                placeholder="Nama Teknisi / Operator..."
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* DYNAMIC PROGRESS PERCENTAGE BAR (0% - 100%) */}
                        <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                          <div className="flex justify-between items-center text-[11px] font-bold">
                            <span className="text-slate-300">Progress Pengerjaan Lifecycle:</span>
                            <span className={progressPct === 100 ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                              {progressPct === 100 ? '✓ 100% SELESAI (FINISHED)' : `⏳ ${progressPct}% DIPROSES`}
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                progressPct === 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : 'bg-gradient-to-r from-amber-500 via-blue-500 to-purple-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* MULTI-WORKER TIMELINE ACTIVITY LOG (SIAPA MEMPROSES APA) */}
                        {order.activity_log && order.activity_log.length > 0 && (
                          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5">
                            <span className="text-slate-400 font-semibold block text-[11px]">
                              📜 Audit Trail Riwayat Pengerjaan Staf (Siapa yang Memproses Apa):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {order.activity_log.map((log) => (
                                <span key={log.id} className="px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px] flex items-center space-x-1">
                                  <strong className="text-amber-400 font-mono">{log.stage_code}</strong>
                                  <span className="text-slate-500">by</span>
                                  <strong className="text-emerald-300">{log.worker_name}</strong>
                                  <span className="text-slate-500">({log.timestamp})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* STATUS PROGRESS LIFECYCLE & QC GATE INSPECTION */}
                        <div className="flex items-center justify-between pt-1 text-xs flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-semibold">Pilih Tahapan Lifecycle:</span>
                            <div className="flex flex-wrap gap-1">
                              {tenantLifecycleStages.map((stg) => {
                                const isCurrent = order.status === stg.code || (stg.code === 'FINISHED' && (order.status as string) === 'COMPLETED');

                                return (
                                  <button
                                    key={stg.id}
                                    type="button"
                                    onClick={() => {
                                      const targetCode = stg.code === 'FINISHED' ? 'COMPLETED' : stg.code;
                                      WorkQueueService.updateOrderStatus(order.id, targetCode as any, order.worker_name);
                                      setWorkOrders(WorkQueueService.getOrders());
                                    }}
                                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                                      isCurrent
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                                    }`}
                                  >
                                    {stg.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* QC GATE TOGGLE */}
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-semibold">Hasil QC Gate:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextQc = order.qc_status === 'PASSED' ? 'FAILED' : 'PASSED';
                                WorkQueueService.updateOrderQC(order.id, nextQc);
                                setWorkOrders(WorkQueueService.getOrders());
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono border transition-all ${
                                order.qc_status === 'PASSED'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                  : 'bg-rose-950 text-rose-300 border-rose-500/40'
                              }`}
                            >
                              QC {order.qc_status}
                            </button>
                          </div>
                        </div>

                        {/* AKSI CEPAT SPK PEGAWAI: HANYA TOMBOL KIRIM WA DAN CETAK STRUK 58MM */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-900">
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">Aksi Nota Kasir &amp; WA:</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleSendNotaViaWhatsApp}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1 transition-all"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>📲 Kirim WA</span>
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintNota58mm}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow flex items-center space-x-1 transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>🖨️ Cetak</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* KINERJA & GAMIFIKASI PEGAWAI (DASHBOARD KEPALA CABANG INPUT PROPOSAL -> ACC APPROVAL BY OWNER & PRIVASI KINERJA ANTAR CABANG) */}
          {activeTab === 'gmf' && (
            <div className="space-y-6 animate-fadeIn">
              {/* HEADER BANNER */}
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Gamifikasi & Program Loyalitas Pegawai</h2>
                  </div>
                </div>

                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">Role Aktif:</span>
                  <span className="text-amber-400 font-bold">
                    {activeRole === 'KEPALA_CABANG' ? 'KEPALA CABANG (PENGUSUL)' : activeRole === 'OWNER' ? '👑 OWNER (PEMEGANG OTORISASI ACC)' : 'PEGAWAI'}
                  </span>
                </div>
              </div>

              {gmfBannerMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-200">{gmfBannerMsg}</p>
                  </div>
                  <button onClick={() => setGmfBannerMsg(null)} className="text-xs font-bold text-emerald-400 hover:text-emerald-200 underline">
                    Tutup
                  </button>
                </div>
              )}

              {/* FORM INPUT PROPOSAL GAME, POINT, & REWARD (BISA DI-INPUT KEPALA CABANG & OWNER) */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Input Proposal Jenis Game, Point, & Reward</span>
                    </h3>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                      {activeRole === 'KEPALA_CABANG' ? 'PENGAJUAN KEPALA CABANG' : 'OTORISASI OWNER'}
                    </span>
                  </div>

                  <form onSubmit={handleAddGamificationProposal} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Nama Jenis Game / Kompetisi *</label>
                      <input
                        type="text"
                        required
                        value={newGameTitle}
                        onChange={(e) => setNewGameTitle(e.target.value)}
                        placeholder="Contoh: Sprint SPK Terbanyak Mingguan..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Target Poin Kompetisi *</label>
                      <input
                        type="number"
                        required
                        min="10"
                        value={newGamePoints}
                        onChange={(e) => setNewGamePoints(e.target.value)}
                        placeholder="Contoh: 500 Poin (50 SPK Finished)..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Bentuk Hadiah / Reward Pegawai *</label>
                      <input
                        type="text"
                        required
                        value={newGameReward}
                        onChange={(e) => setNewGameReward(e.target.value)}
                        placeholder="Contoh: Bonus Cash Rp 250.000 + Voucher Belanja..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <p className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                        <span>🔒 Alur Governance Reward:</span>
                      </p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {activeRole === 'KEPALA_CABANG'
                          ? 'Kepala Cabang mengajukan proposal game & reward. Proposal tersimpan dengan status PENDING sampai disetujui (Approved) resmi oleh Owner.'
                          : 'Owner dapat langsung membuat & menyetujui (Approve) game & reward untuk staf pegawai.'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition-all mt-2"
                    >
                      {activeRole === 'KEPALA_CABANG' ? '✉️ AJUKAN PROPOSAL REWARD KE OWNER' : '⚡ BUAT & APPROVE GAME REWARD'}
                    </button>
                  </form>
                </div>

                {/* DAFTAR PROPOSAL GAME REWARD & OTORISASI ACC OWNER */}
                <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>Daftar Proposal Game & Reward Kompetisi Staf</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {gamificationProposals.length} Game Terdaftar
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {gamificationProposals.map((prop) => (
                      <div key={prop.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                        <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-amber-400 text-[11px]">{prop.id}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                prop.status === 'APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {prop.status === 'APPROVED' ? '✓ APPROVED BY OWNER' : '⏳ PENDING OWNER APPROVAL'}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-sm mt-1">{prop.game_title}</h4>
                            <p className="text-slate-400 text-[11px] mt-0.5">
                              Pengusul: <strong className="text-slate-200">{prop.proposed_by}</strong> | Dibuat: <span className="font-mono text-slate-500">{prop.created_at}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-semibold">Target Poin:</span>
                            <span className="text-base font-bold font-mono text-amber-400">{prop.target_points} Pts</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-semibold">🎁 Hadiah / Reward Pegawai:</span>
                            <span className="text-emerald-400 font-bold text-xs">{prop.reward_description}</span>
                          </div>

                          {/* OTORISASI SETUJUI REWARD KHUSUS ROLE OWNER */}
                          {prop.status === 'PENDING_APPROVAL' && (
                            <div>
                              {activeRole === 'OWNER' ? (
                                <button
                                  onClick={() => handleApproveGamificationProposal(prop.id)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow text-xs transition-all flex items-center space-x-1"
                                >
                                  <span>✓ SETUJUI (ACC REWARD)</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-amber-400 italic bg-amber-950/60 px-2.5 py-1 rounded border border-amber-500/30 font-semibold">
                                  ⏳ Menunggu ACC Owner
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* PRIVASI KINERJA ANTAR CABANG (HANYA OWNER YANG BISA MALIHAT PERBANDINGAN CABANG) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm">Kinerja & Leaderboard Antar Cabang (Multi-Branch Analytics)</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Privasi Kinerja: Perbandingan Omzet & Produktivitas Antar Cabang Bersifat Rahasia Eksekutif.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950 px-2.5 py-1 rounded border border-blue-500/40">
                    PRIVACY CONTROL ENABLED
                  </span>
                </div>

                {activeRole !== 'OWNER' ? (
                  <div className="bg-slate-950 p-6 rounded-xl border border-blue-500/30 text-center space-y-2 animate-fadeIn">
                    <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Kinerja Antar Cabang Diberlakukan Privasi (Read-Only Cabang Sendiri)</h4>
                    <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                      Sesuai aturan eksekutif: <strong>Kinerja cabang lain tidak diperlihatkan ke Kepala Cabang lain</strong> untuk menjaga fokus dan privasi antar cabang. <strong>Hanya Owner yang dapat melihat seluruh perbandingan cabang.</strong>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-amber-300 font-bold flex items-center space-x-1">
                        <span>👑 PRIVILEGE OWNER: Tampilan Perbandingan Kinerja Antar Cabang Perusahaan</span>
                      </span>
                      <span className="text-slate-400 text-[10px]">Confidential Multi-Branch Metrics</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">1. Cabang Utama (Jakarta)</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">RANK #1</span>
                        </div>
                        <p className="text-2xl font-bold font-mono text-emerald-400">Rp 4.120.000</p>
                        <p className="text-[11px] text-slate-400">Total SPK: 15 Finished | Driver: Agus Wijaya</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">2. Cabang Bandung Site</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">RANK #2</span>
                        </div>
                        <p className="text-2xl font-bold font-mono text-blue-400">Rp 3.850.000</p>
                        <p className="text-[11px] text-slate-400">Total SPK: 12 Finished | Driver: Rina Melati</p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">3. Cabang Surabaya Site</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300">RANK #3</span>
                        </div>
                        <p className="text-2xl font-bold font-mono text-purple-400">Rp 3.200.000</p>
                        <p className="text-[11px] text-slate-400">Total SPK: 10 Finished | Driver: Budi Santoso</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRESENSI & FOTO SELFI ABSEN (DASHBOARD PEGAWAI & KEPALA CABANG) */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Presensi Foto Selfie Kamera</h2>
                  </div>
                </div>

                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">Waktu Presensi Server:</span>
                  <span className="text-purple-300 font-mono font-bold">
                    📅 {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} | 🕒 {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {attSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-200">{attSuccessMsg}</p>
                  </div>
                  <button onClick={() => setAttSuccessMsg(null)} className="text-xs text-emerald-400 hover:text-emerald-200 underline">
                    Tutup
                  </button>
                </div>
              )}

              <div className="grid grid-cols-12 gap-6">
                {/* FORM PRESENSI KAMERA LANGSUNG & ENGINE WATERMARK PIHAK KE-3 (ZERO TYPING) */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-purple-400" />
                        <span>Presensi Foto Selfie Kamera</span>
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                      AUTO-STAMP GPS ACTIVE
                    </span>
                  </div>

                  {/* TIPE PRESENSI (MASUK / KELUAR / IZIN) */}
                  <div className="space-y-1 text-xs">
                    <label className="text-slate-300 font-bold block">Pilih Status Presensi Harian *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['MASUK', 'KELUAR', 'IZIN'] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAttInputType(t)}
                          className={`py-2 rounded-xl font-bold border transition-all text-xs flex items-center justify-center space-x-1 ${
                            attInputType === t
                              ? t === 'MASUK' ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                                : t === 'KELUAR' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20'
                                : 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/20'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          <span>{t === 'MASUK' ? '🟢' : t === 'KELUAR' ? '🔵' : '🟡'}</span>
                          <span>PRESENSI {t}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AUTO-DETECTED IDENTITY & GEOLOCATION HUD DATA */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-purple-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400 text-[11px]">Identitas Terdeteksi:</span>
                      <strong className="text-white font-bold">{activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya (Kepala Cabang)' : 'Rina Melati (Kasir Utama)'}</strong>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-400 text-[11px]">📍 Geolocation GPS (Pihak Ke-3):</span>
                      <strong className="text-emerald-400 font-mono text-[11px]">Lat: -6.2088, Long: 106.8456 (Cabang Utama Jakarta)</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">⏰ Waktu Real-Time (NTP Clock):</span>
                      <strong className="text-amber-300 font-mono text-[11px]">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </strong>
                    </div>
                  </div>

                  {/* UPLOAD / AMBIL FOTO SELFIE WITH AUTO-COMPRESSION */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="cursor-pointer px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 text-[11px] font-bold rounded-lg border border-purple-500/40 flex items-center space-x-1.5 transition-all shadow">
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span>📸 Ambil / Upload Foto Selfie (Auto-Compress)</span>
                      <input type="file" accept="image/*" capture="user" onChange={handleAttendanceFileUpload} className="hidden" />
                    </label>

                    {attInputPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAttInputPhotoUrl('');
                          setAttCompressionInfo(null);
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 underline"
                      >
                        Reset Foto
                      </button>
                    )}
                  </div>

                  {attCompressionInfo && (
                    <div className="bg-purple-950/70 border border-purple-500/40 rounded-lg p-2 text-[10px] text-purple-300 font-mono flex items-center space-x-1.5 animate-fadeIn">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>{attCompressionInfo}</span>
                    </div>
                  )}

                  {/* VIEWFINDER KAMERA LANGSUNG WITH REAL-TIME WATERMARK OVERLAY */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-2xl bg-black group">
                    <img
                      src={attInputPhotoUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600'}
                      alt="Live Camera Viewfinder"
                      className="w-full h-56 object-cover opacity-90 group-hover:scale-105 transition-all duration-500"
                    />

                    {/* LIVE CAMERA OVERLAY HUD */}
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20 text-[10px] text-white font-mono flex items-center space-x-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>LIVE CAMERA STREAM ACTIVE</span>
                    </div>

                    {/* AUTOMATED WATERMARK OVERLAY ON PHOTO */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 text-[10px] text-white font-mono space-y-0.5 border-t border-white/10">
                      <p className="font-bold text-amber-300 flex items-center justify-between text-xs">
                        <span>👤 {activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya (Kepala Cabang)' : 'Rina Melati (Kasir)'}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500 text-black font-bold rounded text-[9px]">WATERMARK VERIFIED</span>
                      </p>
                      <p className="text-emerald-400">📍 Cabang Utama Jakarta (GPS: -6.20887, 106.84561)</p>
                      <p className="text-slate-300">📅 {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • Real-Time NTP</p>
                    </div>
                  </div>

                  {/* ONE-CLICK SUBMIT BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleSubmitAttendance()}
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xl shadow-purple-600/30 transition-all flex items-center justify-center space-x-2 border border-purple-400/40"
                  >
                    <Camera className="w-4 h-4 text-amber-300 animate-bounce" />
                    <span>📸 AMBIL FOTO SELFI & SUBMIT PRESENSI {attInputType}</span>
                  </button>
                </div>

                {/* RIWAYAT PRESENSI MANDIRI SAYA */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        <span>Riwayat Presensi Mandiri Saya</span>
                      </h3>
                    </div>
                    <span className="text-xs text-emerald-400 font-bold font-mono">
                      {attendanceList.filter(log => activeRole === 'OWNER' || log.employee_name.includes(activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya' : 'Rina Melati')).length} Entri Mandiri
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {attendanceList
                      .filter(log => activeRole === 'OWNER' || log.employee_name.includes(activeRole === 'KEPALA_CABANG' ? 'Agus Wijaya' : 'Rina Melati'))
                      .map((log) => (
                        <div key={log.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start justify-between text-xs space-x-3">
                          <div className="flex items-start space-x-3">
                            <img
                              src={log.photo_url}
                              alt="Selfi Absen"
                              className="w-12 h-12 object-cover rounded-lg border border-purple-500/40 shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-bold text-white text-sm">{log.employee_name}</h4>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  {log.role_label}
                                </span>
                              </div>

                              <p className="text-slate-400 text-[11px] flex items-center space-x-1">
                                <span>{log.location}</span>
                              </p>

                              <p className="text-slate-400 font-mono text-[11px]">
                                📅 {log.timestamp}
                              </p>
                            </div>
                          </div>

                          <div className="text-right space-y-1.5 shrink-0">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold font-mono ${
                              log.type === 'MASUK'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : log.type === 'KELUAR'
                                ? 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                            }`}>
                              {log.type}
                            </span>
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'TEPAT_WAKTU'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : log.status === 'TERLAMBAT'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {log.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BROADCAST / KIRIM PESAN MASSAL TEKS & GAMBAR (DASHBOARD PEGAWAI & KEPALA CABANG) */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Broadcast Massal Teks & Gambar</h2>
                  </div>
                </div>

                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">Proteksi Privasi:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ✓ Proteksi Privasi Aktif
                  </span>
                </div>
              </div>

              {blastSuccessMsg && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-200">{blastSuccessMsg}</p>
                  </div>
                  <button onClick={() => setBlastSuccessMsg(null)} className="text-xs font-bold text-emerald-400 hover:text-emerald-200 underline">
                    Tutup
                  </button>
                </div>
              )}

              <div className="grid grid-cols-12 gap-6">
                {/* FORM KIRIM BROADCAST TEKS & GAMBAR (LEFT 5 COLS) */}
                <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Form Blast Pesan Massal</span>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      MULTICHANNEL READY
                    </span>
                  </div>

                  <form onSubmit={handleSendBroadcast} className="space-y-3.5 text-xs">
                    {/* SEGMEN SASARAN PENERIMA */}
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Sasaran Segmen Pelanggan *</label>
                      <select
                        value={blastTargetSegment}
                        onChange={(e) => setBlastTargetSegment(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="SEMUA KONSUMEN TERDAFTAR">📢 Semua Pelanggan Terdaftar</option>
                        <option value="SEGMEN CHURN RISK">⚠️ Segmen Pelanggan Riset Churn (&gt; 60 Hari Kosong)</option>
                        <option value="SEGMEN LOYAL REWARD">⭐ Segmen Pelanggan Loyal (Milestone Active)</option>
                      </select>
                    </div>

                    {/* TEKS ISI PESAN BLAST */}
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Isi Teks Pesan Broadcast *</label>
                      <textarea
                        required
                        rows={4}
                        value={blastMessageText}
                        onChange={(e) => setBlastMessageText(e.target.value)}
                        placeholder="Tulis pesan promosi atau sapaan bersamaan (misal: Halo Kak! Dapatkan promo diskon khusus 20% minggu ini...)..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* LAMPIRAN GAMBAR FLYER PROMO (AMBIL GAMBAR & DROPDOWN FOLDER TEMPAT DISIMPAN FILE) */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-emerald-300 font-bold block text-xs flex items-center space-x-1.5">
                          <span>🖼️ Lampirkan Gambar Flyer / Promo:</span>
                        </label>
                        {blastImageUrl && <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">✓ Gambar Terlampir</span>}
                      </div>

                      {/* HIDDEN FILE INPUT FOR DEVICE STORAGE & CAMERA SNAPSHOT */}
                      <input
                        id="broadcast-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBroadcastFileUpload}
                      />

                      {/* SIMPLIFIED 'AMBIL GAMBAR' BUTTON */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('broadcast-file-input')?.click()}
                        className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm text-xs"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>📷 Ambil Gambar</span>
                      </button>

                      {/* DROPDOWN FOLDER TEMPAT DISIMPAN FILE */}
                      <div className="space-y-1 pt-1">
                        <label className="text-slate-300 font-semibold block text-[11px]">📁 Folder Tempat Disimpan File *</label>
                        <select
                          value={blastFolder}
                          onChange={(e) => setBlastFolder(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                        >
                          <option value="📁 /media/flyer_promo">📁 /media/flyer_promo (Folder Flyer & Poster Promosi)</option>
                          <option value="📁 /media/katalog_layanan">📁 /media/katalog_layanan (Folder Katalog Produk & Layanan)</option>
                          <option value="📁 /media/event_diskon">📁 /media/event_diskon (Folder Banner Diskon & Event Special)</option>
                          <option value="📁 /media/informasi_outlet">📁 /media/informasi_outlet (Folder Pengumuman Resmi Outlet)</option>
                        </select>
                      </div>

                      {/* OPTIONAL DIRECT URL INPUT */}
                      <div className="pt-0.5">
                        <input
                          type="text"
                          value={blastImageUrl}
                          onChange={(e) => setBlastImageUrl(e.target.value)}
                          placeholder="Atau Tempel Link URL Gambar (Opsional)..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* IMAGE PREVIEW */}
                      {blastImageUrl && (
                        <div className="flex items-center space-x-3 pt-2 border-t border-slate-800 animate-fadeIn">
                          <img
                            src={blastImageUrl}
                            alt="Flyer Promo Uploaded"
                            className="w-16 h-16 object-cover rounded-lg border border-emerald-500/50 shadow"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <div className="flex-1 space-y-0.5">
                            <p className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                              <span>Gambar Flyer Terlampir</span>
                              <button
                                type="button"
                                onClick={() => setBlastImageUrl('')}
                                className="text-[10px] text-rose-400 hover:underline font-normal"
                              >
                                Hapus Gambar
                              </button>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">Disimpan di: <strong className="text-emerald-400">{blastFolder}</strong></p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all mt-2 flex items-center justify-center space-x-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>
                        {activeRole === 'KEPALA_CABANG' || activeRole === 'OWNER'
                          ? '🚀 SEBAR BROADCAST SEKARANG (ACC INSTAN)'
                          : '🚀 AJUKAN BROADCAST (BUTUH ACC KEPALA CABANG / OWNER)'}
                      </span>
                    </button>
                  </form>
                </div>

                {/* RIWAYAT PESAN BLAST TERKIRIM & MODUL APPROVAL (RIGHT 7 COLS) */}
                <div className="col-span-7 space-y-4">
                  {/* MODUL NOTIFIKASI KONTROL PERSETUJUAN (KHUSUS KEPALA CABANG / OWNER AUDIT) */}
                  {broadcastList.some(b => b.status === 'PENDING_APPROVAL') && (
                    <div className="bg-slate-900 border-2 border-amber-500/40 rounded-xl p-4 space-y-3 shadow-xl animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h4 className="font-bold text-amber-400 text-xs flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                          <span>🔔 Approval Control: Pengajuan Broadcast Menunggu ACC Persetujuan</span>
                        </h4>
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                          {broadcastList.filter(b => b.status === 'PENDING_APPROVAL').length} Pengajuan Menunggu ACC
                        </span>
                      </div>

                      {broadcastList.filter(b => b.status === 'PENDING_APPROVAL').map((pending) => (
                        <div key={pending.id} className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/30 space-y-2.5 text-xs">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                                {pending.id} • PENDING ACC
                              </span>
                              <h5 className="font-bold text-white text-sm mt-1">{pending.title}</h5>
                              <p className="text-slate-400 text-[11px]">
                                Pengaju: <strong className="text-purple-300">{pending.sender_name}</strong> | Target: <strong className="text-slate-200">{pending.target_segment} ({pending.total_target} Pelanggan)</strong>
                              </p>
                              <p className="text-emerald-400 font-mono text-[10px]">Folder Penyimpanan: {pending.folder_path || '📁 /media/flyer_promo'}</p>
                            </div>
                            <span className="text-slate-400 font-mono text-[10px]">{pending.timestamp}</span>
                          </div>

                          <div className="flex items-start space-x-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                            {pending.image_url && (
                              <img
                                src={pending.image_url}
                                alt="Pending Flyer"
                                className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                            <p className="text-slate-300 leading-relaxed text-[11px] flex-1 italic">
                              "{pending.message_text}"
                            </p>
                          </div>

                          {/* ACTION ACC / REJECT FOR KEPALA CABANG OR OWNER */}
                          {activeRole === 'KEPALA_CABANG' || activeRole === 'OWNER' ? (
                            <div className="flex items-center space-x-2 pt-1">
                              <button
                                type="button"
                                onClick={() => handleApproveBroadcast(pending.id, true)}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center justify-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>✅ ACC & SEBAR BROADCAST</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleApproveBroadcast(pending.id, false)}
                                className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-lg transition-all"
                              >
                                ❌ TOLAK
                              </button>
                            </div>
                          ) : (
                            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center text-[11px] text-amber-300 font-semibold italic">
                              ⏳ Menunggu Peninjauan & Persetujuan (ACC) oleh Kepala Cabang / Owner sebelum pesan dikirim.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>Riwayat Pengiriman Pesan Blast (Teks & Gambar)</span>
                      </h3>
                      <span className="text-xs text-slate-400 font-bold">{broadcastList.length} Campaign Terdaftar</span>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {broadcastList.map((blast) => (
                        <div key={blast.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                          <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                                  {blast.id}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                  blast.status === 'APPROVED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : blast.status === 'PENDING_APPROVAL'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {blast.status === 'APPROVED' ? `🟢 ACC (${blast.approved_by || 'Disetujui'})` : blast.status === 'PENDING_APPROVAL' ? '⏳ PENDING ACC' : '🔴 DITOLAK'}
                                </span>
                              </div>
                              <h4 className="font-bold text-white text-sm mt-1">{blast.title}</h4>
                              <p className="text-slate-400 text-[11px] mt-0.5">
                                Sasaran: <strong className="text-slate-200">{blast.target_segment}</strong> | Pengaju: <strong className="text-slate-200">{blast.sender_name}</strong>
                              </p>
                              <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                                Storage: <strong className="text-emerald-400">{blast.folder_path || '📁 /media/flyer_promo'}</strong>
                              </p>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px]">{blast.timestamp}</span>
                          </div>

                          {/* FLAYER IMAGE & TEXT PREVIEW */}
                          <div className="flex items-start space-x-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                            {blast.image_url && (
                              <img
                                src={blast.image_url}
                                alt="Flyer Blast"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            )}
                            <p className="text-slate-300 leading-relaxed text-[11px] flex-1 italic">
                              "{blast.message_text}"
                            </p>
                          </div>

                        {/* BROADCAST DELIVERY STATUS METRICS & PROGRESS BAR */}
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-300">Status Pengiriman Broadcast:</span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              Total Target: {blast.total_target || (blast.sent_count + (blast.idle_count || 0) + blast.opt_out_excluded)} Pelanggan
                            </span>
                          </div>

                          {/* VISUAL DELIVERY STATUS BAR */}
                          {(() => {
                            const tot = (blast.sent_count + (blast.idle_count || 0) + blast.opt_out_excluded) || 1;
                            const sentPct = Math.round((blast.sent_count / tot) * 100);
                            const idlePct = Math.round(((blast.idle_count || 0) / tot) * 100);
                            const optPct = Math.round((blast.opt_out_excluded / tot) * 100);

                            return (
                              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                                <div style={{ width: `${sentPct}%` }} className="h-full bg-emerald-500" title={`Terkirim: ${blast.sent_count}`} />
                                <div style={{ width: `${idlePct}%` }} className="h-full bg-amber-500" title={`Idle: ${blast.idle_count || 0}`} />
                                <div style={{ width: `${optPct}%` }} className="h-full bg-rose-500" title={`Opt-Out: ${blast.opt_out_excluded}`} />
                              </div>
                            );
                          })()}

                          {/* METRIC COUNTERS GRID */}
                          <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                            <div className="bg-slate-950 p-1.5 rounded border border-emerald-500/30 text-center">
                              <span className="text-slate-400 block">✓ Terkirim Sukses</span>
                              <span className="text-emerald-400 font-bold font-mono text-xs">{blast.sent_count} Pesan</span>
                            </div>

                            <div className="bg-slate-950 p-1.5 rounded border border-amber-500/30 text-center">
                              <span className="text-slate-400 block">⏳ Idle / Pending Queue</span>
                              <span className="text-amber-400 font-bold font-mono text-xs">{blast.idle_count || 0} Pesan</span>
                            </div>

                            <div className="bg-slate-950 p-1.5 rounded border border-rose-500/30 text-center">
                              <span className="text-slate-400 block">🛡️ Dikecualikan (GD-16)</span>
                              <span className="text-rose-400 font-bold font-mono text-xs">{blast.opt_out_excluded} Pesan</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATABASE PELANGGAN SURFACE (DOMAIN 02 - PHASE 8 FOCUS) */}
          {activeTab === 'customers' && (
            <div>
              {!isAuthorizedCustomerViewer ? (
                <div className="bg-rose-950/80 border-2 border-rose-500/60 rounded-2xl p-6 text-xs text-rose-200 animate-fadeIn shadow-2xl space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-rose-200">⛔ OTORISASI TERBATAS: DATABASE PELANGGAN KHUSUS OWNER, KEPALA CABANG & KASIR</h3>
                      <p className="text-xs text-rose-300 mt-1">
                        Sesuai Kebijakan Operasional PILIN: Akses ke seluruh database pelanggan hanya dapat dibuka oleh <strong>Admin / Owner</strong>, <strong>Kepala Cabang</strong>, dan <strong>Kasir Utama</strong>. Peran Anda saat ini (<strong>{loggedInEmp?.role || 'Staf Operasional Non-Kasir'}</strong>) tidak diizinkan membuka data kontak pelanggan.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('work')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md transition-all"
                  >
                    Kembali ke Dashboard Utama →
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Database Pelanggan</h2>
                      </div>
                    </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowOwnerImportModal(!showOwnerImportModal)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-600/20 transition-all flex items-center space-x-1.5"
                  >
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>📥 Import Data Pelanggan (App Lain / Mokapos / PaWOON / Excel)</span>
                  </button>
                  <button
                    onClick={() => setShowRegForm(!showRegForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/20 transition-all"
                  >
                    {showRegForm ? 'Batal Tambah' : '+ Registrasi Pelanggan Baru'}
                  </button>
                </div>
              </div>

              {/* OWNER LEGACY APPLICATION CUSTOMER MIGRATION ENGINE PANEL */}
              {showOwnerImportModal && (
                <form onSubmit={handleOwnerExecuteImport} className="bg-slate-900 border-2 border-purple-500/40 rounded-xl p-5 space-y-4 shadow-xl animate-fadeIn">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Engine Import & Migrasi Pelanggan Dari Aplikasi Lain (Mokapos, PaWOON, Kasir Pintar, Excel)</span>
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 font-mono">
                      DE-DUPLICATION ACTIVE
                    </span>
                  </div>

                  {/* QUICK SAMPLE LOAD BUTTONS FOR POPULAR POS APPS */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <span className="text-slate-300 font-bold block text-[11px]">⚡ Pilih Preset Sampel Data Ekspor Aplikasi Lama:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleLoadSampleLegacyData('MOKA_POS')}
                        className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 font-bold rounded-lg transition-all text-[11px]"
                      >
                        📱 Load Mokapos Export (3 Pelanggan)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSampleLegacyData('PAWOON')}
                        className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-bold rounded-lg transition-all text-[11px]"
                      >
                        🏪 Load PaWOON Export (2 Pelanggan)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSampleLegacyData('EXCEL_CSV')}
                        className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold rounded-lg transition-all text-[11px]"
                      >
                        📊 Load Excel / CSV File (2 Pelanggan)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4 text-xs">
                    {/* APP SOURCE SELECTION */}
                    <div className="col-span-6 space-y-1">
                      <label className="text-slate-300 font-semibold block">Aplikasi Asal Export Data *</label>
                      <select
                        value={importAppSource}
                        onChange={(e) => setImportAppSource(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                      >
                        <option value="MOKA_POS">📱 Moka POS (Aplikasi Kasir Mokapos)</option>
                        <option value="PAWOON">🏪 PaWOON POS (Aplikasi Kasir PaWOON)</option>
                        <option value="KASIR_PINTAR">💡 Kasir Pintar / Olsera</option>
                        <option value="EXCEL_CSV">📊 File Spreadsheet Excel / CSV Manual</option>
                        <option value="CUSTOM_APP">🗄️ Database Aplikasi POS Custom Lainnya</option>
                      </select>
                    </div>

                    {/* UPDATE POLICY SELECTION */}
                    <div className="col-span-6 space-y-1">
                      <label className="text-slate-300 font-semibold block">Kebijakan Pembaruan (De-duplication Policy) *</label>
                      <select
                        value={importUpdatePolicy}
                        onChange={(e) => setImportUpdatePolicy(e.target.value as ImportUpdatePolicy)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-purple-500"
                      >
                        <option value="UPDATE_EMPTY_ONLY">🛡️ UPDATE_EMPTY_ONLY (Rekomendasi - Hanya Melengkapi Field Kosong)</option>
                        <option value="OVERWRITE_EXPLICIT">✏️ OVERWRITE_EXPLICIT (Timpa Data Eksisting dengan Data Terbaru)</option>
                        <option value="SKIP">⏩ SKIP (Abaikan Baris Jika Nomor HP/ID Sudah Terdaftar)</option>
                      </select>
                    </div>
                  </div>

                  {/* RAW JSON / CSV INPUT CONTAINER */}
                  <div className="space-y-1 text-xs">
                    <label className="text-slate-300 font-semibold block">Data Ekspor Pelanggan (JSON / CSV Format Text) *</label>
                    <textarea
                      required
                      rows={5}
                      value={importRawText}
                      onChange={(e) => setImportRawText(e.target.value)}
                      placeholder='Tempelkan ekspor JSON atau CSV di sini... Contoh: [{"source_customer_id":"MOKA-01","nama":"Maya","no_hp":"08123456789","email":"maya@gmail.com"}]'
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-emerald-300 font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* IMPORT METRICS RESULT SUMMARY */}
                  {importSuccessResult && (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 space-y-2 text-xs animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-emerald-400">📊 Ringkasan Hasil Eksekusi Migrasi:</span>
                        <span className="font-mono text-slate-400">Total Processed: {importSuccessResult.totalProcessed} Rows</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 font-mono">
                        <div className="bg-slate-900 p-2 rounded border border-emerald-500/30 text-emerald-300">
                          <strong>+ {importSuccessResult.createNewCount}</strong> Pelanggan Baru Ditambahkan (CREATE_NEW)
                        </div>
                        <div className="bg-slate-900 p-2 rounded border border-blue-500/30 text-blue-300">
                          <strong>✓ {importSuccessResult.matchCount}</strong> Data Dicocokkan (De-duplicated / Merged)
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowOwnerImportModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-1.5"
                    >
                      <Upload className="w-4 h-4 text-amber-300" />
                      <span>🚀 EKSEKUSI MIGRASI & IMPORT DATA PELANGGAN</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Registration Success Banner */}
              {regSuccessMessage && (
                <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-sm font-bold text-emerald-300">{regSuccessMessage}</p>
                  </div>
                  <button
                    onClick={() => setRegSuccessMessage(null)}
                    className="text-xs text-emerald-400 hover:text-emerald-200 underline"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Quick Customer Registration Form */}
              {showRegForm && (
                <form onSubmit={handleRegisterCustomer} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Form Registrasi Pelanggan Baru (Skema 00006)</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Nama Lengkap *</label>
                      <input
                        type="text"
                        required
                        value={newCustNama}
                        onChange={(e) => setNewCustNama(e.target.value)}
                        placeholder="Contoh: Maya Indah"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Nomor HP *</label>
                      <input
                        type="text"
                        required
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        placeholder="Contoh: 08123456789 atau +62 812..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                      {newCustPhone && (
                        <p className="text-[11px] text-emerald-400 font-mono mt-1">
                          Normalized: {normalizePhoneNumber(newCustPhone) || 'Format Telepon Tidak Valid'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Alamat Email (Opsional)</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        placeholder="maya@gmail.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Alamat Domisili (Opsional)</label>
                      <input
                        type="text"
                        value={newCustAlamat}
                        onChange={(e) => setNewCustAlamat(e.target.value)}
                        placeholder="Jl. Pemuda No. 10"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowRegForm(false)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Simpan Pelanggan
                    </button>
                  </div>
                </form>
              )}

              {/* Customer Search & Data Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Cari berdasarkan nama, email, atau HP..."
                      className="w-80 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    {customerSearchQuery && (
                      <button
                        onClick={() => setCustomerSearchQuery('')}
                        className="text-xs text-slate-400 hover:text-slate-200"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Total: {filteredCustomers.length} Pelanggan</span>
                </div>

                {filteredCustomers.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Pelanggan tidak ditemukan.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                          <th className="p-3">Nama Pelanggan</th>
                          <th className="p-3">No. HP (Kanonikal)</th>
                          <th className="p-3">Cabang Terdaftar</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Alamat</th>
                          <th className="p-3">Sumber Data</th>
                          <th className="p-3">Preferensi Kontak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-bold text-white">{c.nama}</td>
                            <td className="p-3 font-mono">
                              <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                                {c.no_hp_normalized || 'N/A'}
                              </span>
                              <span className="text-[11px] text-slate-500 block mt-0.5">{c.no_hp}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                📍 {branchesList.find(b => b.id === c.created_at_branch_id)?.name || 'Cabang Utama'}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400">{c.email || '-'}</td>
                            <td className="p-3 text-slate-400 max-w-xs truncate">{c.alamat || '-'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {c.source_system}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">{c.communication_preference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

          {/* INPUT PENGELUARAN CABANG SURFACE (KEPALA CABANG & OWNER) */}
          {activeTab === 'expense' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Pengeluaran Operasional Cabang</h2>
                  </div>
                </div>

                <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-right text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">Aturan Otorisasi (GD-01):</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    ✓ Cabang Auto-Log ≤ 5M | Owner &gt; 5M
                  </span>
                </div>
              </div>

              {expSuccessMessage && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-200">{expSuccessMessage}</p>
                  </div>
                  <button onClick={() => setExpSuccessMessage(null)} className="text-xs font-bold text-emerald-400 hover:text-emerald-200 underline">
                    Tutup
                  </button>
                </div>
              )}

              <div className="grid grid-cols-12 gap-6">
                {/* FORM INPUT PENGELUARAN CABANG (LEFT 5 COLS) */}
                <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Form Input Pengeluaran Cabang</span>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      DASAR RUGI LABA OWNER
                    </span>
                  </div>

                  <form onSubmit={handleRecordExpense} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Kategori Pengeluaran *</label>
                      <select
                        value={expCategory}
                        onChange={(e) => setExpCategory(e.target.value as ExpenseRecord['category'])}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="OPERATIONAL">OPERATIONAL (Bahan, Tisu, Operasional Harian)</option>
                        <option value="UTILITIES">UTILITIES (Listrik, Air, WiFi Internet)</option>
                        <option value="SUPPLIES">SUPPLIES (Perlengkapan Perawatan & Service)</option>
                        <option value="MAINTENANCE">MAINTENANCE (Pemeliharaan Alat / Renovasi)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Nominal Biaya / Pengeluaran (Rp) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="Contoh: 350000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Catatan / Rincian Pengeluaran *</label>
                      <input
                        type="text"
                        required
                        value={expNotes}
                        onChange={(e) => setExpNotes(e.target.value)}
                        placeholder="Contoh: Pembelian sabun khusus repaint & kain lap micro-fiber..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all mt-2"
                    >
                      💾 SIMPAN PENGELUARAN CABANG
                    </button>
                  </form>
                </div>

                {/* DAFTAR PENGELUARAN CABANG TERDAPTAR (RIGHT 7 COLS) */}
                <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <ClipboardList className="w-4 h-4 text-emerald-400" />
                      <span>Daftar Pengeluaran Cabang Terdaftar</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-bold font-mono">
                      Total: Rp {currentTotalExpenses.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {expenseList.map((exp) => (
                      <div key={exp.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-500/30">
                              {exp.category}
                            </span>
                            <span className="text-slate-400 text-[11px] font-mono">{exp.created_at}</span>
                          </div>
                          <p className="font-bold text-white mt-1">{exp.notes || 'Pengeluaran Operasional'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-400 font-bold font-mono text-sm block">
                            - Rp {exp.amount.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold">
                            ✓ Entered into P&L
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FINANCIAL STATEMENT LEDGER & LAPORAN KEUANGAN KONSOLIDASI (KHUSUS MENU LAPORAN RUGI LABA OWNER) */}
          {activeTab === 'finance' && (
            <div className="space-y-6 animate-fadeIn">
              {activeRole !== 'OWNER' ? (
                <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-10 text-center space-y-4 animate-fadeIn my-8">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Akses Laporan Keuangan Terbatas (Khusus Owner)</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Sesuai instruksi Owner: Laporan Keuangan Konsolidasi Perusahaan bersifat rahasia eksekutif dan <strong>hanya dapat diakses oleh Owner (Tier 3)</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setActiveRole('OWNER');
                      setActiveTab('finance');
                    }}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                  >
                    👑 Switch ke Role Owner (Tier 3) Untuk Akses Laporan Keuangan
                  </button>
                </div>
              ) : (
                <React.Fragment>
                  <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-6 flex items-center justify-between shadow-xl">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Laporan Keuangan Laba Rugi</h2>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-950 to-slate-950 px-4 py-2 rounded-xl border border-amber-500/40 text-right text-xs">
                      <span className="text-amber-300 font-bold block text-[11px]">👑 AUDITED FINANCIAL STATEMENT</span>
                      <span className="text-emerald-400 font-mono text-[10px]">Periode: Real-Time Calendar 2026</span>
                    </div>
                  </div>

                  {/* TABEL 1: LAPORAN LABA RUGI RESMI (CONSOLIDATED INCOME STATEMENT) */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-white text-base flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-emerald-400" />
                        <span>I. Laporan Laba Rugi Konsolidasi (Income Statement)</span>
                      </h3>
                      <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-500/30 font-bold">
                        Margin Profit: {pnlReport.profitMarginPercent}%
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                            <th className="p-3">Komponen Pos Keuangan</th>
                            <th className="p-3 text-right">Nominal (Rp)</th>
                            <th className="p-3 text-right">Persentase (%)</th>
                            <th className="p-3">Keterangan Akuntansi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {/* REVENUE SECTION */}
                          <tr className="bg-emerald-950/20 text-emerald-300 font-bold">
                            <td className="p-3">1. Total Pendapatan Kotor (Gross Sales Revenue)</td>
                            <td className="p-3 text-right font-mono text-sm text-emerald-400">Rp {pnlReport.totalRevenue.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono">100.0%</td>
                            <td className="p-3 text-slate-400 font-normal">Total penerimaan dari transaksi POS Commerce</td>
                          </tr>

                          {/* HPP SECTION */}
                          <tr className="text-slate-300">
                            <td className="p-3 pl-6 text-slate-400">• Harga Pokok Penjualan (HPP / Materials BOM & Direct Labor)</td>
                            <td className="p-3 text-right font-mono text-rose-300">- Rp {Math.round(pnlReport.totalRevenue * 0.25).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono text-slate-400">25.0%</td>
                            <td className="p-3 text-slate-500">Pemakaian bahan baku & insentif langsung teknisi</td>
                          </tr>

                          <tr className="bg-slate-950 text-white font-bold border-y border-slate-800">
                            <td className="p-3">2. LABA KOTOR (GROSS PROFIT)</td>
                            <td className="p-3 text-right font-mono text-sm text-emerald-400">Rp {Math.round(pnlReport.totalRevenue * 0.75).toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">75.0%</td>
                            <td className="p-3 text-slate-400 font-normal">Pendapatan Kotor dikurangi HPP Direct</td>
                          </tr>

                          {/* OPERATING EXPENSES SECTION */}
                          <tr className="text-slate-300">
                            <td className="p-3 pl-6 text-slate-400">• Beban Operasional Cabang (OPEX: Sewa, Listrik, Maintenance, Tisu, Operasional)</td>
                            <td className="p-3 text-right font-mono text-rose-400">- Rp {pnlReport.totalExpenses.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono text-slate-400">
                              {Math.round((pnlReport.totalExpenses / pnlReport.totalRevenue) * 100)}%
                            </td>
                            <td className="p-3 text-slate-500">Input pengeluaran harian Kepala Cabang</td>
                          </tr>

                          {/* NET PROFIT SECTION */}
                          <tr className="bg-emerald-950/40 border-t-2 border-emerald-500/50 text-white font-bold text-sm">
                            <td className="p-3 flex items-center space-x-2">
                              <span>3. LABA OPERASIONAL BERSIH (NET OPERATING PROFIT)</span>
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-300 text-base">Rp {pnlReport.netProfit.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono text-blue-400 text-base">{pnlReport.profitMarginPercent}%</td>
                            <td className="p-3 text-emerald-300 text-xs font-normal">Sisa laba bersih operasional perusahaan</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TABEL 2: BREAKDOWN KEUANGAN & PROFITABILITAS PER CABANG */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-white text-base flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-blue-400" />
                        <span>II. Breakdown Keuangan & Omzet Per Cabang (Multi-Branch Performance)</span>
                      </h3>
                      <span className="text-xs font-mono text-blue-400">3 Site Active Branches</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      {branchesList.filter(b => b.id !== 'ALL_BRANCHES').map((b, idx) => {
                        const branchPayroll = b.payroll || 750000;
                        const bNet = b.revenue - b.expenses - branchPayroll;
                        const bMargin = Math.round((bNet / b.revenue) * 100);

                        return (
                          <div key={b.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                              <div>
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-500/30">
                                  SITE #0{idx + 1}
                                </span>
                                <h4 className="font-bold text-white text-sm mt-1">{b.name}</h4>
                                <p className="text-slate-500 text-[11px]">{b.location}</p>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Pendapatan Omzet:</span>
                                <span className="font-bold font-mono text-emerald-400">Rp {b.revenue.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Pengeluaran Operasional (OPEX):</span>
                                <span className="font-bold font-mono text-rose-400">- Rp {b.expenses.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400 font-semibold">👥 Biaya Gaji Pegawai (Labor Cost):</span>
                                <span className="font-bold font-mono text-purple-400">- Rp {branchPayroll.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between border-t border-slate-900 pt-1.5 text-sm">
                                <span className="font-bold text-white">Laba Bersih Cabang:</span>
                                <span className="font-bold font-mono text-white">Rp {bNet.toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Margin Laba Bersih:</span>
                                <span className="font-bold font-mono text-blue-400">{bMargin}% Margin</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TABEL 3: ARUS KAS OPERASIONAL & AUDIT VERIFICATION */}
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                      <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>III. Laporan Arus Kas Operasional (Cash Flow Statement)</span>
                        </h3>
                        <span className="text-xs text-emerald-400 font-mono font-bold">NET CASH POSITIVE</span>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold text-white block">➕ Arus Kas Masuk Operasional (Operating Cash Inflows)</span>
                              <span className="text-slate-400 text-[11px]">Setoran Kasir POS Transaksi Lunas (Cash + Transfer)</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              + Rp {pnlReport.totalRevenue.toLocaleString('id-ID')}
                            </span>
                          </div>

                          {/* BREAKDOWN TUNAI VS TRANSFER IN CASH FLOW */}
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[11px]">
                            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-slate-400">💵 Tunai / Physical Cash (Laci Kasir):</span>
                              <span className="font-mono font-bold text-emerald-300">
                                Rp {Math.round(pnlReport.totalRevenue * 0.6).toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/60 p-2 rounded border border-slate-800">
                              <span className="text-slate-400">💳 Nontunai / Bank Transfer & QRIS:</span>
                              <span className="font-mono font-bold text-blue-300">
                                Rp {Math.round(pnlReport.totalRevenue * 0.4).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-500/30 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white block">➖ Arus Kas Keluar Operasional (Operating Cash Outflows)</span>
                            <span className="text-slate-400 text-[11px]">Biaya Bahan Baku, Listrik, Operasional & Maintenance Cabang</span>
                          </div>
                          <span className="font-mono font-bold text-rose-400 text-sm">
                            - Rp {pnlReport.totalExpenses.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-950 to-slate-950 p-4 rounded-xl border border-emerald-500/40 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-extrabold text-white block">💎 SALDO ARUS KAS BERSIH (NET CASH FLOW)</span>
                            <span className="text-emerald-300 text-xs">Likuiditas Kas Siap Pakai Untuk Ekspansi Usaha</span>
                          </div>
                          <span className="font-mono font-extrabold text-emerald-300 text-base">
                            Rp {pnlReport.netProfit.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            <span>IV. Otorisasi & Verifikasi Laporan Keuangan</span>
                          </h3>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                            EXECUTIVE AUDIT
                          </span>
                        </div>

                        <div className="space-y-2 text-xs pt-3">
                          <p className="text-slate-300 leading-relaxed">
                            Laporan Keuangan Konsolidasi Perusahaan dibuat secara otomatis berdasarkan akumulasi transaksi POS resmi dan pengeluaran operasional terverifikasi.
                          </p>
                          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                            <p className="text-amber-300 font-bold">✓ Audit Trail Verification:</p>
                            <p className="text-slate-400">Timestamp Audit: <span className="font-mono text-slate-300">2026-08-15 11:10</span></p>
                            <p className="text-slate-400">Verifier Authority: <span className="font-mono text-emerald-400">OWNER EXECUTIVE TIER 3</span></p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-xl border border-amber-500/40 text-center">
                        <span className="text-[10px] text-amber-400 font-bold block uppercase tracking-wider">Tanda Tangan Otorisasi Resmi</span>
                        <p className="text-xs font-bold text-white mt-1">👑 PT BOS PILIN EXECUTIVE OWNER</p>
                        <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">STATUS: VERIFIED & APPROVED</span>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </div>
          )}
          {/* LAPORAN KUANTITAS & HASIL WA REMINDER OTOMATIS HARI INI (KEPALA CABANG & OWNER) */}
          {activeTab === 'reminder_report' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Laporan WA Reminder</h2>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-950 to-slate-950 px-4 py-2 rounded-xl border border-purple-500/40 text-right text-xs">
                  <span className="text-purple-300 font-bold block text-[11px]">💎 CALON OMZET MASA DEPAN</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {sapaanLogs.length} Pelanggan Terjangkau Hari Ini
                  </span>
                </div>
              </div>

              {/* INDUSTRY CATEGORY TEMPLATE SELECTOR (KHUSUS OWNER) */}
              {activeRole === 'OWNER' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-2">
                      <span>🏢 Pilih Jenis Usaha (Pengaturan Template Owner):</span>
                    </span>
                    <span className="text-[11px] text-purple-400 font-mono font-bold">
                      Kategori Aktif: {IndustryTemplateService.getTemplate(selectedIndustry).icon} {IndustryTemplateService.getTemplate(selectedIndustry).name}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {IndustryTemplateService.getCategories().map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedIndustry(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                          selectedIndustry === cat.id
                            ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/20'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* REMINDER QUANTITY SUMMARY CARDS */}
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-slate-400 font-semibold block">1. Total WA Reminder Hari Ini</span>
                  <p className="text-2xl font-bold text-purple-400 mt-1 font-mono">{sapaanLogs.length} Pesan</p>
                  <p className="text-[10px] text-slate-500 mt-1">Status: Terbit / Aktif Hari Ini</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-slate-400 font-semibold block">2. Sapaan Terima Kasih Nota POS</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                    {sapaanLogs.filter(l => l.category === 'HYPPOSELLING').length} Pesan
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Auto-Triggered Post Checkout Kasir</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-slate-400 font-semibold block">3. Sapaan Perawatan Rutin (30 Hari)</span>
                  <p className="text-2xl font-bold text-blue-400 mt-1 font-mono">
                    {sapaanLogs.filter(l => l.category === 'SAPAAN').length} Pesan
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Jadwal Treatment Rutin Pelanggan</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-slate-400 font-semibold block">4. Promo Hypnoselling Retensi</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                    {sapaanLogs.filter(l => l.category === 'QUOTE').length} Pesan
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Promosi Retensi Repeat Purchase</p>
                </div>
              </div>

              {/* DETAILED REMINDER LOG TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span>Laporan Log WA Reminder Terkirim Hari Ini</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-bold font-mono">
                    Total Log: {sapaanLogs.length} Entri
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3">Pelanggan</th>
                        <th className="p-3">No. WhatsApp</th>
                        <th className="p-3">Item / Service</th>
                        <th className="p-3">Kategori Reminder</th>
                        <th className="p-3">Isi Pesan WA Reminder</th>
                        <th className="p-3 text-center">Aksi Kirim (wa.me)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sapaanLogs.map((log) => {
                        const targetPhone = normalizePhoneNumber(log.customer_phone) || log.customer_phone;
                        const waLink = log.wa_me_url || `https://wa.me/${targetPhone}?text=${encodeURIComponent(log.message_text)}`;

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-bold text-white">{log.customer_name}</td>
                            <td className="p-3 font-mono">
                              <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                                {targetPhone}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-medium">
                              {log.item_name || 'Barang Service'}
                              <span className="text-[10px] text-purple-400 block font-mono">H+{log.due_days || 30} Grooming</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                {log.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 max-w-xs italic text-[11px] leading-relaxed">
                              "{log.message_text}"
                            </td>
                            <td className="p-3 text-center">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-md shadow-emerald-600/20 transition-all"
                              >
                                <span>Kirim</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMER RETENTION & SAPAAN SURFACE (DOMAIN 08 - UNIFIED OWNER & OPERATOR ENGINE) */}
          {activeTab === 'sapaan' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Otomasi Hypnoselling, Sapaan & Reminder</h2>
                  </div>
                </div>

                <div className="bg-purple-950 px-4 py-2 rounded-xl border border-purple-500/30 text-right text-xs">
                  <span className="text-purple-300 font-bold block text-[11px]">⚙️ OWNER CONFIGURATION ACTIVE</span>
                  <span className="text-slate-400 text-[10px]">Reminder Threshold: H+{reminderThresholdDays} Hari | Sapaan: H+{sapaanThresholdDays} Hari</span>
                </div>
              </div>

              {/* UNIFIED RETENTION THRESHOLD CONFIGURATOR (OWNER EXECUTIVE CONTROL) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>1. Pengaturan Ambang Waktu Reminder, Hypnoselling, & Sapaan</span>
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                    1 MENU UNIFIED RETENTION
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-6 text-xs">
                  {/* THRESHOLD REMINDER GROOMING / TREATMENT */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <label className="font-bold text-white block mb-1">Ambang Waktu Reminder Treatment / Grooming (Hari H+)</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      {[14, 30, 45].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setReminderThresholdDays(d)}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-all text-xs ${
                            reminderThresholdDays === d
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          H+{d} Hari
                        </button>
                      ))}

                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                        <span className="text-slate-400 text-[11px]">Manual:</span>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={reminderThresholdDays}
                          onChange={(e) => setReminderThresholdDays(parseInt(e.target.value) || 30)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold font-mono text-center focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-slate-400 text-[11px]">Hari</span>
                      </div>
                    </div>
                  </div>

                  {/* THRESHOLD HYPNOSELLING & SAPAAN */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div>
                      <label className="font-bold text-white block mb-1">Ambang Waktu Hypnoselling & Sapaan Pelanggan (Hari H+)</label>
                    </div>

                    <div className="flex items-center space-x-2">
                      {[7, 14].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSapaanThresholdDays(d)}
                          className={`px-3 py-1.5 rounded-lg font-bold border transition-all text-xs ${
                            sapaanThresholdDays === d
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          H+{d} Hari
                        </button>
                      ))}

                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-800">
                        <span className="text-slate-400 text-[11px]">Manual:</span>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={sapaanThresholdDays}
                          onChange={(e) => setSapaanThresholdDays(parseInt(e.target.value) || 7)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-bold font-mono text-center focus:outline-none focus:border-purple-500"
                        />
                        <span className="text-slate-400 text-[11px]">Hari</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>





              {/* Sapaan Banner Message */}
              {sapaanBannerMessage && (
                <div className="bg-purple-950/60 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    <p className="text-sm font-bold text-purple-300">{sapaanBannerMessage}</p>
                  </div>
                  <button
                    onClick={() => setSapaanBannerMessage(null)}
                    className="text-xs text-purple-400 hover:text-purple-200 underline"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Sapaan Generator & Live Preview */}
              <div className="grid grid-cols-12 gap-6">
                <form onSubmit={handleScheduleSapaan} className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>Generator Sapaan & Hypnoselling Engine</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Pilih Target Pelanggan</label>
                      <select
                        value={sapaanTargetCust}
                        onChange={(e) => setSapaanTargetCust(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      >
                        {customerList.map((c) => (
                          <option key={c.id} value={c.nama}>
                            {c.nama} ({c.no_hp_normalized || c.no_hp})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Kategori Pesan Retensi</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['SAPAAN', 'QUOTE', 'HYPPOSELLING'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSapaanCategory(cat)}
                            className={`py-1.5 rounded text-[11px] font-bold border transition-all ${
                              sapaanCategory === cat
                                ? 'bg-purple-600 text-white border-purple-500 shadow'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Custom Template Body (Gunakan {"{{nama}}"})</label>
                      <textarea
                        rows={2}
                        value={customSapaanBody}
                        onChange={(e) => setCustomSapaanBody(e.target.value)}
                        placeholder="Biarkan kosong untuk menggunakan template bawaan engine..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-500/20 transition-all"
                  >
                    Jadwalkan Sapaan Pelanggan
                  </button>
                </form>

                {/* Live Message Preview */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Live Message Preview (Engine Hypnoselling)</span>
                    </h3>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Target: <strong className="text-white">{currentSapaanPreview.customerName}</strong></span>
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {currentSapaanPreview.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans pt-2 border-t border-slate-800/80">
                        {currentSapaanPreview.fullMessageBody}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      <span>Eligibility: <strong className="text-emerald-400">{currentSapaanPreview.eligibility.isEligible ? 'PASSED' : 'REJECTED'}</strong></span>
                      <span className="ml-3">Lifecycle: <strong className="text-blue-400">{currentSapaanPreview.behaviorProfile.lifecycleState}</strong></span>
                    </div>
                    <a
                      href={RetentionDomainService.generateWaMeLink('628123456789', currentSapaanPreview.fullMessageBody)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                    >
                      <span>Kirim</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Sapaan Logs Queue Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Daftar Log Sapaan & WA Reminder Terjadwal</h3>
                  <span className="text-xs text-slate-400 font-mono">Total: {sapaanLogs.length} Pesan Retensi</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3">Pelanggan</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Isi Pesan Sapaan / Reminder</th>
                        <th className="p-3">Jadwal Kirim</th>
                        <th className="p-3 text-center">Aksi Kirim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sapaanLogs.map((log) => {
                        const targetPhone = normalizePhoneNumber(log.customer_phone) || log.customer_phone;
                        const waLink = log.wa_me_url || RetentionDomainService.generateWaMeLink(targetPhone, log.message_text);

                        return (
                          <tr key={log.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-bold text-white">
                              {log.customer_name}
                              <span className="text-[11px] text-slate-500 font-mono block mt-0.5">{targetPhone}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                {log.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 max-w-md italic text-[11px] leading-relaxed">
                              "{log.message_text}"
                            </td>
                            <td className="p-3 font-mono text-slate-400 text-[11px]">
                              {new Date(log.scheduled_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </td>
                            <td className="p-3 text-center">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow-md shadow-emerald-600/20 transition-all"
                              >
                                <span>Kirim</span>
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* OTORISASI & GOVERNANCE APPROVAL CONTROL SURFACE (DOMAIN 11 - OWNER EXCLUSIVE) */}
          {activeTab === 'control' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-blue-500/30 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Modul Otorisasi & Control Approval Eksekutif</h2>
                  </div>
                </div>

                <div className="bg-blue-950 px-4 py-2 rounded-xl border border-blue-500/40 text-right text-xs">
                  <span className="text-blue-300 font-bold block text-[11px]">🛡️ GOVERNANCE ACTIVE</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {pendingApprovals.filter(a => a.status === 'PENDING').length} Permohonan Pending
                  </span>
                </div>
              </div>

              {govAuditBanner && (
                <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-200">{govAuditBanner}</p>
                  </div>
                  <button onClick={() => setGovAuditBanner(null)} className="text-xs text-emerald-400 underline">Tutup</button>
                </div>
              )}

              {/* PENDING APPROVAL REQUESTS (DUMMY DATA HASIL ATURAN GOVERNANCE) */}
              {(() => {
                const ownerFilteredPending = pendingApprovals.filter(req => {
                  if (req.type === 'VOID_TRANSACTION' || req.rule_code.includes('GD-06')) {
                    if (lastTransaction && lastTransaction.customer_name) {
                      const cleanLastCust = lastTransaction.customer_name.toLowerCase().trim();
                      const isSameCustReentry = (
                        req.title.toLowerCase().includes(cleanLastCust) ||
                        req.description.toLowerCase().includes(cleanLastCust)
                      );
                      if (isSameCustReentry) {
                        return false; // Exempt notification for Owner Tier 3!
                      }
                    }
                  }
                  return true;
                });

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Daftar Permohonan Otorisasi Menunggu Persetujuan Owner</span>
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Total Pending: {ownerFilteredPending.filter(a => a.status === 'PENDING').length} Request
                      </span>
                    </div>

                    <div className="space-y-3">
                      {ownerFilteredPending.map((req) => (
                        <div
                          key={req.id}
                          className={`p-4 rounded-xl border transition-all ${
                            req.status === 'PENDING'
                              ? 'bg-slate-950 border-amber-500/30'
                              : req.status === 'APPROVED'
                              ? 'bg-emerald-950/30 border-emerald-500/30 opacity-70'
                              : 'bg-rose-950/30 border-rose-500/30 opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between text-xs">
                            <div className="space-y-1 max-w-2xl">
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-purple-950 text-purple-300 border border-purple-500/30">
                                  {req.rule_code}
                                </span>
                                <span className="font-mono text-[10px] text-slate-500">{req.id}</span>
                                <h4 className="font-bold text-white text-sm">{req.title}</h4>
                              </div>

                              <p className="text-slate-300 text-xs">{req.description}</p>

                              <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                                <span>Pemohon: <strong className="text-white">{req.applicant_name}</strong></span>
                                <span>Waktu Pengajuan: <strong className="text-slate-300 font-mono">{req.timestamp}</strong></span>
                                {req.amount > 0 && (
                                  <span>Nominal/Nilai: <strong className="text-emerald-400 font-mono">Rp {req.amount.toLocaleString('id-ID')}</strong></span>
                                )}
                              </div>
                            </div>

                            <div className="text-right space-y-2">
                              {req.status === 'PENDING' ? (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleApproveGovRequest(req.id, 'APPROVED')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all"
                                  >
                                    ✓ SETUJUI (APPROVE)
                                  </button>
                                  <button
                                    onClick={() => handleApproveGovRequest(req.id, 'REJECTED')}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg shadow transition-all"
                                  >
                                    ✕ TOLAK (REJECT)
                                  </button>
                                </div>
                              ) : (
                                <span className={`px-3 py-1 rounded text-xs font-bold font-mono inline-block ${
                                  req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  STATUS: {req.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* MASTER CATALOG & BAHAN BAKU (BOM) MANAGEMENT (KHUSUS OWNER EXECUTIVE CONTROL) */}
              {activeRole === 'OWNER' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg mb-6">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <PackageCheck className="w-4 h-4 text-emerald-400" />
                        <span>Master Layanan, Harga Jual POS, HPP, & Bahan Baku / BOM</span>
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Total: {masterCatalogList.length} Layanan Master
                    </span>
                  </div>

                  {catalogBannerMsg && (
                    <div className="bg-emerald-950/80 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300 font-bold animate-fadeIn">
                      <span>{catalogBannerMsg}</span>
                      <button onClick={() => setCatalogBannerMsg(null)} className="underline text-emerald-400">Tutup</button>
                    </div>
                  )}

                  {/* FORM INPUT MASTER LAYANAN & BOM */}
                  <form onSubmit={handleAddMasterCatalogItem} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                    <h4 className="font-bold text-white text-xs flex items-center space-x-1">
                      <span>+ Register Layanan & Rincian Bahan Baku (BOM) Baru (Otorisasi Owner)</span>
                    </h4>

                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Nama Layanan *</label>
                        <input
                          type="text"
                          required
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="Contoh: Grooming Cat Special / Spa Treatment..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Harga Jual POS (Rp) *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newServicePrice}
                          onChange={(e) => setNewServicePrice(e.target.value)}
                          placeholder="Contoh: 150000"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Perkiraan HPP (Rp)</label>
                        <input
                          type="number"
                          value={newServiceHpp}
                          onChange={(e) => setNewServiceHpp(e.target.value)}
                          placeholder="Default 40% dari Harga"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Rincian Bahan Baku (BOM) *</label>
                        <input
                          type="text"
                          required
                          value={newServiceBom}
                          onChange={(e) => setNewServiceBom(e.target.value)}
                          placeholder="Contoh: Sabun 50ml, Shampo 30ml, Microfiber 1 pcs..."
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow transition-all"
                    >
                      💾 Simpan Master Layanan & BOM Baru
                    </button>
                  </form>

                  {/* TABLE MASTER LAYANAN TERDAPAT */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                          <th className="p-3">SKU</th>
                          <th className="p-3">Nama Layanan Master</th>
                          <th className="p-3 text-right">Harga Jual POS (Rp)</th>
                          <th className="p-3 text-right">HPP (Rp)</th>
                          <th className="p-3">Rincian Bahan Baku (BOM / Material)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {masterCatalogList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-mono text-[11px] text-purple-400 font-bold">{item.sku}</td>
                            <td className="p-3 font-bold text-white">{item.nama}</td>
                            <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                              Rp {item.base_harga.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-right text-slate-400 font-mono">
                              Rp {item.hpp.toLocaleString('id-ID')}
                            </td>
                            <td className="p-3 text-slate-300 text-[11px]">
                              <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-amber-300 font-mono">
                                {item.bahan_baku || 'Bahan Baku Service Standard'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* MASTER DATA PEGAWAI & STAF MANAGEMENT (KHUSUS OWNER EXECUTIVE CONTROL) */}
              {activeRole === 'OWNER' && (
                <div className="space-y-4">
                  {/* MODUL MASTER CLIENT DATA & AKTIVASI SISTEM PILIN */}
                  {clientActivationData && (
                    <div className="bg-slate-900 border border-orange-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            <span>Master Data Client & Registrasi Aktivasi PILIN</span>
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 font-mono text-[10px] font-bold rounded-lg border border-orange-500/30">
                          ID Aktivasi: {clientActivationData.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-400 text-[11px] block">Nama Client / Owner</span>
                          <strong className="text-white font-bold">{clientActivationData.ownerName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Nama Bisnis / Brand</span>
                          <strong className="text-orange-400 font-bold">{clientActivationData.businessName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Industri / Sektor</span>
                          <strong className="text-slate-200">{clientActivationData.industry}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Kontak WhatsApp</span>
                          <strong className="text-emerald-400 font-mono">{clientActivationData.phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Paket SaaS PILIN</span>
                          <strong className="text-blue-300">{clientActivationData.packagePlan}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Tanggal Aktivasi</span>
                          <strong className="text-slate-300 font-mono">{clientActivationData.activationDate}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Mode Environment</span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] inline-block border ${
                            systemEnvMode === 'LIVE'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            {systemEnvMode === 'LIVE' ? '🟢 LIVE PRODUCTION' : '🎮 DEMO / TRIAL'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">Database Reset Status</span>
                          <strong className="text-emerald-400 text-[11px]">
                            {liveMetricsReset ? '🧹 Clean Slate (Rp 0 Omzet Asli)' : '📦 Demo Preloaded'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONFIGURASI AKUN EMAIL & PASSWORD OWNER */}
                  <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        <span>Pengaturan Akun Email & Password Executive Owner</span>
                      </h3>
                      <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        👑 Executive Credentials
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Alamat Email Log-in Owner *</label>
                        <input
                          type="email"
                          required
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Password Log-in Owner *</label>
                        <input
                          type="text"
                          required
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span>Master Data Pegawai & Staf (Pendaftaran Akun & Password)</span>
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {selectedEmpIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleBulkDeleteEmployees}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1 animate-fadeIn"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>🗑️ Hapus ({selectedEmpIds.length}) Pegawai Terpilih</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleResetDemoMasterData}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[11px] font-bold transition-all"
                          title="Restore Data Demo Pegawai & Aktivasi ke Default"
                        >
                          🔄 Restore Data Demo Default
                        </button>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Total: {employeeMasterList.length} Staf Terdaftar
                        </span>
                      </div>
                    </div>

                      {empBannerMsg && (
                        <div className="bg-blue-950/80 border border-blue-500/40 rounded-xl p-3 flex items-center justify-between text-xs text-blue-300 font-bold animate-fadeIn">
                          <span>{empBannerMsg}</span>
                          <button onClick={() => setEmpBannerMsg(null)} className="underline text-blue-400">Tutup</button>
                        </div>
                      )}

                      {/* FORM INPUT MASTER PEGAWAI BARU */}
                      <form onSubmit={handleAddMasterEmployee} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                        <h4 className="font-bold text-white text-xs flex items-center space-x-1">
                          <span>+ Register Pegawai / Staf Baru (Otorisasi Owner)</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Nama Lengkap Pegawai *</label>
                            <input
                              type="text"
                              required
                              value={newEmpNama}
                              onChange={(e) => setNewEmpNama(e.target.value)}
                              placeholder="Contoh: Rina Melati"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">No Kontak / WhatsApp *</label>
                            <input
                              type="text"
                              required
                              value={newEmpPhone}
                              onChange={(e) => setNewEmpPhone(e.target.value)}
                              placeholder="Contoh: 081234567890"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Alamat Email (Opsional)</label>
                            <input
                              type="email"
                              value={newEmpEmail}
                              onChange={(e) => setNewEmpEmail(e.target.value)}
                              placeholder="rina@pilin.id"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="text-slate-300 font-semibold block mb-1">Jabatan / Role Cabang *</label>
                            <select
                              value={newEmpRole}
                              onChange={(e) => setNewEmpRole(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-bold focus:outline-none focus:border-blue-500"
                            >
                              <option value="Kasir Utama">Kasir POS Utama</option>
                              <option value="Kepala Cabang">Kepala Cabang</option>
                              <option value="Produksi">Produksi</option>
                              <option value="Admin">Admin</option>
                              <option value="LAINNYA">✏️ Lainnya (Input Manual Owner...)</option>
                            </select>
                            {(newEmpRole === 'LAINNYA' || newEmpRole.includes('Lainnya')) && (
                              <input
                                type="text"
                                required
                                value={newEmpCustomRole}
                                onChange={(e) => setNewEmpCustomRole(e.target.value)}
                                placeholder="Ketik Nama Jabatan (Contoh: Quality Control / Kurir)"
                                className="w-full bg-slate-900 border-2 border-amber-500/80 rounded px-2.5 py-1.5 mt-1.5 text-amber-300 font-bold focus:outline-none focus:border-amber-400 text-xs shadow-sm animate-fadeIn"
                              />
                            )}
                          </div>

                          <div>
                            <label className="text-blue-400 font-bold block mb-1 flex items-center space-x-1">
                              <Building2 className="w-3.5 h-3.5 text-blue-400" />
                              <span>🏢 Penugasan Lokasi Cabang *</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={newEmpBranch}
                              onChange={(e) => setNewEmpBranch(e.target.value)}
                              placeholder="Ketik Lokasi / Nama Cabang (Contoh: Cabang Utama - Jakarta Pusat)"
                              className="w-full bg-slate-900 border-2 border-blue-500/80 rounded px-2.5 py-1.5 text-blue-300 font-bold focus:outline-none focus:border-blue-400 text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-amber-400 font-bold block mb-1 flex items-center space-x-1">
                              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              <span>🔑 Password Log-in Pegawai *</span>
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={8}
                              value={newEmpPin}
                              onChange={(e) => setNewEmpPin(e.target.value)}
                              placeholder="Masukkan Password 4 Digit (contoh: 1234)"
                              className="w-full bg-slate-900 border-2 border-amber-500/80 rounded px-2.5 py-1.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400 shadow-sm"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-1.5 text-xs"
                          >
                            <span>💾 Simpan Pegawai, Lokasi Cabang & Password Ke Database</span>
                          </button>
                        </div>
                      </form>

                      {/* TABLE MASTER PEGAWAI TERDAFTAR */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                              <th className="p-3 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={employeeMasterList.length > 0 && selectedEmpIds.length === employeeMasterList.length}
                                  onChange={(e) => handleToggleSelectAllEmp(e.target.checked)}
                                  className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                  title="Pilih Semua Pegawai"
                                />
                              </th>
                              <th className="p-3">ID Staf</th>
                              <th className="p-3">Nama Pegawai</th>
                              <th className="p-3">No Kontak (WA)</th>
                              <th className="p-3">Alamat Email</th>
                              <th className="p-3">Role / Jabatan</th>
                              <th className="p-3">🔑 Password Log-in (4 Digit)</th>
                              <th className="p-3">Lokasi Cabang</th>
                              <th className="p-3 text-center">Aksi (Hapus)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {employeeMasterList.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="p-4 text-center text-slate-500 italic">
                                  Belum ada pegawai terdaftar. Silakan Owner isi form di atas untuk mendaftarkan pegawai baru!
                                </td>
                              </tr>
                            ) : (
                              employeeMasterList.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                                  <td className="p-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={selectedEmpIds.includes(emp.id)}
                                      onChange={() => handleToggleSelectEmp(emp.id)}
                                      className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-3 font-mono text-[11px] text-blue-400 font-bold">{emp.id}</td>
                                  <td className="p-3 font-bold text-white">{emp.nama}</td>
                                  <td className="p-3 font-mono text-emerald-400">{emp.no_hp}</td>
                                  <td className="p-3 text-slate-400 font-mono">{emp.email}</td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                      {emp.role}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-amber-300">
                                    <div className="flex items-center space-x-2">
                                      <span className="bg-slate-950 px-2.5 py-1 rounded border border-amber-500/40 font-bold text-amber-300">
                                        🔑 {emp.password_pin || '1234'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newP = prompt(`Masukkan Password / PIN 4-Digit Baru untuk ${emp.nama}:`, emp.password_pin || '1234');
                                          if (newP && newP.trim()) {
                                            handleOwnerUpdateEmployeePin(emp.id, newP.trim());
                                          }
                                        }}
                                        className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-[10px] rounded font-sans font-bold border border-amber-500/40 transition-all"
                                        title="Owner Edit Password Pegawai Ini"
                                      >
                                        ✏️ Ubah Password
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-400 text-[11px]">{emp.branch}</td>
                                  <td className="p-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Yakin ingin menghapus pegawai ${emp.nama} (${emp.role}) dari Master Database?`)) {
                                          handleDeleteMasterEmployee(emp.id);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[11px] font-bold transition-all shadow-sm flex items-center justify-center space-x-1 mx-auto"
                                      title="Hapus Pegawai Ini dari Database"
                                    >
                                      <Ban className="w-3 h-3 text-rose-400" />
                                      <span>🗑️ Hapus</span>
                                    </button>
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
            </div>
          )}

          {/* ANALISIS INTELIGENSI & EXECUTIVE AI INSIGHTS SURFACE (DOMAIN 10 - OWNER EXCLUSIVE) */}
          {activeTab === 'intelligence' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Analisis Inteligensi Bisnis & Executive Insights</h2>
                    <p className="text-xs text-slate-400">Hasil Olahan Data Nota Transaksi, SPK Pengerjaan, & LTV Pelanggan Untuk Pengambilan Keputusan Strategis</p>
                  </div>
                </div>

                <div className="bg-amber-950 px-4 py-2 rounded-xl border border-amber-500/40 text-right text-xs">
                  <span className="text-amber-300 font-bold block text-[11px]">🧠 AI ENGINE ACTIVE</span>
                  <span className="text-emerald-400 font-mono font-bold">Repeat Purchase Rate: 68.5%</span>
                </div>
              </div>

              {/* SECTION 1: LTV & REPEAT PURCHASE ANALYTICS */}
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>1. Analisis LTV & Repeat Purchase Pelanggan</span>
                    </h3>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      OPTIMAL RETENTION
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Repeat Rate</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">68.5%</p>
                      <span className="text-[10px] text-slate-500">Berdasar 120 Nota POS</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Avg LTV VIP</span>
                      <p className="text-xl font-bold text-purple-400 mt-1 font-mono">Rp 12.5M</p>
                      <span className="text-[10px] text-slate-500">Rata-rata 8 Transaksi</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px]">Active Customer</span>
                      <p className="text-xl font-bold text-blue-400 mt-1 font-mono">Rp 3.8M</p>
                      <span className="text-[10px] text-slate-500">Rata-rata 3 Transaksi</span>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px]">At-Risk (H+45)</span>
                      <p className="text-xl font-bold text-amber-400 mt-1 font-mono">14 Orang</p>
                      <span className="text-[10px] text-slate-500">Target WA Reminder</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      💡 <strong>Kesimpulan Inteligensi:</strong> Pelanggan Kategori <em>Spa & Salon</em> dan <em>Pet Shop</em> menunjukkan rasio kedatangan ulang paling tinggi (78%). Nota POS pertama berhasil dikonversi menjadi hubungan jangka panjang melalui WA Reminder otomatis.
                    </p>
                  </div>
                </div>

                {/* SECTION 2: PEAK HOURS & TRAFFIC DISTRIBUTION */}
                <div className="col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>2. Distibusi Jam Ramai vs Jam Sepi</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-300">HAPPY HOURS TARGET</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">09.00 - 12.00 (Pagi)</span>
                      <div className="w-32 bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full w-[65%]"></div>
                      </div>
                      <span className="font-mono text-slate-300">65% Transaksi</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-rose-950/40 p-1.5 rounded border border-rose-500/30">
                      <span className="text-rose-300 font-bold">13.00 - 15.00 (Siang Sepi)</span>
                      <div className="w-32 bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full w-[20%]"></div>
                      </div>
                      <span className="font-mono text-rose-300 font-bold">20% (TARGET HAPPY HOURS)</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">16.00 - 20.00 (Sore/Malam Peak)</span>
                      <div className="w-32 bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[95%]"></div>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">95% Peak Hours</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: REKOMENDASI TINDAKAN STRATEGIS AI EXECUTIVE INSIGHTS */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>3. Rekomendasi Tindakan Strategis Otomatis (Executive Action Insights)</span>
                  </h3>
                  <span className="text-xs font-mono text-slate-400">Sistem Inteligensi PILIN BOS</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      INVENTARIS & BAHAN BAKU
                    </span>
                    <h4 className="font-bold text-white text-sm">Restock Bahan Baku Minyak SPA</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Permintaan treatment SPA naik 35% minggu ini. Disarankan menambah stok minyak pelembab 50ml untuk mencegah keterlambatan SLA.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      PROMOSI JAM SEPI
                    </span>
                    <h4 className="font-bold text-white text-sm">Aktivasi Promo Happy Hours Siang</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Lalu lintas transaksi jam 13.00 - 15.00 terdeteksi sepi (hanya 20% kapasitas). Pengaktifan promo Happy Hours diskon 15% berpotensi menaikkan transaksi 40%.
                    </p>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      KINERJA PEGAWAI
                    </span>
                    <h4 className="font-bold text-white text-sm">Apresiasi Kinerja Staf Ani</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Staf Ani menyelesaikan SPK 20 menit lebih cepat dari SLA standar dengan nilai kepuasan konsumen 98%. Direkomendasikan bonus poin gamifikasi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMMERCIAL PRICING & MODULAR FEATURE SUBSCRIPTION DASHBOARD V1.1 */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* LOW BALANCE ALERT NOTIFICATION (Rule V1.1 #3 & #5) */}
              {(saldoPilin < LOW_BALANCE_ALERT_THRESHOLD || activeLowBalAlert) && (
                <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-xl p-5 shadow-xl animate-pulse flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400 border border-rose-500/40">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-rose-900 text-rose-200 border border-rose-500/50">
                        🚨 ALERT SALDO PILIN RENDAH (OWNER NOTIFICATION)
                      </span>
                      <h3 className="font-bold text-white text-base mt-1">Saldo PILIN Customer di Bawah Batas Minimum Alert!</h3>
                      <div className="text-slate-300 text-xs mt-0.5 space-x-3 font-mono">
                        <span>Customer: <strong className="text-white">ABC Store (CUST-001)</strong></span>
                        <span>|</span>
                        <span>Saldo Saat Ini: <strong className="text-rose-400 font-bold">Rp {saldoPilin.toLocaleString('id-ID')}</strong></span>
                        <span>|</span>
                        <span>Batas Alert: <strong className="text-amber-300">Rp {LOW_BALANCE_ALERT_THRESHOLD.toLocaleString('id-ID')}</strong></span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const el = document.getElementById('topup-wallet-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Top Up Saldo PILIN Sekarang</span>
                  </button>
                </div>
              )}

              {/* HEADER BANNER COMMERCIAL MODEL */}
              <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Model Komersial &amp; Langganan Modular PILIN V1.1</h2>
                    <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                      <span>4 Charging Layer Terpisah</span>
                      <span>•</span>
                      <span>Aktivasi Rp 1M</span>
                      <span>•</span>
                      <span>Langganan Modular</span>
                      <span>•</span>
                      <span>Saldo PILIN (Min. Rp 100k)</span>
                      <span>•</span>
                      <span>WA Rp 350/pesan</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleDemoMode(!isDemoMode)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      isDemoMode
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {isDemoMode ? '🧪 MODE DEMO (Rp 500.000 DEMO ONLY)' : '🏢 MODE PRODUKSI (Default Rp 0)'}
                  </button>
                </div>
              </div>

              {/* 4 SEPARATE CHARGING LAYERS GRID (AUTHORITATIVE V1.1) */}
              <div className="grid grid-cols-4 gap-4">
                {/* LAYER 1: ACTIVATION FEE */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-5 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      LAYER 1: ACTIVATION FEE
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold">Biaya Aktivasi (One-Time)</span>
                    <h3 className="text-xl font-extrabold text-white">Rp {ACTIVATION_FEE_AMOUNT.toLocaleString('id-ID')}</h3>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Masa Promo:</span>
                      <strong className="text-emerald-300">s/d 31 Des 2026</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Status Akun:</span>
                      <strong className="text-emerald-400">✓ TERAKTIVASI RESMI</strong>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span>Komisi Sales (5%):</span>
                      <strong className="text-amber-300 font-mono">Rp {(ACTIVATION_FEE_AMOUNT * 0.05).toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                </div>

                {/* LAYER 2: SALDO PILIN WALLET */}
                <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-3" id="topup-wallet-section">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                      LAYER 3: USAGE WALLET
                    </span>
                    <DollarSign className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold flex items-center justify-between">
                      <span>Saldo PILIN (Deposit Prepaid)</span>
                      {isDemoMode && <span className="text-[9px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded">DEMO / TEST DATA ONLY</span>}
                    </span>
                    <h3 className={`text-xl font-extrabold font-mono ${saldoPilin < LOW_BALANCE_ALERT_THRESHOLD ? 'text-rose-400 animate-pulse' : 'text-indigo-300'}`}>
                      Rp {saldoPilin.toLocaleString('id-ID')}
                    </h3>
                  </div>

                  <form onSubmit={handleTopUpWallet} className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="flex space-x-1.5">
                      <input
                        type="number"
                        min="100000"
                        step="50000"
                        required
                        value={topUpInputAmount}
                        onChange={(e) => setTopUpInputAmount(e.target.value)}
                        placeholder="Min. 100000"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-sm whitespace-nowrap"
                      >
                        + Top Up
                      </button>
                    </div>
                    {topUpErrorMsg && <p className="text-[10px] text-rose-400 font-bold">{topUpErrorMsg}</p>}
                    {topUpSuccessMsg && <p className="text-[10px] text-emerald-400 font-bold">{topUpSuccessMsg}</p>}
                  </form>
                </div>

                {/* LAYER 3: MONTHLY FEATURE SUBSCRIPTIONS */}
                <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                      LAYER 2: FEATURE SUBSCRIPTION
                    </span>
                    <Layers className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold">Total Langganan Fitur Bulanan</span>
                    <h3 className="text-xl font-extrabold text-purple-300 font-mono">
                      Rp {monthlySubCalc.totalMonthlyFee.toLocaleString('id-ID')}<span className="text-xs text-slate-400 font-normal">/bln</span>
                    </h3>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Fitur Aktif:</span>
                      <strong className="text-purple-300 font-mono">{subscribedFeatures.length} Fitur Modular</strong>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span>Komisi Sales (5%):</span>
                      <strong className="text-amber-300 font-mono">Rp {(monthlySubCalc.totalMonthlyFee * 0.05).toLocaleString('id-ID')}</strong>
                    </div>
                  </div>
                </div>

                {/* LAYER 4: WHATSAPP USAGE CHARGE */}
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30">
                      LAYER 4: WA USAGE CHARGE
                    </span>
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-semibold">Tarif Komunikasi WhatsApp</span>
                    <h3 className="text-xl font-extrabold text-amber-300 font-mono">
                      Rp {WA_MESSAGE_UNIT_PRICE}<span className="text-xs text-slate-400 font-normal">/pesan WA</span>
                    </h3>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Pesan Berhasil Terkirim:</span>
                      <strong className="text-emerald-400 font-mono">{usageLedger.filter(l => l.status === 'SUCCESS').length} Pesan</strong>
                    </div>
                    <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span>Komisi Sales (0%):</span>
                      <strong className="text-slate-400 font-mono">Rp 0 (NON-COMMISSIONABLE)</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODULAR FEATURE SUBSCRIPTION MANAGER GRID (AUTHORITATIVE CATEGORIES) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>Manajer Fitur Langganan Modular PILIN (Skema 00018 Authoritative)</span>
                    </h3>
                    <div className="text-[11px] text-purple-300 font-semibold mt-0.5">
                      📌 Konsumen hanya membayar fitur yang diaktifkan secara independen. Tanpa paksaan paket/tier.
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-purple-300 bg-purple-950 px-3 py-1 rounded-lg border border-purple-500/30">
                    Total Biaya Fitur: Rp {monthlySubCalc.totalMonthlyFee.toLocaleString('id-ID')} / bulan
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {(['CUSTOMER_RELATIONSHIP', 'CUSTOMER_GROWTH', 'CUSTOMER_CAMPAIGN', 'CUSTOMER_ADVOCACY'] as const).map(catKey => {
                    const catName = catKey === 'CUSTOMER_RELATIONSHIP' ? 'Customer Relationship'
                      : catKey === 'CUSTOMER_GROWTH' ? 'Customer Growth'
                      : catKey === 'CUSTOMER_CAMPAIGN' ? 'Customer Campaign'
                      : 'Customer Advocacy';
                    
                    const catItems = PILIN_FEATURE_PRICING_CATALOG.filter(f => f.category === catKey);

                    return (
                      <div key={catKey} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                            <span className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded ${
                              catKey === 'CUSTOMER_RELATIONSHIP' ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                              : catKey === 'CUSTOMER_GROWTH' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              : catKey === 'CUSTOMER_CAMPAIGN' ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                            }`}>
                              {catName}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {catItems.map(feat => {
                              const isSubbed = UsageWalletService.isFeatureSubscribed(feat.code);
                              return (
                                <div key={feat.id} className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                                  isSubbed ? 'bg-slate-900 border-indigo-500/40 text-white' : 'bg-slate-950 border-slate-800/80 text-slate-400'
                                }`}>
                                  <div>
                                    <div className="font-bold text-xs text-white flex items-center space-x-1.5">
                                      <span>{feat.name}</span>
                                      {feat.isAddon && <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30">ADD-ON</span>}
                                    </div>
                                    <div className="text-[10px] text-emerald-400 font-mono font-bold">
                                      Rp {feat.monthlyPrice.toLocaleString('id-ID')}/bln
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleToggleFeature(feat.code)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                      isSubbed
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    }`}
                                  >
                                    {isSubbed ? '✓ AKTIF' : '+ AKTIFKAN'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SALES COMMISSION ENGINE SUMMARY WIDGET (RULE V1.1 #14) */}
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 space-y-3 shadow-lg">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Ringkasan Kalkulasi Komisi Sales (MINARA Engine 5% Rate Rule V1.1)</span>
                  </h3>
                  <span className="text-xs font-mono text-amber-300 font-bold">Sales Owner: {salesCommissionSummary.salesOwnerName}</span>
                </div>

                <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Aktivasi (Commissionable 5%)</span>
                    <span className="text-white font-bold block mt-0.5">Rp {salesCommissionSummary.activationFee.toLocaleString('id-ID')}</span>
                    <span className="text-emerald-400 text-[11px] font-bold block mt-1">Komisi: Rp {salesCommissionSummary.activationFeeCommission.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Langganan Fitur (Commissionable 5%)</span>
                    <span className="text-white font-bold block mt-0.5">Rp {salesCommissionSummary.recurringFeatureFee.toLocaleString('id-ID')}/bln</span>
                    <span className="text-emerald-400 text-[11px] font-bold block mt-1">Komisi: Rp {salesCommissionSummary.recurringFeatureCommission.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Saldo Deposit (Non-Commissionable 0%)</span>
                    <span className="text-slate-300 font-bold block mt-0.5">Rp {salesCommissionSummary.walletDepositAmount.toLocaleString('id-ID')}</span>
                    <span className="text-slate-500 text-[11px] font-bold block mt-1">Komisi: Rp 0 (0%)</span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Penggunaan WA (Non-Commissionable 0%)</span>
                    <span className="text-slate-300 font-bold block mt-0.5">Rp {salesCommissionSummary.whatsAppUsageAmount.toLocaleString('id-ID')}</span>
                    <span className="text-slate-500 text-[11px] font-bold block mt-1">Komisi: Rp 0 (0%)</span>
                  </div>
                </div>

                <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between font-bold text-xs">
                  <span className="text-amber-300">Total Komisi Hak Sales Terhitung:</span>
                  <span className="text-amber-300 font-mono text-sm">Rp {salesCommissionSummary.totalCommissionEarned.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* LIVE AUDITABLE USAGE LEDGER TABLE (RULE V1.1 #11 & #12) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <ClipboardList className="w-4 h-4 text-indigo-400" />
                    <span>Audit Trail Ledger Penggunaan Saldo PILIN &amp; WA (Rule V1.1 #11 &amp; #12)</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Total Trx Audit: {usageLedger.length} Entri</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Sumber Fitur</th>
                        <th className="p-3">Kelas Komunikasi</th>
                        <th className="p-3">Penerima</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Tarif Unit</th>
                        <th className="p-3 text-right">Total Potongan</th>
                        <th className="p-3 text-right">Saldo (Awal ➔ Akhir)</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {usageLedger.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500">
                            Belum ada entri penggunaan Saldo PILIN. Saldo PILIN aman &amp; audit trail siap mencatat pengiriman WA secara real-time.
                          </td>
                        </tr>
                      ) : (
                        usageLedger.map((lg) => (
                          <tr key={lg.id} className="hover:bg-slate-800/40 transition-all">
                            <td className="p-3 text-slate-400">{new Date(lg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                            <td className="p-3 font-bold text-white">{lg.source}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                lg.communicationType === 'TRANSACTIONAL'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                                  : lg.communicationType === 'CUSTOMER_RELATIONSHIP'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              }`}>
                                {lg.communicationType}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300">{lg.recipientRef}</td>
                            <td className="p-3 text-center font-bold">{lg.quantity}</td>
                            <td className="p-3 text-right">Rp {lg.unitPrice.toLocaleString('id-ID')}</td>
                            <td className={`p-3 text-right font-bold ${lg.totalCharge < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {lg.totalCharge < 0 ? `+Rp ${(-lg.totalCharge).toLocaleString('id-ID')}` : `-Rp ${lg.totalCharge.toLocaleString('id-ID')}`}
                            </td>
                            <td className="p-3 text-right text-slate-400">
                              Rp {lg.previousBalance.toLocaleString('id-ID')} ➔ <strong className="text-white">Rp {lg.newBalance.toLocaleString('id-ID')}</strong>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                lg.status === 'SUCCESS' || lg.status === 'TOPUP_SUCCESS'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {lg.status}
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

          {/* AUTO PROMOTION ENGINE SURFACE (DOMAIN 04 - PHASE 8 FOCUS) */}
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Promosi Otomatis & Trigger Diskon (Domain 04)</h2>
                    <p className="text-sm text-slate-400">Evaluasi Tren Omzet Cabang, Generator Kode Promo & Validator Diskon POS (Skema 00013)</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPromoForm(!showPromoForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-indigo-500/20 transition-all"
                >
                  {showPromoForm ? 'Batal Tambah' : '+ Buat Aturan Promosi Baru'}
                </button>
              </div>

              {/* Promo Banner Message */}
              {promoBannerMessage && (
                <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                    <p className="text-sm font-bold text-indigo-300">{promoBannerMessage}</p>
                  </div>
                  <button
                    onClick={() => setPromoBannerMessage(null)}
                    className="text-xs text-indigo-400 hover:text-indigo-200 underline"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* 3 KATEGORI STRATEGI PROMOSI KEPALA CABANG */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40">
                      STRATEGI 1: WAKTU
                    </span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <h4 className="font-bold text-white text-xs">🕒 Promo Berdasarkan Waktu (Happy Hours Jam Sepi)</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Pengaktifan diskon otomatis pada jam sepi (misal: 13.00 - 15.00) untuk mendongkrak trafik &amp; utilisasi kapasitas pengerjaan cabang.
                  </p>
                </div>

                <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/40">
                      STRATEGI 2: MILESTONE
                    </span>
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <h4 className="font-bold text-white text-xs">🎯 Promo Berdasarkan Milestone (Target Transaksi)</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Diskon/Reward otomatis ketika konsumen mencapai milestone transaksi tertentu (misal: 5x transaksi / 10x treatment POS).
                  </p>
                </div>

                <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      STRATEGI 3: RETENSI / MIN SPEND
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h4 className="font-bold text-white text-xs">💰 Promo Berdasarkan Minimal Belanja &amp; Retensi</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Voucher diskon otomatis untuk transaksi yang memenuhi ambang minimal belanja (misal: Belanja &gt; Rp 150rb diskon 15%).
                  </p>
                </div>
              </div>

              {/* Omzet Trend Evaluator & Tester Grid */}
              <div className="grid grid-cols-12 gap-6">
                {/* Omzet Trigger Evaluator (Left 6 Cols) */}
                <div className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Evaluator Omzet & Syarat Trigger Otomatis</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Omzet Minggu Lalu vs Sesi Ini:</span>
                      <strong className="text-white">Rp {prevWeekRevenue.toLocaleString('id-ID')} ➔ Rp {currPeriodRevenue.toLocaleString('id-ID')}</strong>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Rasio Penurunan Omzet:</span>
                      <span className={`font-mono font-bold ${promoEval.dropPercentage >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {promoEval.dropPercentage}% (Threshold: &gt;= 50%)
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Tanggal Bulan Ini (Exclusion Gate):</span>
                      <span className="font-mono text-slate-300">Tanggal {dayOfMonth} (Blackout: 15-23)</span>
                    </div>

                    <div className={`p-3 rounded-xl border flex items-center justify-between font-bold ${
                      promoEval.shouldTriggerPromo
                        ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}>
                      <span>Status Trigger Promosi Otomatis:</span>
                      <span className="px-2.5 py-1 rounded text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {promoEval.shouldTriggerPromo ? 'PROMO ACTIVATED' : 'STANDBY (NORMAL)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Voucher Code Tester Tool (Right 6 Cols) */}
                <form onSubmit={handleTestPromo} className="col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Percent className="w-4 h-4 text-emerald-400" />
                    <span>Uji Kelayakan Voucher Diskon POS</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Kode Promo</label>
                      <input
                        type="text"
                        required
                        value={testPromoCode}
                        onChange={(e) => setTestPromoCode(e.target.value)}
                        placeholder="GAJIAN10"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 font-semibold block mb-1">Simulasi Total Belanja (Rp)</label>
                      <input
                        type="number"
                        required
                        value={testCartAmount}
                        onChange={(e) => setTestCartAmount(e.target.value)}
                        placeholder="150000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-all"
                  >
                    Uji Kode Voucher
                  </button>

                  {testPromoResult && (
                    <div className={`p-3 rounded-lg border text-xs ${
                      testPromoResult.isValid
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                    }`}>
                      <p className="font-bold">{testPromoResult.message}</p>
                      {testPromoResult.isValid && (
                        <p className="font-mono text-[11px] mt-1">Potongan Diskon Disetujui: Rp {testPromoResult.discountAmount.toLocaleString('id-ID')}</p>
                      )}
                    </div>
                  )}
                </form>
              </div>

              {/* Quick Promotion Creation Form */}
              {showPromoForm && (
                <form onSubmit={handleCreatePromo} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Gift className="w-4 h-4 text-indigo-400" />
                    <span>Form Pembuatan Aturan Promosi Baru (Skema 00013)</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Nama Promosi *</label>
                      <input
                        type="text"
                        required
                        value={promoName}
                        onChange={(e) => setPromoName(e.target.value)}
                        placeholder="Contoh: Promo Akhir Pekan"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Kode Voucher (Unik) *</label>
                      <input
                        type="text"
                        required
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Contoh: WEEKEND15"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Kategori Strategi Promosi *</label>
                      <select
                        value={promoCategory}
                        onChange={(e) => setPromoCategory(e.target.value as 'TIME_BASED' | 'MILESTONE' | 'MIN_SPEND')}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="TIME_BASED">🕒 Promo Berdasarkan Waktu (Happy Hours Jam Sepi)</option>
                        <option value="MILESTONE">🎯 Promo Berdasarkan Milestone (Target Transaksi)</option>
                        <option value="MIN_SPEND">💰 Promo Berdasarkan Minimal Belanja / Retensi</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Tipe Diskon *</label>
                      <select
                        value={promoType}
                        onChange={(e) => setPromoType(e.target.value as 'FIXED_AMOUNT' | 'PERCENTAGE')}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="PERCENTAGE">PERCENTAGE (% Persentase)</option>
                        <option value="FIXED_AMOUNT">FIXED_AMOUNT (Rp Nominal)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Nilai Diskon (% atau Rp) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={promoValue}
                        onChange={(e) => setPromoValue(e.target.value)}
                        placeholder="Contoh: 15 (untuk 15%) atau 15000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-semibold block mb-1">Minimal Belanja (Rp)</label>
                      <input
                        type="number"
                        value={promoMinSpend}
                        onChange={(e) => setPromoMinSpend(e.target.value)}
                        placeholder="Contoh: 100000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowPromoForm(false)}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Simpan Promosi
                    </button>
                  </div>
                </form>
              )}

              {/* Active Promotions Rules Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">Daftar Aturan Promosi Aktif (Skema 00013)</h3>
                  <span className="text-xs text-slate-400">Total: {promotionsList.length} Aturan Promosi</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3">Nama Promosi</th>
                        <th className="p-3">Kategori Strategi</th>
                        <th className="p-3">Kode Voucher</th>
                        <th className="p-3">Tipe Diskon</th>
                        <th className="p-3 text-right">Nilai Potongan</th>
                        <th className="p-3 text-right">Min Spend (Rp)</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {promotionsList.map((prm) => (
                        <tr key={prm.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                          <td className="p-3 font-bold text-white">{prm.name}</td>
                          <td className="p-3">
                            {prm.category === 'TIME_BASED' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                🕒 WAKTU (HAPPY HOURS)
                              </span>
                            ) : prm.category === 'MILESTONE' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                🎯 MILESTONE TRANSAKSI
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                💰 MIN. BELANJA / RETENSI
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono">
                            <span className="px-2 py-0.5 rounded font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {prm.code}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400">{prm.discount_type}</td>
                          <td className="p-3 text-right font-bold text-emerald-400">
                            {prm.discount_type === 'PERCENTAGE' ? `${prm.discount_value}%` : `Rp ${prm.discount_value.toLocaleString('id-ID')}`}
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono">
                            Rp {prm.min_spend.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {prm.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* STAFF & CUSTOMER GAMIFICATION SURFACE (DOMAIN 10 - DUAL MODE) */}
          {activeTab === 'gamification' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Gamifikasi & Program Loyalitas (Domain 10)</h2>
                    <p className="text-xs text-slate-400">
                      Pusat Kendali Gamifikasi Staf Pegawai & Program Reward Loyalitas Pelanggan POS
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGamificationMode('STAFF');
                      setNewGameTitle('');
                      setNewGameReward('');
                      setNewGamePoints('500');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      gamificationMode === 'STAFF'
                        ? 'bg-amber-600 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>👥 Gamifikasi Staf Pegawai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGamificationMode('CUSTOMER');
                      setNewGameTitle('');
                      setNewGameReward('');
                      setNewGamePoints('500');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      gamificationMode === 'CUSTOMER'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>⭐ Gamifikasi & Loyalty Pelanggan</span>
                  </button>

                  {/* TOMBOL UNTUK MENAMBAH GAMIFIKASI KUSTOM LAINNYA */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewGameTitle('');
                      setNewGameReward('');
                      setNewGamePoints('500');
                      const formElem = document.getElementById('gamification-proposal-form');
                      if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                  >
                    <span>+ Tambah Gamifikasi Lain</span>
                  </button>
                </div>
              </div>

              {/* GAMIFIKASI PELANGGAN (CUSTOMER GAMIFICATION & LOYALTY SURFACES) */}
              {gamificationMode === 'CUSTOMER' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* SECTION TEMPLATE PERMAINAN PELANGGAN */}
                  <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span>1. Template Permainan & Program Loyalitas Pelanggan Siap Pakai</span>
                        </h3>
                        <p className="text-[11px] text-purple-300 font-semibold mt-0.5">
                          📌 Pilih template di bawah ini untuk mengisi usulan program gamifikasi & reward diskon pelanggan.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                        CUSTOMER LOYALTY ENGINE
                      </span>
                    </div>

                    {/* EKSPLIKASI CARA PERMAINAN PELANGGAN */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <h4 className="font-bold text-purple-300 flex items-center space-x-1.5 text-xs">
                        <span>💡 Panduan Cara Kerja & Mekanisme Gamifikasi Pelanggan:</span>
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-[11px] pt-1">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                          <span className="font-bold text-emerald-400 block">1. Transaksi Kasir POS = Stempel/Poin</span>
                          <p className="text-slate-400 leading-relaxed">
                            Pelanggan belanja di POS mendapat <strong className="text-white">1 Stempel Digital / Poin Loyalty</strong> otomatis dari nota kasir.
                          </p>
                        </div>

                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                          <span className="font-bold text-amber-400 block">2. Pencapaian Milestone / Level</span>
                          <p className="text-slate-400 leading-relaxed">
                            Mencapai 5 stempel atau total belanja tertentu membuka <strong className="text-white">Level VIP Platinum / Cash Bonus</strong>.
                          </p>
                        </div>

                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                          <span className="font-bold text-blue-400 block">3. Otorisasi Klaim & WA Notification</span>
                          <p className="text-slate-400 leading-relaxed">
                            Voucher reward dapat langsung diklaim di POS atau dikirim via <strong className="text-white">WA Reminder Otomatis</strong>.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* PRESET TEMPLATE GAMIFIKASI PELANGGAN */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-slate-400 font-semibold block text-[11px]">⚡ Preset Template Gamifikasi Pelanggan (Klik Untuk Mengisi Form):</span>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewGameTitle('🎟️ Stamp Card Digital (5x Transaksi -> Free Treatment)');
                            setNewGameReward('Voucher Gratis Treatment Rp 150.000');
                            setNewGamePoints('500');
                          }}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 rounded-xl text-left transition-all"
                        >
                          <span className="font-bold text-emerald-400 block text-xs">🎟️ Template 1: Stamp Card</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">5x Transaksi POS ➔ Free 1x Treatment</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewGameTitle('👑 VIP Leveling Upgrade (Belanja Rp 2.5 Jt -> VIP Platinum)');
                            setNewGameReward('Diskon Otomatis 15% Semua Service POS + Fast Track');
                            setNewGamePoints('1500');
                          }}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-blue-500/40 rounded-xl text-left transition-all"
                        >
                          <span className="font-bold text-blue-400 block text-xs">👑 Template 2: VIP Tier Upgrade</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Belanja Rp 2.5M ➔ Diskon 15% Permanen</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewGameTitle('🤝 Referral Champion (Ajak 3 Teman Baru Daftar)');
                            setNewGameReward('Cashback Rp 100.000 / Voucher Belanja');
                            setNewGamePoints('750');
                          }}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-purple-500/40 rounded-xl text-left transition-all"
                        >
                          <span className="font-bold text-purple-400 block text-xs">🤝 Template 3: Referral Code</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Ajak 3 Teman ➔ Cashback Rp 100.000</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewGameTitle('🎂 Birthday Special Treat (Diskon Ulang Tahun)');
                            setNewGameReward('Voucher Special Birthday Diskon 30% All Item');
                            setNewGamePoints('300');
                          }}
                          className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 rounded-xl text-left transition-all"
                        >
                          <span className="font-bold text-amber-400 block text-xs">🎂 Template 4: Birthday Gift</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Diskon 30% Bulan Ulang Tahun</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DAFTAR PROGRAM GAMIFIKASI PELANGGAN AKTIF */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span>2. Program Gamifikasi & Rewards Pelanggan Aktif</span>
                        </h3>
                        <span className="text-xs text-slate-400 font-mono font-bold">({customerGamificationList.length} Program Aktif)</span>
                      </div>

                      {/* TOMBOL UNTUK MENAMBAH PROGRAM GAMIFIKASI PELANGGAN BARU */}
                      <button
                        type="button"
                        onClick={() => setShowCustGmfForm(!showCustGmfForm)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center space-x-1"
                      >
                        <span>{showCustGmfForm ? 'Batal' : '+ Tambah Program Gamifikasi Pelanggan Baru'}</span>
                      </button>
                    </div>

                    {/* FORM INPUT PROGRAM GAMIFIKASI PELANGGAN BARU */}
                    {showCustGmfForm && (
                      <form onSubmit={handleAddCustomerGamification} className="bg-slate-950 p-4 rounded-xl border border-purple-500/40 space-y-3 animate-fadeIn">
                        <h4 className="font-bold text-purple-300 text-xs">⭐ Form Input Program Gamifikasi Pelanggan Baru</h4>
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div className="col-span-1">
                            <label className="text-slate-300 font-semibold block mb-1">Judul Program Pelanggan *</label>
                            <input
                              type="text"
                              required
                              value={newCustGmfTitle}
                              onChange={(e) => setNewCustGmfTitle(e.target.value)}
                              placeholder="Contoh: Challenge Weekend Combo Spa..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="col-span-1">
                            <label className="text-slate-300 font-semibold block mb-1">Aturan & Mekanisme *</label>
                            <input
                              type="text"
                              required
                              value={newCustGmfMechanism}
                              onChange={(e) => setNewCustGmfMechanism(e.target.value)}
                              placeholder="Contoh: Belanja 2x paket weekend di POS..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="col-span-1">
                            <label className="text-slate-300 font-semibold block mb-1">Hadiah / Voucher Diskon *</label>
                            <input
                              type="text"
                              required
                              value={newCustGmfReward}
                              onChange={(e) => setNewCustGmfReward(e.target.value)}
                              placeholder="Contoh: Voucher Diskon 25% + Free Drink..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div className="col-span-1">
                            <label className="text-slate-300 font-semibold block mb-1">Target Poin Loyalty *</label>
                            <input
                              type="number"
                              required
                              min="100"
                              value={newCustGmfPoints}
                              onChange={(e) => setNewCustGmfPoints(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={() => setShowCustGmfForm(false)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-sm"
                          >
                            🚀 SIMPAN & AKTIFKAN PROGRAM PELANGGAN
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      {customerGamificationList.map((cGame) => (
                        <div key={cGame.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                            <div>
                              <span className="text-[10px] font-bold font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                                {cGame.id}
                              </span>
                              <h4 className="font-bold text-white text-sm mt-1">{cGame.title}</h4>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              ACTIVE
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div>
                              <span className="text-slate-400 block font-semibold">Aturan & Mekanisme:</span>
                              <span className="text-slate-300 block italic leading-relaxed">"{cGame.rule_mechanism}"</span>
                            </div>

                            <div className="flex justify-between pt-1 border-t border-slate-900">
                              <span className="text-slate-400">Hadiah / Voucher:</span>
                              <span className="font-bold text-emerald-400">{cGame.reward}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-slate-400">Partisipan Aktif:</span>
                              <span className="font-bold font-mono text-amber-300">{cGame.active_participants} Pelanggan</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SECTION 3: PANEL PENGIRIMAN NOTIFIKASI WA PROGRESS GAMIFIKASI PELANGGAN (VIA KASIR / PEGAWAI) */}
                  <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 space-y-4 shadow-lg">
                    <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span>3. Panel Pengiriman Notifikasi WA Progress Gamifikasi Pelanggan (Dikirim Kasir/Pegawai)</span>
                        </h3>
                        <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                          📌 Kasir/Pegawai dapat mengirimkan notifikasi pesan WA otomatis saat pencapaian progress 25%, 50%, 75%, dan 100%.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                        WA PROGRESS NOTIFICATION ENGINE
                      </span>
                    </div>

                    <form onSubmit={handleSendGamificationWaNotice} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Pilih Pelanggan Target *</label>
                          <select
                            value={notifyTargetCust}
                            onChange={(e) => setNotifyTargetCust(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Budi Santoso (628123456789)">Budi Santoso (628123456789)</option>
                            <option value="Dewi Lestari (628198765432)">Dewi Lestari (628198765432)</option>
                            <option value="Rudi Hermawan (628521122334)">Rudi Hermawan (628521122334)</option>
                            <option value="Siti Rahmawati (628779988112)">Siti Rahmawati (628779988112)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Pilih Program Gamifikasi *</label>
                          <select
                            value={notifyProgramTitle}
                            onChange={(e) => setNotifyProgramTitle(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-emerald-500"
                          >
                            {customerGamificationList.map(prog => (
                              <option key={prog.id} value={prog.title}>{prog.title}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Tingkat Pencapaian / Milestone (%) *</label>
                          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                            {(['25', '50', '75', '100'] as const).map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => setNotifyMilestonePercent(pct)}
                                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  notifyMilestonePercent === pct
                                    ? 'bg-emerald-600 text-white font-bold shadow'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                                }`}
                              >
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* PREVIEW PESAN WA NOTIFIKASI */}
                      <div className="bg-slate-900 p-3.5 rounded-xl border border-emerald-500/30 space-y-1">
                        <span className="text-[11px] font-bold text-emerald-400 block">📱 Preview Pesan Notifikasi WA Pelanggan ({notifyMilestonePercent}% Progress):</span>
                        <p className="text-slate-200 italic text-xs leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          {generateGamificationWaText(notifyTargetCust, notifyProgramTitle, notifyMilestonePercent)}
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                      >
                        <span>📲 KIRIM PESAN NOTIFIKASI WA SEKARANG (OLEH KASIR)</span>
                      </button>
                    </form>

                    {/* RIWAYAT PENGIRIMAN NOTIFIKASI WA GAMIFIKASI */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <h4 className="font-bold text-white text-xs">Riwayat Notifikasi Progress WA Terkirim oleh Kasir/Pegawai</h4>
                      <div className="space-y-2 text-xs">
                        {sentCustNotifications.map((notif) => (
                          <div key={notif.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-xs">{notif.customer_name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                                  {notif.milestone} Milestone
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">{notif.timestamp}</span>
                              </div>
                              <p className="text-slate-300 text-[11px] italic">"{notif.message}"</p>
                            </div>
                            <div className="text-right text-[10px] text-slate-400">
                              <span>Pengirim:</span>
                              <strong className="block text-slate-200">{notif.sent_by}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Banner Messages */}
              {gmfBannerMsg && (
                <div className="bg-amber-950/80 border border-amber-500/40 rounded-xl p-4 flex items-center justify-between animate-fadeIn shadow-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-amber-400" />
                    <p className="text-xs font-bold text-amber-200">{gmfBannerMsg}</p>
                  </div>
                  <button onClick={() => setGmfBannerMsg(null)} className="text-xs font-bold text-amber-400 hover:text-amber-200 underline">
                    Tutup
                  </button>
                </div>
              )}

              {/* SECTION 1: TEMPLATE PERMAINAN & FORM INPUT USULAN GAME (OLEH KEPALA CABANG) */}
              <div id="gamification-proposal-form" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>1. Template Permainan & Form Input Usulan Game, Reward, & Target Point</span>
                    </h3>
                    <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                      📌 Kepala Cabang dapat memilih template siap pakai di bawah ini agar memiliki gambaran mekanismenya, lalu mengirim ke Owner untuk di-ACC.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                    SOP GOVERNANCE PILIN
                  </span>
                </div>

                {/* EKSPLIKASI CARA PERMAINAN & MEKANISME POIN */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-amber-300 flex items-center space-x-1.5 text-xs">
                    <span>💡 Panduan Cara Kerja & Mekanisme Permainan Gamifikasi Staf:</span>
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-[11px] pt-1">
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="font-bold text-emerald-400 block">1. Poin Pengerjaan SPK (Base)</span>
                      <p className="text-slate-400 leading-relaxed">
                        Setiap kali teknisi/staf menyelesaikan 1 SPK Nota POS, sistem otomatis menambahkan <strong className="text-white">+10 Poin Kinerja</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="font-bold text-amber-400 block">2. Poin Bonus Tantangan Game</span>
                      <p className="text-slate-400 leading-relaxed">
                        Menyelesaikan tantangan khusus (misal: 20 SPK/Minggu atau 0 Komplain) memberikan bonus <strong className="text-white">+500 s/d 1000 Poin Ekstra</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="font-bold text-blue-400 block">3. Penukaran Voucher & Reward</span>
                      <p className="text-slate-400 leading-relaxed">
                        Poin yang mencapai target dapat ditukarkan dengan <strong className="text-white">Voucher Belanja / Bonus Cash</strong> setelah disetujui Owner.
                      </p>
                    </div>
                  </div>
                </div>

                {/* PRESET TEMPLATE BUTTONS (UNTUK KEPALA CABANG) */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-slate-400 font-semibold block text-[11px]">⚡ Pilih Preset Template Game Siap Pakai (Klik Untuk Otomatis Mengisi Form):</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewGameTitle('Sprint SPK Grooming Terbanyak (20 SPK / Minggu)');
                        setNewGameReward('Voucher Belanja Rp 250.000 + Badges Speed Master');
                        setNewGamePoints('500');
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 rounded-xl text-left transition-all"
                    >
                      <span className="font-bold text-emerald-400 block text-xs">⚡ Template 1: Challenge Speed SPK</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Target: 20 SPK Tepat Waktu | Reward: Voucher Rp 250k (500 Pts)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewGameTitle('Loyalty Hunter (10 Customer Repeat Purchase)');
                        setNewGameReward('Voucher Makan Rp 350.000 + Bonus Cash Rp 200.000');
                        setNewGamePoints('750');
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-blue-500/40 rounded-xl text-left transition-all"
                    >
                      <span className="font-bold text-blue-400 block text-xs">💎 Template 2: Customer Retention</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Target: 10 Repeat Purchase | Reward: Voucher Rp 350k (750 Pts)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setNewGameTitle('Zero Defect & Perfect QC Gate (1 Bulan 0 Error)');
                        setNewGameReward('Bonus Cash Rp 500.000 + Tropi Staf Terbaik');
                        setNewGamePoints('1000');
                      }}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-purple-500/40 rounded-xl text-left transition-all"
                    >
                      <span className="font-bold text-purple-400 block text-xs">🛡️ Template 3: Zero Defect QC Gate</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Target: QC Pass 100% | Reward: Bonus Cash Rp 500k (1000 Pts)</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddGamificationProposal} className="space-y-3.5 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Judul Game / Tantangan Kinerja *</label>
                      <input
                        type="text"
                        required
                        value={newGameTitle}
                        onChange={(e) => setNewGameTitle(e.target.value)}
                        placeholder="Contoh: Sprint SPK Grooming Terbanyak (Mingguan)..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Jenis Reward / Hadiah Karyawan *</label>
                      <input
                        type="text"
                        required
                        value={newGameReward}
                        onChange={(e) => setNewGameReward(e.target.value)}
                        placeholder="Contoh: Voucher Belanja Rp 250.000 + Tropi..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Target Poin Kinerja *</label>
                      <input
                        type="number"
                        required
                        min="50"
                        value={newGamePoints}
                        onChange={(e) => setNewGamePoints(e.target.value)}
                        placeholder="500"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all"
                  >
                    🚀 AJUKAN PROPOSAL GAME KE OWNER UNTUK DISETUJUI
                  </button>
                </form>
              </div>

              {/* LAPORAN EKSUSIF HASIL GAMIFIKASI & OTORISASI REWARD UNTUK OWNER */}
              {activeRole === 'OWNER' && (
                <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-fadeIn">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>👑 Laporan Eksekutif Hasil Gamifikasi & Otorisasi Penyerahan Voucher (Khusus Owner)</span>
                      </h3>
                      <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                        Ringkasan Efektivitas Gamifikasi Terhadap Produktivitas Staf & Otorisasi Pencairan Reward Perusahaan.
                      </p>
                    </div>
                    <span className="text-xs text-emerald-400 font-mono font-bold">STATUS: AUDITED</span>
                  </div>

                  {/* METRIC CARDS RINGKASAN GAMIFIKASI */}
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Game Disetujui (Approved)</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                        {gamificationProposals.filter(p => p.status === 'APPROVED').length} Game Aktif
                      </p>
                      <span className="text-[10px] text-slate-500">Berjalan di Cabang</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Total Poin Perusahaan</span>
                      <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                        {gmfRecords.reduce((sum, r) => sum + r.points_earned, 0)} Pts
                      </p>
                      <span className="text-[10px] text-slate-500">Akumulasi Staf</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Reward / Voucher Terklaim</span>
                      <p className="text-xl font-bold text-blue-400 mt-1 font-mono">
                        2 Voucher (Rp 600.000)
                      </p>
                      <span className="text-[10px] text-slate-500">Siap Diberikan</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Dampak Produktivitas SLA</span>
                      <p className="text-xl font-bold text-purple-400 mt-1 font-mono">+28.5% Speed</p>
                      <span className="text-[10px] text-slate-500">SPK Selesai Lebih Cepat</span>
                    </div>
                  </div>
                </div>
              )}

              {/* LAPORAN HASIL KINERJA & GAMIFIKASI UNTUK KEPALA CABANG */}
              {activeRole === 'KEPALA_CABANG' && (
                <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-5 space-y-4 shadow-lg animate-fadeIn">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                        <Trophy className="w-4 h-4 text-blue-400" />
                        <span>🏢 Laporan Kinerja & Gamifikasi Staf Internal Cabang Utama (Khusus Kepala Cabang)</span>
                      </h3>
                      <p className="text-[11px] text-blue-300 font-semibold mt-0.5">
                        Ringkasan Produktivitas Staf Internal, Status Proposal Game ke Owner, & Pencapaian Poin Kinerja.
                      </p>
                    </div>
                    <span className="text-xs text-blue-400 font-mono font-bold">CABANG: JAKARTA PUSAT</span>
                  </div>

                  {/* METRIC CARDS KINERJA KEPALA CABANG */}
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Staf Internal Terdaftar</span>
                      <p className="text-xl font-bold text-white mt-1 font-mono">
                        {gmfRecords.filter(r => r.branch_name.includes('Cabang Utama')).length} Staf Active
                      </p>
                      <span className="text-[10px] text-emerald-400 font-semibold">Cabang Utama Jakarta</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Total SPK Selesai (Internal)</span>
                      <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                        {gmfRecords.filter(r => r.branch_name.includes('Cabang Utama')).reduce((sum, r) => sum + r.completed_transactions_count, 0)} SPK
                      </p>
                      <span className="text-[10px] text-slate-500">Hasil Pengerjaan Staf</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Total Poin Internal Cabang</span>
                      <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                        {gmfRecords.filter(r => r.branch_name.includes('Cabang Utama')).reduce((sum, r) => sum + r.points_earned, 0)} Pts
                      </p>
                      <span className="text-[10px] text-amber-300">Akumulasi Staf Cabang</span>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Status Proposal Game</span>
                      <p className="text-xl font-bold text-purple-400 mt-1 font-mono">
                        {gamificationProposals.filter(p => p.status === 'APPROVED').length} ACC / {gamificationProposals.filter(p => p.status !== 'APPROVED').length} Pending
                      </p>
                      <span className="text-[10px] text-slate-500">Persetujuan Owner</span>
                    </div>
                  </div>

                  {/* HIGHLIGHT EVALUASI & REKOMENDASI KEPALA CABANG */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <h4 className="font-bold text-blue-300 flex items-center space-x-1 text-xs">
                      <span>💡 Evaluasi & Catatan Kepala Cabang:</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                      <li>
                        <strong>Produktivitas Staf Internal</strong>: Performa pengerjaan SPK di Cabang Utama Jakarta berada pada tren positif dengan efisiensi SLA mencapai <strong className="text-emerald-400">98.4%</strong>.
                      </li>
                      <li>
                        <strong>Peraih Poin Tertinggi</strong>: Staf <strong className="text-amber-300">Dewi Lestari</strong> memimpin poin kinerja internal dengan total <strong className="text-amber-300">550 Poin (Badge: Speed Master)</strong>.
                      </li>
                      <li>
                        <strong>Tindakan Lanjutan</strong>: Kepala Cabang disarankan mengajukan usulan game baru atau mengingatkan Owner jika ada proposal yang masih berstatus <strong className="text-amber-400">PENDING OWNER APPROVAL</strong>.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION 2: DAFTAR USULAN GAME & PANEL PERSETUJUAN OWNER */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>2. Status Proposal Game & Otorisasi Persetujuan Owner</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono font-bold">{gamificationProposals.length} Proposal Terdaftar</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  {gamificationProposals.map((game) => (
                    <div key={game.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between border-b border-slate-900 pb-2">
                        <div>
                          <span className="text-[10px] font-bold font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30">
                            {game.id}
                          </span>
                          <h4 className="font-bold text-white text-sm mt-1">{game.game_title}</h4>
                          <p className="text-slate-400 text-[11px] mt-0.5">
                            Pengusul: <strong className="text-slate-200">{game.proposed_by}</strong>
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          game.status === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {game.status === 'APPROVED' ? '✓ APPROVED BY OWNER' : '⏳ PENDING OWNER APPROVAL'}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hadiah / Reward:</span>
                          <span className="font-bold text-emerald-400">{game.reward_description}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Target Poin:</span>
                          <span className="font-bold font-mono text-amber-300">{game.target_points} Poin</span>
                        </div>
                      </div>

                      {/* OWNER APPROVAL BUTTONS */}
                      {activeRole === 'OWNER' && game.status !== 'APPROVED' && (
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleApproveGamificationProposal(game.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded shadow transition-all"
                          >
                            ✓ SETUJUI (APPROVE) BY OWNER
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: LEADERBOARD KINERJA STAF (SCOPE PRIVASI CABANG PRIVASI GOVERNANCE) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>3. Leaderboard Poin Kinerja Staf & Level Badge</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {activeRole === 'KEPALA_CABANG'
                        ? '🔒 Scope Privasi Cabang: Hanya menampilkan data staf internal cabang sendiri (Cabang Utama Jakarta).'
                        : '👑 Scope Konsolidasi Owner: Menampilkan performa seluruh staf dari seluruh cabang perusahaan.'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    {activeRole === 'KEPALA_CABANG' ? 'Scope: Internal Branch Only' : 'Scope: All Multi-Branches'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                        <th className="p-3">Nama Staf</th>
                        <th className="p-3">Cabang</th>
                        <th className="p-3 text-right">Tx Selesai</th>
                        <th className="p-3 text-right">Omzet (Rp)</th>
                        <th className="p-3 text-right">Cust Baru</th>
                        <th className="p-3 text-right">Total Poin</th>
                        <th className="p-3">Badge Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {gmfRecords
                        .filter(rec => activeRole === 'OWNER' || rec.branch_name.includes('Cabang Utama'))
                        .map((rec) => (
                          <tr key={rec.id} className="hover:bg-slate-800/40 transition-all text-slate-300">
                            <td className="p-3 font-bold text-white">{rec.staff_name}</td>
                            <td className="p-3 text-slate-400">{rec.branch_name}</td>
                            <td className="p-3 text-right font-mono text-slate-300">{rec.completed_transactions_count}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">Rp {rec.revenue_amount.toLocaleString('id-ID')}</td>
                            <td className="p-3 text-right font-mono text-blue-400">{rec.new_customers_count}</td>
                            <td className="p-3 text-right font-mono font-bold text-amber-400">{rec.points_earned} pts</td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {rec.badge}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
