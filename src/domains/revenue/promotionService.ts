export interface PromotionRecord {
  id: string;
  business_id: string;
  branch_id: string;
  name: string;
  code: string;
  discount_type: 'FIXED_AMOUNT' | 'PERCENTAGE';
  discount_value: number;
  min_spend: number;
  category?: 'TIME_BASED' | 'MILESTONE' | 'MIN_SPEND' | 'RETENTION';
  is_active: boolean;
  expiry_date?: string;
  created_at: string;
}

export class PromotionDomainService {
  private static mockPromotions: PromotionRecord[] = [
    {
      id: 'prm-001',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      name: '🕒 Promo Happy Hours Jam Sepi (13.00 - 15.00)',
      code: 'HAPPYHOUR15',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      min_spend: 50000,
      category: 'TIME_BASED',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prm-002',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      name: '🎯 Promo Milestone Loyalty (Target 5x Service)',
      code: 'MILESTONE20',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      min_spend: 100000,
      category: 'MILESTONE',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prm-003',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      name: '💰 Promo Gajian Minimal Belanja (Rp 150rb)',
      code: 'GAJIAN10',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 15000,
      min_spend: 150000,
      category: 'MIN_SPEND',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: new Date().toISOString(),
    }
  ];

  static getPromotions(): PromotionRecord[] {
    return [...this.mockPromotions];
  }

  /**
   * GD-05 Manual Discount Ceiling Policy
   * Cashier discount <= 10% is allowed. > 10% requires Manager (Tier 3) / Owner (Tier 2) authorization.
   */
  static validateManualDiscount(discountPercentage: number, actorRole: string): { isAllowed: boolean; requiresManagerAuth: boolean } {
    const roleLower = actorRole.toLowerCase();
    if (discountPercentage <= 10) {
      return { isAllowed: true, requiresManagerAuth: false };
    }
    if (roleLower === 'manager' || roleLower === 'owner' || roleLower === 'kepala_cabang') {
      return { isAllowed: true, requiresManagerAuth: true };
    }
    throw new Error('Manual discount greater than 10% requires Manager or Owner authorization (GD-05)');
  }

  /**
   * GD-06 Expired / Invalid Voucher Validation
   */
  static validateAndApplyPromo(code: string, cartTotal: number, currentDate: Date = new Date()): {
    isValid: boolean;
    discountAmount: number;
    message: string;
  } {
    const cleanCode = code.trim().toUpperCase();
    const promo = this.mockPromotions.find(p => p.code === cleanCode);

    if (!promo || !promo.is_active) {
      return { isValid: false, discountAmount: 0, message: 'Kode promo tidak ditemukan atau sudah tidak aktif (GD-06).' };
    }

    if (promo.expiry_date && currentDate.getTime() > new Date(promo.expiry_date).getTime()) {
      return { isValid: false, discountAmount: 0, message: 'Kode promo sudah kadaluarsa (GD-06).' };
    }

    if (cartTotal < promo.min_spend) {
      return {
        isValid: false,
        discountAmount: 0,
        message: `Minimal belanja untuk promo ini adalah Rp ${promo.min_spend.toLocaleString('id-ID')}. Total keranjang Anda: Rp ${cartTotal.toLocaleString('id-ID')}.`,
      };
    }

    let discount = 0;
    if (promo.discount_type === 'PERCENTAGE') {
      discount = (cartTotal * promo.discount_value) / 100;
    } else {
      discount = promo.discount_value;
    }

    return {
      isValid: true,
      discountAmount: Math.min(discount, cartTotal),
      message: `Promo '${promo.name}' berhasil dipasang! Potongan diskon: Rp ${discount.toLocaleString('id-ID')}.`,
    };
  }

  /**
   * GD-06 Manual Override Prohibition for Expired/Invalid Vouchers
   */
  static overrideVoucher(code: string, actorRole: string): never {
    throw new Error('Expired or invalid vouchers cannot be overridden manually under any role (GD-06 Strict Enforcement)');
  }

  static createPromotion(data: {
    name: string;
    code: string;
    discount_type: 'FIXED_AMOUNT' | 'PERCENTAGE';
    discount_value: number;
    min_spend: number;
    category?: 'TIME_BASED' | 'MILESTONE' | 'MIN_SPEND' | 'RETENTION';
    expiry_date?: string;
  }): PromotionRecord {
    const newPromo: PromotionRecord = {
      id: `prm-${Date.now()}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_spend: data.min_spend,
      category: data.category || 'MIN_SPEND',
      is_active: true,
      expiry_date: data.expiry_date,
      created_at: new Date().toISOString(),
    };

    this.mockPromotions.unshift(newPromo);
    return newPromo;
  }
}
