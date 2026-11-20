export interface RegularTransactionItem {
  id: string;
  business_id: string;
  customer: string;
  phone: string;
  customerAddress?: string;
  service: string;
  qty: number;
  pricing_unit?: string;
  price: number;
  subtotal: number;
  discount_amount?: number;
  promo_name?: string;
  points_used?: number;
  points_discount?: number;
  deposit_used?: number;
  remaining_deposit_balance?: number;
  total: number;
  payment_type: 'LUNAS' | 'DP';
  dp_amount?: number;
  remaining_amount?: number;
  method: 'CASH' | 'QRIS_TRANSFER' | 'DEPOSIT';
  status: 'COMPLETED' | 'CANCELLED';
  time: string;
  date: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  cancelled_by?: string;
  items?: Array<{
    id: string;
    service: string;
    qty: number;
    price: number;
    pricing_unit: string;
    subtotal: number;
  }>;
}

export interface DepositTopupItem {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  previous_balance: number;
  current_balance: number;
  payment_method: 'CASH' | 'QRIS_TRANSFER';
  status: 'SUCCESS' | 'CANCELLED';
  time: string;
  date: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  cancelled_by?: string;
  notes?: string;
}

export class TransactionManagementService {
  private static defaultTransactions: RegularTransactionItem[] = [
    {
      id: 'NOT-2026-0895',
      business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      customer: 'Pak cece',
      phone: '081218388131',
      service: 'Cuci Kiloan Reguler',
      qty: 6,
      pricing_unit: 'kg',
      price: 10000,
      subtotal: 60000,
      discount_amount: 6000,
      promo_name: 'Promo Basic 10%',
      points_used: 0,
      points_discount: 0,
      total: 54000,
      payment_type: 'LUNAS',
      method: 'CASH',
      status: 'COMPLETED',
      time: '14:20 WIB',
      date: '2026-11-20',
    },
    {
      id: 'NOT-2026-0894',
      business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      customer: 'Bu Reynanda',
      phone: '081283164785',
      service: 'Bed Cover Jumbo + Sprei',
      qty: 1,
      pricing_unit: 'pcs',
      price: 35000,
      subtotal: 35000,
      discount_amount: 0,
      points_used: 5,
      points_discount: 5000,
      total: 30000,
      payment_type: 'LUNAS',
      method: 'QRIS_TRANSFER',
      status: 'COMPLETED',
      time: '12:10 WIB',
      date: '2026-11-20',
    },
    {
      id: 'NOT-2026-0893',
      business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      customer: 'Bu sonya',
      phone: '085694206061',
      service: 'Cuci Kiloan Express 1 Hari',
      qty: 4,
      pricing_unit: 'kg',
      price: 15000,
      subtotal: 60000,
      discount_amount: 0,
      points_used: 0,
      points_discount: 0,
      total: 60000,
      payment_type: 'DP',
      dp_amount: 30000,
      remaining_amount: 30000,
      method: 'CASH',
      status: 'COMPLETED',
      time: '10:45 WIB',
      date: '2026-11-20',
    },
  ];

  private static defaultTopups: DepositTopupItem[] = [
    {
      id: 'DEP-2026-0001',
      business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      customer_id: 'cust-sl-081218388131',
      customer_name: 'Pak cece',
      customer_phone: '081218388131',
      amount: 200000,
      previous_balance: 0,
      current_balance: 200000,
      payment_method: 'CASH',
      status: 'SUCCESS',
      time: '09:15 WIB',
      date: '2026-11-20',
      notes: 'Paket Deposit Laundry Hemat',
    },
    {
      id: 'DEP-2026-0002',
      business_id: '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
      customer_id: 'cust-sl-081283164785',
      customer_name: 'Bu Reynanda',
      customer_phone: '081283164785',
      amount: 150000,
      previous_balance: 25000,
      current_balance: 175000,
      payment_method: 'QRIS_TRANSFER',
      status: 'SUCCESS',
      time: '11:00 WIB',
      date: '2026-11-20',
      notes: 'Top up bulanan',
    },
  ];

  static getRegularTransactions(businessId: string = '8ec99d6e-3f6f-47d4-910f-265cfe26c609'): RegularTransactionItem[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pilin_regular_trx_${businessId}`) ||
                       localStorage.getItem('pilin_regular_trx_master');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [...this.defaultTransactions];
  }

  static saveRegularTransactions(businessId: string, list: RegularTransactionItem[]): void {
    if (typeof window !== 'undefined') {
      try {
        const json = JSON.stringify(list);
        localStorage.setItem(`pilin_regular_trx_${businessId}`, json);
        localStorage.setItem('pilin_regular_trx_master', json);
        localStorage.setItem('pilin_regular_trx_default', json);
        window.dispatchEvent(new Event('pilin_transactions_updated'));
      } catch {}
    }
  }

  static addRegularTransaction(businessId: string, trx: RegularTransactionItem): void {
    const list = this.getRegularTransactions(businessId);
    const updated = [trx, ...list.filter(t => t.id !== trx.id)];
    this.saveRegularTransactions(businessId, updated);
  }

  static cancelRegularTransaction(
    businessId: string,
    trxId: string,
    reason: string,
    cancelledBy: string = 'Owner'
  ): { success: boolean; message: string } {
    const list = this.getRegularTransactions(businessId);
    const found = list.find(t => t.id === trxId);
    if (!found) {
      return { success: false, message: `Nota ${trxId} tidak ditemukan.` };
    }
    if (found.status === 'CANCELLED') {
      return { success: false, message: `Nota ${trxId} sudah dalam status dibatalkan.` };
    }

    const updated = list.map(t => {
      if (t.id === trxId) {
        return {
          ...t,
          status: 'CANCELLED' as const,
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason || 'Dibatalkan oleh Owner',
          cancelled_by: cancelledBy,
        };
      }
      return t;
    });

    this.saveRegularTransactions(businessId, updated);
    return { success: true, message: `Nota ${trxId} berhasil dihapus/dibatalkan secara resmi.` };
  }

  static getDepositTopups(businessId: string = '8ec99d6e-3f6f-47d4-910f-265cfe26c609'): DepositTopupItem[] {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pilin_deposit_topups_${businessId}`) ||
                       localStorage.getItem('pilin_deposit_topups_master');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [...this.defaultTopups];
  }

  static saveDepositTopups(businessId: string, list: DepositTopupItem[]): void {
    if (typeof window !== 'undefined') {
      try {
        const json = JSON.stringify(list);
        localStorage.setItem(`pilin_deposit_topups_${businessId}`, json);
        localStorage.setItem('pilin_deposit_topups_master', json);
        localStorage.setItem('pilin_deposit_topups_default', json);
        window.dispatchEvent(new Event('pilin_deposits_updated'));
      } catch {}
    }
  }

  static addDepositTopup(businessId: string, item: DepositTopupItem): void {
    const list = this.getDepositTopups(businessId);
    const updated = [item, ...list.filter(d => d.id !== item.id)];
    this.saveDepositTopups(businessId, updated);
  }

  static cancelDepositTopup(
    businessId: string,
    topupId: string,
    reason: string,
    cancelledBy: string = 'Owner'
  ): { success: boolean; message: string; refundedAmount?: number; customerPhone?: string } {
    const list = this.getDepositTopups(businessId);
    const found = list.find(d => d.id === topupId);
    if (!found) {
      return { success: false, message: `Transaksi deposit ${topupId} tidak ditemukan.` };
    }
    if (found.status === 'CANCELLED') {
      return { success: false, message: `Transaksi deposit ${topupId} sudah pernah dibatalkan.` };
    }

    const updated = list.map(d => {
      if (d.id === topupId) {
        return {
          ...d,
          status: 'CANCELLED' as const,
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason || 'Dibatalkan oleh Owner',
          cancelled_by: cancelledBy,
        };
      }
      return d;
    });

    this.saveDepositTopups(businessId, updated);
    return {
      success: true,
      message: `Top-up deposit ${topupId} sebesar Rp ${found.amount.toLocaleString('id-ID')} berhasil dibatalkan.`,
      refundedAmount: found.amount,
      customerPhone: found.customer_phone,
    };
  }
}
