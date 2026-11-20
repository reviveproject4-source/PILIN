import * as XLSX from 'xlsx';
import { normalizePhoneNumber } from '@/lib/normalizePhoneNumber';
import { extractSalutation, formatCustomerName } from '@/lib/salutationHelper';
import { PosCustomerItem, DEFAULT_POS_CUSTOMERS } from '@/components/commerce/KasirTransactionWorkspace';
import { ServiceCatalogService, ServiceCatalogItem, PricingUnit, DurationUnit, durationToHours } from '@/domains/catalog/serviceCatalogService';
import { CustomerDomainService } from '@/domains/customer/customerService';

export interface CustomerImportRow {
  nama: string;
  no_hp: string;
  alamat?: string;
  email?: string;
  status?: string;
  totalTrx?: number;
  lastVisit?: string;
  isValid: boolean;
  errors: string[];
}

export interface ServiceImportRow {
  nama: string;
  sku?: string;
  item_type: 'SERVICE' | 'PRODUCT';
  base_harga: number;
  pricing_unit: string;
  hpp?: number;
  duration_val?: number;
  duration_unit?: DurationUnit;
  reminder_days?: number;
  stock_qty?: number;
  bahan_baku?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Robust Column Finder — matches Indonesian & English header variants case-insensitively
 */
function findColumnValue(row: Record<string, any>, keywords: string[]): any {
  const keys = Object.keys(row);
  // 1. Exact match (trimmed, case-insensitive)
  for (const kw of keywords) {
    const found = keys.find(k => k.trim().toLowerCase() === kw.toLowerCase());
    if (found && row[found] !== undefined && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  // 2. Substring match (normalized alphanumeric)
  for (const kw of keywords) {
    const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanKw));
    if (found && row[found] !== undefined && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return '';
}

/**
 * Robust Indonesian Price Parser — converts "Rp 50.000", "50.000", "50,000", or 50000 into clean number
 */
function parseIndonesianPrice(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  str = str.replace(/^(rp|idr)\.?\s*/i, '');
  // Format: 50.000 or 1.500.000 (dots as thousand separators)
  if (/^\d{1,3}(\.\d{3})+(\,\d+)?$/.test(str)) {
    str = str.split(',')[0].replace(/\./g, '');
    return parseInt(str, 10) || 0;
  }
  // Format: 50,000 or 1,500,000 (commas as thousand separators)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str)) {
    str = str.split('.')[0].replace(/,/g, '');
    return parseInt(str, 10) || 0;
  }
  // Fallback: strip everything except digits
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) || 0 : 0;
}

/**
 * Robust Indonesian Phone Cleaner — handles Excel integer types, leading 0 drops, scientific notation, and +62
 */
function cleanIndonesianPhone(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val).trim();
  // Handle Excel scientific notation if present (e.g. 8.123456789e+10)
  if (/^\d+\.?\d*e\+\d+$/i.test(str)) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = BigInt(Math.round(num)).toString();
    }
  }
  str = str.replace(/[^\d+]/g, '');
  if (str.startsWith('+62')) {
    str = '0' + str.slice(3);
  } else if (str.startsWith('62')) {
    str = '0' + str.slice(2);
  } else if (str.startsWith('8')) {
    str = '0' + str;
  }
  return str;
}

/**
 * Intelligent Duration & Unit Parser — parses "2 Hari", "24 Jam", "3 Jam", "1 Minggu", or pure numbers
 */
export function parseDurationAndUnit(
  val: any,
  unitVal?: any
): { duration_val: number; duration_unit: DurationUnit } {
  const strVal = String(val ?? '').trim().toLowerCase();
  const strUnit = String(unitVal ?? '').trim().toLowerCase();

  let detectedUnit: DurationUnit = 'HARI';
  if (strUnit.includes('jam') || strUnit.includes('hour')) {
    detectedUnit = 'JAM';
  } else if (strUnit.includes('minggu') || strUnit.includes('week')) {
    detectedUnit = 'MINGGU';
  } else if (strUnit.includes('hari') || strUnit.includes('day')) {
    detectedUnit = 'HARI';
  }

  // Also check if unit is attached inside value (e.g., "3 Jam", "24 jam", "2 hari")
  if (strVal.includes('jam') || strVal.includes('hour')) {
    detectedUnit = 'JAM';
  } else if (strVal.includes('minggu') || strVal.includes('week')) {
    detectedUnit = 'MINGGU';
  } else if (strVal.includes('hari') || strVal.includes('day')) {
    detectedUnit = 'HARI';
  }

  const numMatch = strVal.match(/\d+(\.\d+)?/);
  const num = numMatch ? parseFloat(numMatch[0]) : (typeof val === 'number' && !isNaN(val) ? val : 1);

  return {
    duration_val: num > 0 ? Math.round(num) : 1,
    duration_unit: detectedUnit,
  };
}

/**
 * Intelligent Pricing Unit Normalizer — handles Laundry ('kg', 'pc', 'm2') & General units
 */
export function normalizePricingUnit(
  rawSatuan: string,
  serviceName: string,
  itemType: 'SERVICE' | 'PRODUCT'
): string {
  const s = String(rawSatuan || '').trim().toLowerCase();
  const name = String(serviceName || '').toLowerCase();

  if (itemType === 'PRODUCT') {
    if (s.includes('kg') || s.includes('kilo')) return 'kg';
    if (s.includes('liter') || s.includes('ltr')) return 'liter';
    if (s.includes('botol') || s.includes('btl')) return 'botol';
    if (s.includes('sachet') || s.includes('sch')) return 'sachet';
    return s || 'pc';
  }

  // Explicit unit provided
  if (s) {
    if (s === 'kg' || s === 'kilo' || s === 'kilogram' || s === 'kilos' || s === '/kg' || s === 'per kg') return 'kg';
    if (s === 'pc' || s === 'pcs' || s === 'buah' || s === 'potong' || s === 'item' || s === 'biji') return 'pc';
    if (s === 'lembar' || s === 'lbr') return 'lembar';
    if (s === 'stel' || s === 'setel' || s === 'setelan') return 'stel';
    if (s === 'pasang' || s === 'sepasang' || s === 'psg') return 'sepasang';
    if (s === 'meter' || s === 'm2' || s === 'm²' || s === 'meter persegi') return 'm2';
    if (s === 'helai') return 'helai';
    if (s === 'set') return 'set';
    if (s === 'paket') return 'paket';
    if (s === 'gram' || s === 'gr') return 'gram';
    if (s === 'unit') return 'unit';
    if (s === 'barang') return 'barang';
    return s;
  }

  // Infer unit intelligently from service name if omitted in sheet
  if (name.includes('kilo') || name.includes('kg') || name.includes('cuci kering') || name.includes('setrika saja') || name.includes('cuci komplit') || name.includes('laundry kiloan')) {
    return 'kg';
  }
  if (name.includes('setelan') || name.includes('stel') || name.includes('kebaya')) {
    return 'stel';
  }
  if (name.includes('karpet') || name.includes('gordyn') || name.includes('tirai')) {
    return 'm2';
  }
  if (name.includes('bed cover') || name.includes('bedcover') || name.includes('selimut') || name.includes('sprei') || name.includes('boneka') || name.includes('helm') || name.includes('tas') || name.includes('sepatu') || name.includes('jas') || name.includes('gaun') || name.includes('jaket') || name.includes('baju')) {
    return 'pc';
  }

  return 'kg';
}

/**
 * Parses Indonesian Date string (e.g. "3 Sept 2026", "28 Ags 2026", "23-08-2026") into YYYY-MM-DD
 */
export function parseIndonesianDate(val: any): string {
  if (!val) return new Date().toISOString().substring(0, 10);
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', ags: '08', aug: '08', agu: '08', sep: '09',
    sept: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12'
  };
  const parts = s.split(/[\s\-\/]+/);
  if (parts.length >= 3) {
    let day = parts[0].padStart(2, '0');
    let monthStr = parts[1].toLowerCase().slice(0, 4);
    let month = months[monthStr] || months[monthStr.slice(0, 3)] || '01';
    let year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month) && /^\d{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }
  return s;
}

/**
 * Smart Header Row Detector — scans first 35 rows of sheet AoA to locate true header row,
 * skipping metadata, title headers, and filter banners from Smartlink / POS exports.
 */
export function findHeaderRowIndex(rows: any[][], targetKeywords: string[]): { headerIndex: number; score: number } {
  let bestIdx = 0;
  let maxScore = 0;

  for (let i = 0; i < Math.min(rows.length, 35); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    let score = 0;
    const rowText = row.map(cell => String(cell || '').trim().toLowerCase());

    for (const kw of targetKeywords) {
      if (rowText.some(cell => cell.includes(kw))) {
        score++;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestIdx = i;
    }
  }

  return { headerIndex: bestIdx, score: maxScore };
}

/**
 * Converts a worksheet into structured objects by detecting the true header row
 */
export function sheetToSmartObjects(worksheet: XLSX.WorkSheet, targetKeywords: string[]): Record<string, any>[] {
  const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!aoa || aoa.length === 0) return [];

  const { headerIndex, score } = findHeaderRowIndex(aoa, targetKeywords);
  const actualHeaderIdx = score > 0 ? headerIndex : 0;
  const rawHeaders = aoa[actualHeaderIdx].map(h => String(h || '').trim());

  const structuredRows: Record<string, any>[] = [];
  for (let i = actualHeaderIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!Array.isArray(row) || row.every(cell => String(cell || '').trim() === '')) continue;

    const obj: Record<string, any> = {};
    let hasData = false;
    rawHeaders.forEach((h, colIdx) => {
      const key = h || `col_${colIdx}`;
      const val = row[colIdx] !== undefined ? row[colIdx] : '';
      obj[key] = val;
      if (String(val).trim()) hasData = true;
    });

    if (hasData) {
      structuredRows.push(obj);
    }
  }
  return structuredRows;
}

export const CUSTOMER_HEADER_KEYWORDS = [
  'nama', 'pelanggan', 'konsumen', 'customer', 'member',
  'telpon', 'telepon', 'whatsapp', 'wa', 'hp', 'phone', 'kontak',
  'id konsumen', 'id pelanggan', 'sapaan', 'alamat', 'transaksi'
];

export const SERVICE_HEADER_KEYWORDS = [
  'nama', 'satuan', 'harga', 'durasi', 'layanan', 'tarif', 'tipe', 'produk'
];

export class ImportExportService {
  // ==========================================
  // CUSTOMER EXPORT & TEMPLATE
  // ==========================================

  static getCustomerTemplateData(): any[] {
    return [
      {
        'Nama Pelanggan': 'Ibu Anisa Wardani',
        'No WhatsApp': '081234567890',
        'Alamat': 'Apartemen Mediterania Tower B-12, Jakarta',
        'Email': 'anisa.wardani@gmail.com',
        'Status': 'LOYAL',
        'Catatan / Tag': 'Pelanggan Laundry Kiloan Mingguan',
      },
      {
        'Nama Pelanggan': 'Bapak Dedi Pratama',
        'No WhatsApp': '081987654321',
        'Alamat': 'Jl. Kemang Timur No. 15, Jakarta Selatan',
        'Email': 'dedi.pratama@yahoo.com',
        'Status': 'REPEAT',
        'Catatan / Tag': 'Cuci Bed Cover King & Jas Formal',
      },
      {
        'Nama Pelanggan': 'Kak Citra Lestari',
        'No WhatsApp': '085678901234',
        'Alamat': 'Kos Griya Melati No. 8, Setiabudi',
        'Email': 'citra.lestari@gmail.com',
        'Status': 'NEW',
        'Catatan / Tag': 'Paket Cuci Express 24 Jam',
      },
    ];
  }

  static downloadCustomerTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const data = this.getCustomerTemplateData();
    if (format === 'csv') {
      const headers = ['Nama Pelanggan', 'No WhatsApp', 'Alamat', 'Email', 'Status', 'Catatan / Tag'];
      const rows = data.map(d => [
        `"${d['Nama Pelanggan']}"`,
        `"${d['No WhatsApp']}"`,
        `"${d['Alamat']}"`,
        `"${d['Email']}"`,
        `"${d['Status']}"`,
        `"${d['Catatan / Tag']}"`
      ].join(','));
      const csvString = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_pelanggan_pilin.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Pelanggan');
      XLSX.writeFile(wb, 'template_pelanggan_pilin.xlsx', { bookType: 'xlsx' });
    }
  }

  static exportCustomers(customers: PosCustomerItem[], filename: string = 'data_pelanggan_pilin.xlsx') {
    const rows = customers.map((c, idx) => ({
      'No': idx + 1,
      'Nama Pelanggan': c.name,
      'No WhatsApp': c.phone,
      'Alamat': c.address || '',
      'Status': c.status || 'ACTIVE',
      'Total Kunjungan/Nota': c.totalTrx || 0,
      'Kunjungan Terakhir': c.lastVisit || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Pelanggan');
    XLSX.writeFile(wb, filename);
  }

  static transformRawCustomerRows(rawRows: any[]): CustomerImportRow[] {
    const nameKeywords = [
      'nama pelanggan', 'nama lengkap', 'nama konsumen', 'nama member',
      'nama customer', 'nama klien', 'nama', 'pelanggan', 'konsumen',
      'customer', 'member', 'klien', 'name'
    ];

    const salutationKeywords = ['sapaan', 'salutation', 'panggilan', 'sebutan', 'gelar'];

    const phoneKeywords = [
      'nomor telpon', 'no telpon', 'nomor telepon', 'no telepon', 'no. telpon', 'no. telepon',
      'no whatsapp', 'nomor whatsapp', 'no wa', 'nomor wa', 'whatsapp', 'wa',
      'no hp', 'nomor hp', 'no. hp', 'hp', 'handphone',
      'no. telp', 'no telp', 'telepon', 'telp', 'phone', 'mobile', 'kontak', 'contact'
    ];

    const addressKeywords = [
      'alamat', 'address', 'alamat antar jemput', 'alamat antar', 'alamat jemput',
      'alamat pengiriman', 'domisili', 'lokasi', 'tempat tinggal'
    ];
    const emailKeywords = ['email', 'surel', 'e-mail', 'mail'];
    const statusKeywords = ['status', 'tipe', 'kategori', 'level'];
    const trxKeywords = [
      'total jumlah transaksi', 'jumlah transaksi', 'total transaksi',
      'total kunjungan', 'total nota', 'total trx', 'total', 'kunjungan', 'nota'
    ];
    const lastVisitKeywords = [
      'transaksi terakhir', 'kunjungan terakhir', 'terakhir transaksi',
      'last visit', 'terdaftar sejak', 'tgl terakhir'
    ];

    const results: CustomerImportRow[] = [];

    for (const row of rawRows) {
      let nama = String(findColumnValue(row, nameKeywords)).trim();
      const sapaan = String(findColumnValue(row, salutationKeywords)).trim();
      let rawPhone = findColumnValue(row, phoneKeywords);
      const alamat = String(findColumnValue(row, addressKeywords)).trim();
      const email = String(findColumnValue(row, emailKeywords)).trim();
      const statusRaw = String(findColumnValue(row, statusKeywords) || '').trim().toUpperCase();
      const rawTrx = findColumnValue(row, trxKeywords);
      const rawLastVisit = findColumnValue(row, lastVisitKeywords);

      // Skip non-data subheader rows or empty rows (such as Smartlink deposit subheaders)
      if ((!nama || nama.toLowerCase() === 'nama') && (!rawPhone || String(rawPhone).trim() === '')) {
        continue;
      }
      const lowerName = nama.toLowerCase();
      if (lowerName.includes('deposit') || lowerName.includes('id konsumen') || lowerName === 'total') {
        continue;
      }

      // Combine salutation (Pak/Bu/Kak) if available and not already prefixed
      if (sapaan && nama) {
        if (!lowerName.startsWith(sapaan.toLowerCase())) {
          nama = `${sapaan} ${nama}`;
        }
      }

      // Positional fallback if headers are unconventional (Col 0/1 = Name, Col 1/2 = Phone)
      if (!nama && (!rawPhone || String(rawPhone).trim() === '')) {
        const values = Object.values(row).map(v => String(v ?? '').trim()).filter(Boolean);
        if (values.length >= 2) {
          if (!/^\d+$/.test(values[0])) {
            nama = values[0];
            rawPhone = values[1];
          } else if (values.length >= 3) {
            nama = values[1];
            rawPhone = values[2];
          }
        }
      }

      const cleanedPhone = cleanIndonesianPhone(rawPhone);
      const totalTrxVal = Number(rawTrx) > 0 ? Number(rawTrx) : 1;
      const lastVisit = rawLastVisit ? parseIndonesianDate(rawLastVisit) : new Date().toISOString().substring(0, 10);

      const errors: string[] = [];
      if (!nama || nama.length < 2) {
        errors.push('Nama minimal 2 karakter.');
      }

      if (!cleanedPhone || cleanedPhone.length < 8) {
        errors.push('No WhatsApp tidak valid (format 08xxx atau +628xxx).');
      }

      let validStatus = ['NEW', 'REPEAT', 'LOYAL', 'AT_RISK', 'ACTIVE', 'DORMANT'].includes(statusRaw)
        ? statusRaw
        : '';
      if (!validStatus) {
        validStatus = totalTrxVal >= 5 ? 'LOYAL' : (totalTrxVal >= 2 ? 'REPEAT' : 'NEW');
      }

      results.push({
        nama: nama || 'Pelanggan Baru',
        no_hp: cleanedPhone || String(rawPhone || ''),
        alamat: alamat || undefined,
        email: email || undefined,
        status: validStatus,
        totalTrx: totalTrxVal,
        lastVisit,
        isValid: errors.length === 0,
        errors,
      });
    }

    return results;
  }

  static async parseCustomerFile(file: File): Promise<CustomerImportRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    const smartRows = sheetToSmartObjects(worksheet, CUSTOMER_HEADER_KEYWORDS);
    return this.transformRawCustomerRows(smartRows);
  }

  static parseCustomerCsvText(text: string): CustomerImportRow[] {
    if (!text || !text.trim()) return [];
    try {
      const workbook = XLSX.read(text.trim(), { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];
      const worksheet = workbook.Sheets[firstSheetName];
      const smartRows = sheetToSmartObjects(worksheet, CUSTOMER_HEADER_KEYWORDS);
      return this.transformRawCustomerRows(smartRows);
    } catch {
      return [];
    }
  }

  static commitImportCustomers(
    rows: CustomerImportRow[],
    businessId: string = 'tenant-001',
    branchId: string = 'branch-001'
  ): { added: number; updated: number; currentList: PosCustomerItem[] } {
    const storageKey = `pilin_kasir_customers_${businessId}`;
    let existingList: PosCustomerItem[] = [];

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) existingList = parsed;
        }
      } catch {
        existingList = [];
      }
    }

    // Strict tenant isolation: only demo tenant or Bengkel Tas Sepatu gets default sample customers if empty!
    // A laundry business (e.g. tenant-001 or any user tenant) starts with 100% pure imported customers.
    const isDemoOrBengkel = businessId === '8ec99d6e-3f6f-47d4-910f-265cfe26c609' || businessId === 'demo-tenant';
    if (existingList.length === 0 && isDemoOrBengkel) {
      existingList = [...DEFAULT_POS_CUSTOMERS];
    }

    let addedCount = 0;
    let updatedCount = 0;
    const validRows = rows.filter((r) => r.isValid);

    validRows.forEach((row) => {
      const { salutation, cleanName } = extractSalutation(row.nama);
      const formattedName = formatCustomerName(cleanName || row.nama, salutation || 'Bapak');

      const matchIdx = existingList.findIndex(
        (c) => c.phone === row.no_hp || normalizePhoneNumber(c.phone) === normalizePhoneNumber(row.no_hp)
      );

      if (matchIdx !== -1) {
        // Update data existing — idempotent totalTrx handling!
        existingList[matchIdx] = {
          ...existingList[matchIdx],
          name: formattedName,
          address: row.alamat || existingList[matchIdx].address,
          status: row.status || existingList[matchIdx].status,
          totalTrx: Math.max(existingList[matchIdx].totalTrx || 0, row.totalTrx || 1),
          lastVisit: row.lastVisit || existingList[matchIdx].lastVisit,
        };
        updatedCount++;
      } else {
        // Tambah baru
        const newCust: PosCustomerItem = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: formattedName,
          phone: row.no_hp,
          address: row.alamat,
          status: row.status || 'NEW',
          totalTrx: row.totalTrx || 1,
          lastVisit: row.lastVisit || new Date().toISOString().substring(0, 10),
        };
        existingList.unshift(newCust);
        addedCount++;
      }

      // Sync ke CustomerDomainService jika tersedia
      try {
        CustomerDomainService.registerCustomer({
          nama: formattedName,
          no_hp: row.no_hp,
          email: row.email,
          alamat: row.alamat,
          branch_id: branchId,
        });
      } catch {
        // safe ignore
      }
    });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingList));
        localStorage.setItem('pilin_kasir_customers_master', JSON.stringify(existingList));
        localStorage.setItem('pilin_kasir_customers_global_backup', JSON.stringify(existingList));
        localStorage.setItem('pilin_kasir_customers_default', JSON.stringify(existingList));
      } catch (err) {
        console.error('Failed to save imported customers to localStorage', err);
      }
    }

    return { added: addedCount, updated: updatedCount, currentList: existingList };
  }

  // ==========================================
  // SERVICE & PRODUCT EXPORT & TEMPLATE
  // ==========================================

  static getServiceTemplateData(): any[] {
    return [
      {
        'Tipe (SERVICE / PRODUCT)': 'SERVICE',
        'Nama Layanan / Produk': 'Cuci Kiloan Reguler (Cuci Kering Setrika)',
        'SKU': 'SKU-JASA-101',
        'Harga Jual (Rp)': 8000,
        'Satuan': 'kg',
        'HPP Modal (Rp)': 3000,
        'Durasi Nilai': 2,
        'Durasi Satuan (JAM / HARI / MINGGU)': 'HARI',
        'Siklus Reminder CRM (Hari)': 14,
        'Bahan Baku / Formula': 'Deterjen Cair 30ml, Pewangi 20ml, Plastik Packing 1 lbr',
        'Stok Retail (Khusus Product)': 0,
      },
      {
        'Tipe (SERVICE / PRODUCT)': 'SERVICE',
        'Nama Layanan / Produk': 'Cuci Kiloan Express 24 Jam',
        'SKU': 'SKU-JASA-102',
        'Harga Jual (Rp)': 12000,
        'Satuan': 'kg',
        'HPP Modal (Rp)': 4500,
        'Durasi Nilai': 1,
        'Durasi Satuan (JAM / HARI / MINGGU)': 'HARI',
        'Siklus Reminder CRM (Hari)': 14,
        'Bahan Baku / Formula': 'Deterjen Cepat Bersih, Parfum Laundry Grade A, Plastik',
        'Stok Retail (Khusus Product)': 0,
      },
      {
        'Tipe (SERVICE / PRODUCT)': 'SERVICE',
        'Nama Layanan / Produk': 'Cuci Bed Cover King / Jumbo',
        'SKU': 'SKU-JASA-103',
        'Harga Jual (Rp)': 35000,
        'Satuan': 'pc',
        'HPP Modal (Rp)': 12000,
        'Durasi Nilai': 2,
        'Durasi Satuan (JAM / HARI / MINGGU)': 'HARI',
        'Siklus Reminder CRM (Hari)': 30,
        'Bahan Baku / Formula': 'Deterjen Khusus Bed Cover + Pelembut Wangi',
        'Stok Retail (Khusus Product)': 0,
      },
      {
        'Tipe (SERVICE / PRODUCT)': 'SERVICE',
        'Nama Layanan / Produk': 'Dry Clean Jas & Celana Formal',
        'SKU': 'SKU-JASA-104',
        'Harga Jual (Rp)': 50000,
        'Satuan': 'stel',
        'HPP Modal (Rp)': 15000,
        'Durasi Nilai': 3,
        'Durasi Satuan (JAM / HARI / MINGGU)': 'HARI',
        'Siklus Reminder CRM (Hari)': 30,
        'Bahan Baku / Formula': 'Chemical Dry Clean + Hanger Jas + Cover Plastik',
        'Stok Retail (Khusus Product)': 0,
      },
      {
        'Tipe (SERVICE / PRODUCT)': 'PRODUCT',
        'Nama Layanan / Produk': 'Parfum Laundry Premium 250ml',
        'SKU': 'SKU-RETAIL-101',
        'Harga Jual (Rp)': 35000,
        'Satuan': 'pc',
        'HPP Modal (Rp)': 18000,
        'Durasi Nilai': '',
        'Durasi Satuan (JAM / HARI / MINGGU)': '',
        'Siklus Reminder CRM (Hari)': 45,
        'Bahan Baku / Formula': 'Botol Spray 250ml + Konsentrat Aroma Lily',
        'Stok Retail (Khusus Product)': 24,
      },
    ];
  }

  static downloadServiceTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
    const data = this.getServiceTemplateData();
    if (format === 'csv') {
      const headers = [
        'Tipe (SERVICE / PRODUCT)',
        'Nama Layanan / Produk',
        'SKU',
        'Harga Jual (Rp)',
        'Satuan',
        'HPP Modal (Rp)',
        'Durasi Nilai',
        'Durasi Satuan (JAM / HARI / MINGGU)',
        'Siklus Reminder CRM (Hari)',
        'Bahan Baku / Formula',
        'Stok Retail (Khusus Product)'
      ];
      const rows = data.map(d => [
        `"${d['Tipe (SERVICE / PRODUCT)']}"`,
        `"${d['Nama Layanan / Produk']}"`,
        `"${d['SKU']}"`,
        d['Harga Jual (Rp)'],
        `"${d['Satuan']}"`,
        d['HPP Modal (Rp)'],
        d['Durasi Nilai'],
        `"${d['Durasi Satuan (JAM / HARI / MINGGU)']}"`,
        d['Siklus Reminder CRM (Hari)'],
        `"${d['Bahan Baku / Formula']}"`,
        d['Stok Retail (Khusus Product)']
      ].join(','));
      const csvString = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_layanan_produk_pilin.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template_Katalog');
      XLSX.writeFile(wb, 'template_layanan_produk_pilin.xlsx', { bookType: 'xlsx' });
    }
  }

  static exportServices(services: ServiceCatalogItem[], filename: string = 'data_layanan_produk_pilin.xlsx') {
    const rows = services.map((s, idx) => ({
      'No': idx + 1,
      'SKU': s.sku,
      'Tipe': s.item_type || 'SERVICE',
      'Nama Layanan / Produk': s.nama,
      'Harga Jual (Rp)': s.base_harga,
      'Satuan': s.pricing_unit || 'kg',
      'HPP Modal (Rp)': s.hpp || 0,
      'Durasi Pengerjaan': s.duration_val ? `${s.duration_val} ${s.duration_unit || 'HARI'}` : (s.duration_hours ? `${s.duration_hours} Jam` : '-'),
      'Siklus Reminder (Hari)': s.reminder_days || 14,
      'Stok Retail': s.item_type === 'PRODUCT' ? (s.stock_qty ?? 0) : '-',
      'Bahan Baku / BOM': s.bahan_baku || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Katalog_Master');
    XLSX.writeFile(wb, filename);
  }

  static transformRawServiceRows(rawRows: any[]): ServiceImportRow[] {
    const nameKeywords = [
      'nama layanan / produk', 'nama layanan', 'nama produk', 'nama jasa', 'nama item',
      'paket laundry', 'layanan laundry', 'jasa laundry', 'jenis cuci', 'nama paket',
      'layanan', 'produk', 'service', 'jasa', 'item', 'paket', 'nama', 'name'
    ];
    const typeKeywords = ['tipe', 'type', 'kategori', 'category', 'jenis'];
    const priceKeywords = [
      'harga jual (rp)', 'harga jual', 'harga', 'price', 'tarif / kg', 'tarif kiloan',
      'tarif', 'biaya', 'rate', 'harga satuan', 'jual'
    ];
    const hppKeywords = ['hpp modal (rp)', 'hpp modal', 'hpp', 'modal', 'cost', 'biaya pokok'];
    const unitKeywords = ['satuan', 'pricing unit', 'unit', 'satuan hitung', 'satuan harga', 'per'];
    const durValKeywords = ['durasi nilai', 'durasi', 'duration', 'waktu', 'lama pengerjaan', 'lama cuci', 'lama'];
    const durUnitKeywords = ['durasi satuan', 'satuan durasi', 'duration unit'];
    const reminderKeywords = ['siklus reminder crm (hari)', 'siklus reminder', 'reminder days', 'siklus', 'reminder'];
    const stockKeywords = ['stok retail', 'stok', 'stock', 'qty', 'jumlah stok'];
    const bahanKeywords = ['bahan baku / formula', 'bahan baku', 'bahan', 'formula', 'bom'];

    const results: ServiceImportRow[] = [];

    for (const row of rawRows) {
      let nama = String(findColumnValue(row, nameKeywords)).trim();
      const rawType = String(findColumnValue(row, typeKeywords) || '').trim().toUpperCase();
      let rawPrice = parseIndonesianPrice(findColumnValue(row, priceKeywords));
      const rawHpp = parseIndonesianPrice(findColumnValue(row, hppKeywords));

      // Skip empty or header-repeat rows
      if ((!nama || nama.toLowerCase() === 'nama' || nama.toLowerCase() === 'item') && rawPrice <= 0) {
        continue;
      }

      // Positional fallback if headers are unconventional (Col 0/1 = Name, Col 1/2 = Price)
      if (!nama && rawPrice <= 0) {
        const values = Object.values(row).map(v => String(v ?? '').trim()).filter(Boolean);
        if (values.length >= 2) {
          if (!/^\d+$/.test(values[0])) {
            nama = values[0];
            rawPrice = parseIndonesianPrice(values[1]);
          } else if (values.length >= 3) {
            nama = values[1];
            rawPrice = parseIndonesianPrice(values[2]);
          }
        }
      }

      // Intelligent Item Type inference (PRODUCT vs SERVICE)
      let item_type: 'SERVICE' | 'PRODUCT';
      if (rawType) {
        item_type = (rawType.includes('PROD') || rawType === 'BARANG' || rawType === 'RETAIL') ? 'PRODUCT' : 'SERVICE';
      } else {
        const lowerName = nama.toLowerCase();
        if (
          lowerName.includes('spray') ||
          lowerName.includes('deterjen') ||
          lowerName.includes('parfum') ||
          lowerName.includes('pewangi') ||
          lowerName.includes('softener') ||
          lowerName.includes('hanger') ||
          lowerName.includes('plastik') ||
          lowerName.includes('(retail)')
        ) {
          item_type = 'PRODUCT';
        } else {
          item_type = 'SERVICE';
        }
      }

      const rawSatuanFound = findColumnValue(row, unitKeywords);
      const normalizedSatuan = normalizePricingUnit(rawSatuanFound, nama, item_type);

      const sku = String(findColumnValue(row, ['sku', 'kode', 'code'])).trim();

      // Check Smartlink duration columns ('Durasi Hari' / 'Durasi Jam') first
      const durHari = findColumnValue(row, ['durasi hari', 'hari']);
      const durJam = findColumnValue(row, ['durasi jam', 'jam']);
      let parsedDuration: { duration_val: number; duration_unit: DurationUnit };

      if (Number(durHari) > 0) {
        parsedDuration = { duration_val: Number(durHari), duration_unit: 'HARI' };
      } else if (Number(durJam) > 0) {
        parsedDuration = { duration_val: Number(durJam), duration_unit: 'JAM' };
      } else {
        const rawDurVal = findColumnValue(row, durValKeywords);
        const rawDurUnit = findColumnValue(row, durUnitKeywords);
        parsedDuration = parseDurationAndUnit(rawDurVal, rawDurUnit);
      }

      const reminderDays = Number(findColumnValue(row, reminderKeywords) || (item_type === 'PRODUCT' ? 30 : 14));
      const stockQty = Number(findColumnValue(row, stockKeywords) || 0);
      const bahanBaku = String(findColumnValue(row, bahanKeywords)).trim();

      const errors: string[] = [];
      if (!nama || nama.length < 2) {
        errors.push('Nama layanan/produk minimal 2 karakter.');
      }
      if (rawPrice <= 0) {
        errors.push('Harga jual harus lebih besar dari 0.');
      }

      results.push({
        nama: nama || 'Layanan Baru',
        sku: sku || undefined,
        item_type,
        base_harga: rawPrice,
        pricing_unit: normalizedSatuan,
        hpp: rawHpp > 0 ? rawHpp : Math.round(rawPrice * 0.35),
        duration_val: item_type === 'PRODUCT' ? undefined : parsedDuration.duration_val,
        duration_unit: item_type === 'PRODUCT' ? undefined : parsedDuration.duration_unit,
        reminder_days: reminderDays > 0 ? reminderDays : 14,
        stock_qty: item_type === 'PRODUCT' ? stockQty : 0,
        bahan_baku: bahanBaku || undefined,
        isValid: errors.length === 0,
        errors,
      });
    }

    return results;
  }

  static async parseServiceFile(file: File): Promise<ServiceImportRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];

    const worksheet = workbook.Sheets[firstSheetName];
    const smartRows = sheetToSmartObjects(worksheet, SERVICE_HEADER_KEYWORDS);
    return this.transformRawServiceRows(smartRows);
  }

  static parseServiceCsvText(text: string): ServiceImportRow[] {
    if (!text || !text.trim()) return [];
    try {
      const workbook = XLSX.read(text.trim(), { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];
      const worksheet = workbook.Sheets[firstSheetName];
      const smartRows = sheetToSmartObjects(worksheet, SERVICE_HEADER_KEYWORDS);
      return this.transformRawServiceRows(smartRows);
    } catch {
      return [];
    }
  }

  static commitImportServices(
    rows: ServiceImportRow[],
    businessId: string = 'tenant-001'
  ): { added: number; updated: number; currentCatalog: ServiceCatalogItem[] } {
    const bizId = businessId || 'tenant-001';
    let addedCount = 0;
    let updatedCount = 0;
    const validRows = rows.filter((r) => r.isValid);

    // Track existing items and new batch additions to prevent duplicate insertions
    const seenMap = new Map<string, ServiceCatalogItem>();
    ServiceCatalogService.getMasterCatalog(bizId).forEach(s => {
      seenMap.set(s.nama.toLowerCase().trim(), s);
      if (s.sku) seenMap.set(s.sku.toLowerCase().trim(), s);
    });

    validRows.forEach((row) => {
      const nameKey = row.nama.toLowerCase().trim();
      const skuKey = row.sku ? row.sku.toLowerCase().trim() : '';
      const matched = seenMap.get(nameKey) || (skuKey ? seenMap.get(skuKey) : undefined);

      if (matched) {
        // Update existing item
        const updated = ServiceCatalogService.updateMasterService(
          matched.id,
          {
            nama: row.nama,
            base_harga: row.base_harga,
            hpp: row.hpp ?? matched.hpp,
            pricing_unit: row.pricing_unit,
            item_type: row.item_type,
            duration_val: row.duration_val,
            duration_unit: row.duration_unit,
            duration_hours: row.duration_val ? durationToHours(row.duration_val, row.duration_unit) : matched.duration_hours,
            reminder_days: row.reminder_days,
            stock_qty: row.item_type === 'PRODUCT' ? row.stock_qty : matched.stock_qty,
            bahan_baku: row.bahan_baku || matched.bahan_baku,
          },
          bizId
        );
        if (updated) {
          seenMap.set(nameKey, updated);
          if (updated.sku) seenMap.set(updated.sku.toLowerCase().trim(), updated);
          updatedCount++;
        }
      } else {
        // Add new service
        const added = ServiceCatalogService.addMasterService(
          {
            business_id: bizId,
            nama: row.nama,
            sku: row.sku,
            base_harga: row.base_harga,
            hpp: row.hpp,
            hpp_mode: 'ACTUAL_COST',
            item_type: row.item_type,
            pricing_unit: row.pricing_unit,
            duration_val: row.duration_val,
            duration_unit: row.duration_unit,
            duration_hours: row.duration_val ? durationToHours(row.duration_val, row.duration_unit) : undefined,
            reminder_days: row.reminder_days,
            stock_qty: row.stock_qty,
            stock_alert_threshold: 5,
            bahan_baku: row.bahan_baku,
          },
          bizId
        );
        seenMap.set(nameKey, added);
        if (added.sku) seenMap.set(added.sku.toLowerCase().trim(), added);
        addedCount++;
      }
    });

    const refreshed = ServiceCatalogService.getMasterCatalog(bizId);
    return { added: addedCount, updated: updatedCount, currentCatalog: refreshed };
  }
}
