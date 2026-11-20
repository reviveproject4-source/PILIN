export interface PromoBasicItem {
  id: string;
  name: string;
  percentage: number;
  allow_cashier_override: boolean;
  is_active: boolean;
}

export interface PromoGeneralItem {
  id: string;
  title: string;
  discount_label: string;
  start_date: string;
  end_date: string;
  image_url: string | null;
  wa_message_template: string;
  is_active: boolean;
}

export interface PromoVoucherItem {
  id: string;
  code: string;
  title: string;
  discount_value: number;
  min_total_trx: number;
  image_url: string | null;
  valid_until: string;
  wa_message_template: string;
  is_active: boolean;
}

export interface PromoPoinConfig {
  is_active: boolean;
  earning_threshold: number; // e.g. Rp 10.000 = 1 poin
  point_redeem_value: number; // e.g. 1 poin = Rp 1.000 potongan
  min_redeem_points: number; // e.g. minimal 5 poin
}

export interface PromoBundleConfig {
  basics: PromoBasicItem[];
  generals: PromoGeneralItem[];
  vouchers: PromoVoucherItem[];
  poin: PromoPoinConfig;
  updated_at: string;
}

export class PromoManagementService {
  private static STORAGE_KEY = 'pilin_promo_loyalty_bundle';

  private static defaultConfig: PromoBundleConfig = {
    basics: [
      {
        id: 'basic-1',
        name: 'Promo Basic Reguler',
        percentage: 10,
        allow_cashier_override: true,
        is_active: true,
      },
      {
        id: 'basic-2',
        name: 'Promo Member Spesial',
        percentage: 15,
        allow_cashier_override: false,
        is_active: true,
      },
      {
        id: 'basic-3',
        name: 'Diskon Khusus Mahasiswa/Pelajar',
        percentage: 5,
        allow_cashier_override: true,
        is_active: true,
      },
    ],
    generals: [
      {
        id: 'gen-1',
        title: 'Promo Gajian Payday Super Bersih',
        discount_label: 'Diskon 20% Min. 8kg Cuci Setrika',
        start_date: '2026-11-25',
        end_date: '2026-12-05',
        image_url: null,
        wa_message_template: 'Halo Sahabat Laundry! Sambut awal bulan dan waktu gajian dengan pakaian wangi & rapi. Nikmati Promo Gajian Payday Diskon 20% khusus untuk layanan cuci setrika minimal 8kg. Berlaku hingga 5 Desember. Silakan antar cucian Anda hari ini!',
        is_active: true,
      },
      {
        id: 'gen-2',
        title: 'Promo Awal Bulan Cuci Bed Cover & Selimut',
        discount_label: 'Potongan Rp 15.000 Cuci Bed Cover',
        start_date: '2026-11-01',
        end_date: '2026-11-10',
        image_url: null,
        wa_message_template: 'Halo Kak! Awal bulan saatnya cuci bersih sprei & bed cover kesayangan. Dapatkan potongan langsung Rp 15.000 untuk pencucian Bed Cover Jumbo & King. Pakaian higienis, tidur makin nyenyak!',
        is_active: true,
      },
    ],
    vouchers: [
      {
        id: 'vch-1',
        code: 'LOYAL-TRIO-25K',
        title: 'Voucher Apresiasi Konsumen Loyal Rp 25.000',
        discount_value: 25000,
        min_total_trx: 3,
        image_url: null,
        valid_until: '2026-12-31',
        wa_message_template: 'Spesial untuk Kakak sebagai Konsumen Loyal kami! Kami berikan Voucher Apresiasi Rp 25.000 dengan kode: *LOYAL-TRIO-25K*. Cukup tunjukkan pesan WhatsApp ini ke Kasir saat transaksi cucian berikutnya ya Kak. Terima kasih atas kesetiaannya!',
        is_active: true,
      },
      {
        id: 'vch-2',
        code: 'VIP-BEDCOVER-FREE',
        title: 'Voucher VIP Diskon Rp 50.000',
        discount_value: 50000,
        min_total_trx: 5,
        image_url: null,
        valid_until: '2026-12-31',
        wa_message_template: 'Terima kasih atas kepercayaan Kakak! Sebagai pelanggan VIP setia kami, gunakan kode voucher *VIP-BEDCOVER-FREE* untuk potongan Rp 50.000 pada transaksi laundry Anda berikutnya. Sampai jumpa di outlet kami!',
        is_active: true,
      },
    ],
    poin: {
      is_active: true,
      earning_threshold: 10000, // Belanja Rp 10.000 = 1 Poin
      point_redeem_value: 1000, // 1 Poin = Rp 1.000 potongan
      min_redeem_points: 5, // Minimal tukar 5 poin (Rp 5.000)
    },
    updated_at: new Date().toISOString(),
  };

  static getConfig(businessId?: string): PromoBundleConfig {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY) ||
                       (businessId ? localStorage.getItem(`${this.STORAGE_KEY}_${businessId}`) : null);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed.basics)) {
            return parsed;
          }
        }
      } catch {}
    }
    return { ...this.defaultConfig };
  }

  static saveConfig(config: PromoBundleConfig, businessId?: string): void {
    if (typeof window !== 'undefined') {
      try {
        const json = JSON.stringify(config);
        localStorage.setItem(this.STORAGE_KEY, json);
        if (businessId) {
          localStorage.setItem(`${this.STORAGE_KEY}_${businessId}`, json);
        }
        window.dispatchEvent(new Event('pilin_promos_updated'));
      } catch {}
    }
  }

  // Helper untuk form nota POS
  static calculatePointsEarned(totalSpent: number, config?: PromoPoinConfig): number {
    const cfg = config || this.getConfig().poin;
    if (!cfg.is_active || cfg.earning_threshold <= 0) return 0;
    return Math.floor(totalSpent / cfg.earning_threshold);
  }

  static calculatePointsDiscount(pointsToRedeem: number, config?: PromoPoinConfig): number {
    const cfg = config || this.getConfig().poin;
    if (!cfg.is_active || pointsToRedeem < cfg.min_redeem_points) return 0;
    return pointsToRedeem * cfg.point_redeem_value;
  }
}
