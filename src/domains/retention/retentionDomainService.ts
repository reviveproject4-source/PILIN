import { HypnosellingEngine, HypnosellingMessagePayload } from './hypnosellingEngine';

export interface SapaanLogRecord {
  id: string;
  nota_number?: string;
  customer_name: string;
  customer_phone: string;
  item_name?: string;
  due_days?: number;
  scheduled_h_plus_days?: number;
  category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING' | 'REMINDER';
  message_text: string;
  scheduled_at: string;
  status: 'MANDATED' | 'ACTIVE' | 'SENT' | 'FAILED';
  mandated_by?: string;
  created_at: string;
  wa_me_url?: string;
}

export class RetentionDomainService {
  private static STORAGE_KEY = 'pilin_wa_retention_logs_v2';

  private static defaultLogs: SapaanLogRecord[] = [
    {
      id: 'rem-101',
      nota_number: 'NOT-2026-0891',
      customer_name: 'Dewi Lestari',
      customer_phone: '08212345678',
      item_name: 'Sepatu Suede & Leather Care',
      due_days: 30,
      scheduled_h_plus_days: 30,
      category: 'REMINDER',
      message_text: 'Halo Kak Dewi Lestari, pengingat ramah dari Kasir PILIN ERP. Sudah 30 hari sejak perawatan Sepatu Suede. Waktunya perawatan berkala agar barang kesayangan tetap prima!',
      scheduled_at: new Date(Date.now() + 5 * 86400000).toISOString(),
      status: 'MANDATED',
      mandated_by: 'Kepala Cabang',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/628212345678?text=Halo%20Kak%20Dewi%20Lestari',
    },
    {
      id: 'mand-102',
      nota_number: 'NOT-2026-0885',
      customer_name: 'Rudi Hermawan',
      customer_phone: '08134567890',
      item_name: 'Tas Kulit Executive',
      due_days: 60,
      scheduled_h_plus_days: 60,
      category: 'HYPPOSELLING',
      message_text: 'Halo Kak Rudi Hermawan! Khusus pelanggan langganan cabang kami, dapatkan promo re-engage diskon 20% perawatan tas minggu ini. Balas pesan ini untuk klaim!',
      scheduled_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      status: 'MANDATED',
      mandated_by: 'Kepala Cabang',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/628134567890?text=Halo%20Kak%20Rudi%20Hermawan',
    },
    {
      id: 'sap-103',
      nota_number: 'NOT-2026-0880',
      customer_name: 'Maya Indah',
      customer_phone: '08571234567',
      item_name: 'Jaket Kulit Biker',
      due_days: 14,
      scheduled_h_plus_days: 14,
      category: 'SAPAAN',
      message_text: 'Halo Kak Maya Indah, terima kasih telah mempercayakan pengerjaan barang Anda pada cabang kami. Bagaimana hasil pengerjaan tim kami?',
      scheduled_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      status: 'SENT',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/628571234567?text=Halo%20Kak%20Maya%20Indah',
    },
  ];

  static getSapaanLogs(isDemo: boolean = false): SapaanLogRecord[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (e) {
        console.error('Failed to parse WA retention logs from localStorage', e);
      }
    }
    return isDemo ? [...this.defaultLogs] : [];
  }

  private static saveLogs(logs: SapaanLogRecord[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
      } catch (e) {
        console.error('Failed to save WA retention logs to localStorage', e);
      }
    }
  }

  static generateWaMeLink(phone: string, text: string): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
  }

  static generatePreview(
    customerName: string,
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING',
    customTemplate?: string
  ): HypnosellingMessagePayload {
    const template = customTemplate || (
      category === 'SAPAAN'
        ? 'Halo {{nama}}, terima kasih telah menggunakan layanan kami. Bagaimana hasil pengerjaan tim kami?'
        : category === 'QUOTE'
        ? 'Halo {{nama}}, "Kebersihan dan kerapihan adalah cermin kenyamanan." Selamat beraktivitas kembali!'
        : 'Halo {{nama}}, barang kesayangan Anda sudah waktunya perawatan rutin. Dapatkan promo khusus minggu ini!'
    );

    return HypnosellingEngine.scheduleNextSapaan(
      'cust-sample',
      customerName,
      category,
      template,
      'Salam hangat dari tim kami'
    );
  }

  static createMandateByKC(data: {
    customer_name: string;
    customer_phone: string;
    item_name?: string;
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING' | 'REMINDER';
    message_text: string;
    nota_number?: string;
    due_days?: number;
  }): SapaanLogRecord {
    const logs = this.getSapaanLogs();
    const waUrl = this.generateWaMeLink(data.customer_phone, data.message_text);

    const newLog: SapaanLogRecord = {
      id: `mand-${Date.now()}`,
      nota_number: data.nota_number || 'NOT-2026-GEN',
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name || 'Layanan Perawatan',
      due_days: data.due_days || 30,
      scheduled_h_plus_days: data.due_days || 30,
      category: data.category,
      message_text: data.message_text,
      scheduled_at: new Date(Date.now() + ((data.due_days || 30) * 86400000)).toISOString(),
      status: 'MANDATED',
      mandated_by: 'Kepala Cabang',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl,
    };

    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  static createReminderByNota(data: {
    nota_number: string;
    customer_name: string;
    customer_phone: string;
    item_name?: string;
    h_plus_days: number;
    custom_message?: string;
  }): SapaanLogRecord {
    const logs = this.getSapaanLogs();
    const defaultMsg = data.custom_message ||
      `Halo Kak ${data.customer_name}, pengingat perawatan rutin H+${data.h_plus_days} dari cabang kami untuk nota ${data.nota_number}. Waktunya perawatan berkala barang kesayangan Anda!`;

    const waUrl = this.generateWaMeLink(data.customer_phone, defaultMsg);

    const newLog: SapaanLogRecord = {
      id: `rem-${Date.now()}`,
      nota_number: data.nota_number,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name || 'Barang Service',
      due_days: data.h_plus_days,
      scheduled_h_plus_days: data.h_plus_days,
      category: 'REMINDER',
      message_text: defaultMsg,
      scheduled_at: new Date(Date.now() + (data.h_plus_days * 86400000)).toISOString(),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl,
    };

    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  static scheduleSapaan(data: {
    customer_name: string;
    customer_phone: string;
    item_name?: string;
    due_days?: number;
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING' | 'REMINDER';
    message_text: string;
    nota_number?: string;
  }): SapaanLogRecord {
    const logs = this.getSapaanLogs();
    const waUrl = this.generateWaMeLink(data.customer_phone, data.message_text);

    const newLog: SapaanLogRecord = {
      id: `sap-${Date.now()}`,
      nota_number: data.nota_number || 'NOT-2026-GEN',
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name || 'Barang Service',
      due_days: data.due_days || 30,
      scheduled_h_plus_days: data.due_days || 30,
      category: data.category,
      message_text: data.message_text,
      scheduled_at: new Date(Date.now() + ((data.due_days || 30) * 86400000)).toISOString(),
      status: 'SENT',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl,
    };

    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  static executeWaByKasir(id: string): SapaanLogRecord | null {
    const logs = this.getSapaanLogs();
    const target = logs.find(l => l.id === id);
    if (!target) return null;

    target.status = 'SENT';
    target.created_at = new Date().toISOString();
    this.saveLogs(logs);
    return target;
  }
}
