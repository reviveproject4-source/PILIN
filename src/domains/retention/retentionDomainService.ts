import { HypnosellingEngine, HypnosellingMessagePayload } from './hypnosellingEngine';

export interface SapaanLogRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  item_name?: string;
  due_days?: number;
  category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING';
  message_text: string;
  scheduled_at: string;
  status: 'ACTIVE' | 'SENT' | 'FAILED';
  created_at: string;
  wa_me_url?: string;
}

export class RetentionDomainService {
  private static mockSapaanLogs: SapaanLogRecord[] = [];

  static getSapaanLogs(): SapaanLogRecord[] {
    return [...this.mockSapaanLogs];
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

  static scheduleSapaan(data: {
    customer_name: string;
    customer_phone: string;
    item_name?: string;
    due_days?: number;
    category: 'SAPAAN' | 'QUOTE' | 'HYPPOSELLING';
    message_text: string;
  }): SapaanLogRecord {
    const waUrl = this.generateWaMeLink(data.customer_phone, data.message_text);

    const newLog: SapaanLogRecord = {
      id: `sap-${Date.now()}`,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      item_name: data.item_name || 'Barang Service',
      due_days: data.due_days || 30,
      category: data.category,
      message_text: data.message_text,
      scheduled_at: new Date(Date.now() + ((data.due_days || 30) * 86400000)).toISOString(),
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      wa_me_url: waUrl
    };

    this.mockSapaanLogs.unshift(newLog);
    return newLog;
  }
}
