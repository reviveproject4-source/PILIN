import { HypnosellingEngine, HypnosellingMessagePayload } from './hypnosellingEngine';

export interface SapaanLogRecord {
  id: string;
  nota_number?: string;
  customer_name: string;
  customer_phone: string;
  item_name?: string;
  item_type?: 'SERVICE' | 'PRODUCT';
  due_days?: number;
  scheduled_h_plus_days?: number;
  category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING' | 'REMINDER';
  reminder_type?: 'JASA_PERAWATAN_BERKALA' | 'RETAIL_REFILL_BELANJA' | 'UMUM';
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
      customer_name: 'Ibu Marlina',
      customer_phone: '081280320505',
      item_name: 'Treatment SPA & Repaint Tas Kulit',
      item_type: 'SERVICE',
      due_days: 60,
      scheduled_h_plus_days: 60,
      category: 'REMINDER',
      reminder_type: 'JASA_PERAWATAN_BERKALA',
      message_text: 'Selamat siang Ibu Marlina, pengingat ramah dari Bengkel Tas Sepatu. Tas kulit yang dirawat 60 hari lalu sudah memasuki jadwal perawatan pelembab berkala agar kulit tetap lentur dan terhindar dari jamur. Silakan mampir ke outlet kami minggu ini!',
      scheduled_at: new Date(Date.now() + 5 * 86400000).toISOString(),
      status: 'ACTIVE',
      mandated_by: 'Kepala Cabang',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/6281280320505?text=Selamat%20siang%20Ibu%20Marlina',
    },
    {
      id: 'rem-102',
      nota_number: 'NOT-2026-0892',
      customer_name: 'Bapak Hendra',
      customer_phone: '08134567890',
      item_name: 'Sabun Pembersih Sepatu & Tas 250ml',
      item_type: 'PRODUCT',
      due_days: 30,
      scheduled_h_plus_days: 30,
      category: 'REMINDER',
      reminder_type: 'RETAIL_REFILL_BELANJA',
      message_text: 'Selamat pagi Bapak Hendra, sabun pembersih sepatu yang Bapak beli 30 hari lalu diperkirakan sudah mulai habis. Apakah ingin kami siapkan botol refill baru untuk Bapak? Balas pesan ini untuk pemesanan langsung ya Pak.',
      scheduled_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      status: 'ACTIVE',
      mandated_by: 'Kepala Cabang',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/628134567890?text=Selamat%20pagi%20Bapak%20Hendra',
    },
    {
      id: 'sap-103',
      nota_number: 'NOT-2026-0880',
      customer_name: 'Ka Dewi',
      customer_phone: '08571234567',
      item_name: 'Fast Wash Sepatu Canvas',
      item_type: 'SERVICE',
      due_days: 14,
      scheduled_h_plus_days: 14,
      category: 'SAPAAN',
      reminder_type: 'UMUM',
      message_text: 'Halo Ka Dewi, terima kasih telah mempercayakan pengerjaan sepatu di Bengkel Tas Sepatu. Bagaimana hasil pengerjaan tim kami? Semoga puas dan hari Ka Dewi menyenangkan selalu!',
      scheduled_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      status: 'SENT',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      wa_me_url: 'https://wa.me/628571234567?text=Halo%20Ka%20Dewi',
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
    return isDemo ? [...this.defaultLogs] : [...this.defaultLogs];
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

  static createMaintenanceReminderForJasa(data: {
    nota_number: string;
    customer_name: string;
    customer_phone: string;
    item_name: string;
    due_days: number; // 30, 45, 60, 90, or custom
    custom_message?: string;
  }): SapaanLogRecord {
    const logs = this.getSapaanLogs();
    const salutationPrefix = /^(bapak|bpk|pak)/i.test(data.customer_name) ? 'Bapak' : (/^(ibu|bu)/i.test(data.customer_name) ? 'Ibu' : 'Ka');
    const cleanCustomerName = data.customer_name.replace(/^(bapak|bpk\.?|pak\.?|ibu\.?|bu\.?|kakak\.?|kak\.?|ka\.?)\s+/i, '');
    
    const message = data.custom_message ||
      `Selamat siang ${salutationPrefix} ${cleanCustomerName}, pengingat ramah dari cabang kami untuk nota ${data.nota_number}. Barang kesayangan Anda (${data.item_name}) yang dirawat ${data.due_days} hari lalu sudah memasuki jadwal perawatan berkala agar kualitas tetap prima. Silakan mampir ke outlet kami untuk perawatan rutin!`;

    const waUrl = this.generateWaMeLink(data.customer_phone, message);

    const newLog: SapaanLogRecord = {
      id: `rem-jasa-${Date.now()}`,
      nota_number: data.nota_number,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name,
      item_type: 'SERVICE',
      due_days: data.due_days,
      scheduled_h_plus_days: data.due_days,
      category: 'REMINDER',
      reminder_type: 'JASA_PERAWATAN_BERKALA',
      message_text: message,
      scheduled_at: new Date(Date.now() + (data.due_days * 86400000)).toISOString(),
      status: 'ACTIVE',
      mandated_by: 'Owner / Kepala Cabang',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl,
    };

    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
  }

  static createRefillReminderForRetail(data: {
    nota_number: string;
    customer_name: string;
    customer_phone: string;
    item_name: string;
    due_days: number; // 30, 45, 60, 90, or custom
    custom_message?: string;
  }): SapaanLogRecord {
    const logs = this.getSapaanLogs();
    const salutationPrefix = /^(bapak|bpk|pak)/i.test(data.customer_name) ? 'Bapak' : (/^(ibu|bu)/i.test(data.customer_name) ? 'Ibu' : 'Ka');
    const cleanCustomerName = data.customer_name.replace(/^(bapak|bpk\.?|pak\.?|ibu\.?|bu\.?|kakak\.?|kak\.?|ka\.?)\s+/i, '');
    
    const message = data.custom_message ||
      `Selamat pagi ${salutationPrefix} ${cleanCustomerName}, produk ${data.item_name} yang Anda beli ${data.due_days} hari lalu pada nota ${data.nota_number} diperkirakan sudah mulai habis. Apakah ingin kami siapkan botol refill baru untuk Anda? Balas pesan ini untuk pemesanan langsung ya!`;

    const waUrl = this.generateWaMeLink(data.customer_phone, message);

    const newLog: SapaanLogRecord = {
      id: `rem-ret-${Date.now()}`,
      nota_number: data.nota_number,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name,
      item_type: 'PRODUCT',
      due_days: data.due_days,
      scheduled_h_plus_days: data.due_days,
      category: 'REMINDER',
      reminder_type: 'RETAIL_REFILL_BELANJA',
      message_text: message,
      scheduled_at: new Date(Date.now() + (data.due_days * 86400000)).toISOString(),
      status: 'ACTIVE',
      mandated_by: 'Owner / Kasir',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl,
    };

    logs.unshift(newLog);
    this.saveLogs(logs);
    return newLog;
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
      reminder_type: 'UMUM',
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
    item_type?: 'SERVICE' | 'PRODUCT';
  }): SapaanLogRecord {
    if (data.item_type === 'PRODUCT') {
      return this.createRefillReminderForRetail({
        nota_number: data.nota_number,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        item_name: data.item_name || 'Produk Retail',
        due_days: data.h_plus_days,
        custom_message: data.custom_message,
      });
    }

    return this.createMaintenanceReminderForJasa({
      nota_number: data.nota_number,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name || 'Layanan Service',
      due_days: data.h_plus_days,
      custom_message: data.custom_message,
    });
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
