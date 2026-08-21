export const ACTIVATION_FEE_AMOUNT = 1000000; // Rp 1,000,000 one-time (Promo until 31 Dec 2026)
export const MIN_SALDO_PILIN_TOPUP = 100000; // Minimum initial deposit / top-up Rp 100,000
export const WA_MESSAGE_UNIT_PRICE = 350; // Rp 350 / WhatsApp message
export const LOW_BALANCE_ALERT_THRESHOLD = 15000; // Alert Owner when balance < Rp 15,000
export const SALES_COMMISSION_RATE = 0.05; // 5% sales commission rate

export type CommercialCategory = 'CUSTOMER_RELATIONSHIP' | 'CUSTOMER_GROWTH' | 'CUSTOMER_CAMPAIGN' | 'CUSTOMER_ADVOCACY';

export type CommunicationClass = 'TRANSACTIONAL' | 'CUSTOMER_RELATIONSHIP' | 'CUSTOMER_CAMPAIGN';

export interface FeaturePricingItem {
  id: string;
  category: CommercialCategory;
  categoryName: string;
  name: string;
  code: string;
  monthlyPrice: number;
  description: string;
  isAddon?: boolean;
}

export const PILIN_FEATURE_PRICING_CATALOG: FeaturePricingItem[] = [
  // CUSTOMER RELATIONSHIP
  { id: 'feat-sapaan', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Sapaan', code: 'SAPAAN', monthlyPrice: 75000, description: 'Sapaan otomatis & personalisasi pelanggan' },
  { id: 'feat-reminder', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Reminder', code: 'REMINDER', monthlyPrice: 200000, description: 'Reminder pengerjaan, SLA & pengembalian' },
  { id: 'feat-smart-loyalty', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Smart Loyalty', code: 'SMART_LOYALTY', monthlyPrice: 350000, description: 'Program stamp digital & loyalty point' },
  { id: 'feat-milestone', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Milestone', code: 'MILESTONE', monthlyPrice: 110000, description: 'Notifikasi milestone & level pencapaian' },
  { id: 'feat-customer-setia', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Customer Setia', code: 'CUSTOMER_SETIA', monthlyPrice: 120000, description: 'Program apresiasi pelanggan setia' },
  { id: 'feat-reactivation', category: 'CUSTOMER_RELATIONSHIP', categoryName: 'Customer Relationship', name: 'Reactivation', code: 'REACTIVATION', monthlyPrice: 80000, description: 'Reaktivasi pelanggan pasif/tidur' },

  // CUSTOMER GROWTH
  { id: 'feat-hypnoselling', category: 'CUSTOMER_GROWTH', categoryName: 'Customer Growth', name: 'Hypnoselling', code: 'HYPNOSELLING', monthlyPrice: 100000, description: 'Sapaan & quote hypnoselling bisnis' },
  { id: 'feat-happy-hour', category: 'CUSTOMER_GROWTH', categoryName: 'Customer Growth', name: 'Happy Hour', code: 'HAPPY_HOUR', monthlyPrice: 100000, description: 'Promo otomatis jam sepi cabang' },
  { id: 'feat-upselling', category: 'CUSTOMER_GROWTH', categoryName: 'Customer Growth', name: 'Upselling & Cross-selling', code: 'UPSELLING_CROSS', monthlyPrice: 150000, description: 'Rekomendasi penawaran layanan tambahan' },
  { id: 'feat-reminder-stok', category: 'CUSTOMER_GROWTH', categoryName: 'Customer Growth', name: 'Reminder Stok', code: 'REMINDER_STOK', monthlyPrice: 125000, description: 'Notifikasi pengingat stok & bahan baku' },

  // CUSTOMER CAMPAIGN
  { id: 'feat-blas', category: 'CUSTOMER_CAMPAIGN', categoryName: 'Customer Campaign', name: 'BLAS / Broadcast Promo', code: 'BLAS', monthlyPrice: 150000, description: 'Broadcast kampanye promo massal (Add-on)', isAddon: true },

  // CUSTOMER ADVOCACY
  { id: 'feat-referral', category: 'CUSTOMER_ADVOCACY', categoryName: 'Customer Advocacy', name: 'Referral / Ajak Teman', code: 'REFERRAL', monthlyPrice: 130000, description: 'Program rujukan & ajak teman baru' }
];

export class CommercialDomainService {
  static getPricingCatalog(): FeaturePricingItem[] {
    return [...PILIN_FEATURE_PRICING_CATALOG];
  }

  static getFeatureByCode(code: string): FeaturePricingItem | undefined {
    const clean = code.trim().toUpperCase();
    return PILIN_FEATURE_PRICING_CATALOG.find(f => f.code === clean);
  }

  static calculateMonthlySubscription(activeFeatureCodes: string[]): {
    itemized: { code: string; name: string; monthlyPrice: number }[];
    totalMonthlyFee: number;
  } {
    const itemized = activeFeatureCodes.map(code => {
      const feat = this.getFeatureByCode(code);
      return {
        code,
        name: feat ? feat.name : code,
        monthlyPrice: feat ? feat.monthlyPrice : 0
      };
    });

    const totalMonthlyFee = itemized.reduce((sum, item) => sum + item.monthlyPrice, 0);

    return { itemized, totalMonthlyFee };
  }
}
