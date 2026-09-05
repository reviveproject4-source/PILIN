import { TransactionStatus } from '../../lib/types';
import { ServiceCatalogService } from '../catalog/serviceCatalogService';
import { POSTransactionRepository } from './POSTransactionRepository';

export interface POSTransactionItemInput {
  service_id: string;
  qty: number;
  unit_price: number;
  discount?: number;
}

export interface POSTransactionItemRecord {
  id: string;
  transaction_id: string;
  service_id: string;
  qty: number;
  unit_price: number;
  unit_hpp: number; // Immutable HPP snapshot at checkout
  discount: number;
  subtotal: number;
  line_hpp: number; // qty * unit_hpp
}

export interface POSTransaction {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id?: string;
  kasir_employee_id?: string;
  total_amount: number;
  total_hpp?: number; // Sum of line_hpp
  items?: POSTransactionItemRecord[];
  status: TransactionStatus;
  created_by: string;
  approved_by?: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_tier?: 'TIER_3_MANAGER' | 'TIER_2_OWNER';
  created_at: string;
  updated_at?: string;
}

export class POSTransactionService {
  private static forceMockMode = false;
  private static mockTransactions: POSTransaction[] = [
    {
      id: 'trx-00000000-0000-0000-0000-000000000001',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      total_amount: 350000,
      status: 'COMPLETED',
      created_by: 'cashier-001',
      created_at: new Date('2026-08-10').toISOString(),
    },
    {
      id: 'trx-00000000-0000-0000-0000-000000000002',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      total_amount: 750000,
      status: 'COMPLETED',
      created_by: 'cashier-001',
      created_at: new Date('2026-08-11').toISOString(),
    },
    {
      id: 'trx-00000000-0000-0000-0000-000000000003',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      total_amount: 200000,
      status: 'PENDING_PAYMENT',
      created_by: 'cashier-001',
      created_at: new Date('2026-08-12').toISOString(),
    },
    {
      id: 'trx-00000000-0000-0000-0000-000000000004',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      total_amount: 150000,
      status: 'COMPLETED',
      created_by: 'cashier-001',
      created_at: new Date('2026-08-13').toISOString(),
    },
    {
      id: 'trx-00000000-0000-0000-0000-000000000005',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      total_amount: 400000,
      status: 'COMPLETED',
      created_by: 'cashier-001',
      created_at: new Date('2026-08-14').toISOString(),
    },
  ];

  static setMockMode(enabled: boolean): void {
    this.forceMockMode = enabled;
  }

  static getTransactions(): POSTransaction[] {
    return [...this.mockTransactions];
  }

  static getTransactionById(id: string): POSTransaction | undefined {
    return this.mockTransactions.find(t => t.id === id);
  }

  static resetTransactionsForTest(): void {
    this.mockTransactions = [];
  }

  /**
   * P0-2 Database Persistent POS Checkout via Repository
   */
  static async checkoutDb(params: {
    branch_id: string;
    items: POSTransactionItemInput[];
    customer_id?: string;
    payment_method?: string;
    discount?: number;
    client_trx_id?: string;
  }): Promise<POSTransaction> {
    return await POSTransactionRepository.createTransactionInDb(params);
  }

  /**
   * P0-2 Database Fetch Transactions
   */
  static async fetchTransactionsDb(branchId?: string): Promise<POSTransaction[]> {
    return await POSTransactionRepository.fetchTransactionsFromDb(branchId);
  }

  /**
   * P0-2 Database Refund Execution
   */
  static async processRefundDb(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    approverRole: string;
    approverId: string;
    tenantLowerThreshold?: number;
  }): Promise<POSTransaction> {
    const existing = await POSTransactionRepository.fetchTransactionByIdFromDb(params.transactionId);
    if (!existing) {
      throw new Error('Transaction not found for refund');
    }

    if (existing.status !== 'COMPLETED') {
      throw new Error(`Only COMPLETED transactions can be refunded. Current status: ${existing.status}`);
    }

    if (params.refundAmount <= 0 || params.refundAmount > existing.total_amount) {
      throw new Error(`Invalid refund amount. Must be between 1 and ${existing.total_amount}`);
    }

    // GD-19 Strict SoD Assertion: Creator cannot approve own refund
    if (existing.created_by && existing.created_by === params.approverId) {
      throw new Error('Creator cannot approve own transaction refund (GD-19 Strict SoD)');
    }

    const requiredTier = this.evaluateRefundApprovalTier(params.refundAmount, params.tenantLowerThreshold);
    const roleLower = params.approverRole.toLowerCase();

    if (requiredTier === 'TIER_2_OWNER' && roleLower !== 'owner') {
      throw new Error('Unauthorized refund approval: Tier 2 Owner authority required for refund >= threshold (GD-09 / OD-03)');
    }

    if (requiredTier === 'TIER_3_MANAGER' && roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized refund approval: Tier 3 Manager or Owner authority required (GD-09)');
    }

    return await POSTransactionRepository.processRefundInDb({
      transactionId: params.transactionId,
      refundAmount: params.refundAmount,
      reason: params.reason,
      requiredTier,
      approverId: params.approverId,
    });
  }

  /**
   * P0-1 HPP Snapshot Checkout (Synchronous In-Memory for Domain Unit Tests)
   */
  static createTransaction(data: {
    business_id: string;
    branch_id: string;
    created_by: string;
    items: POSTransactionItemInput[];
    customer_id?: string;
    payment_method?: string;
  }): POSTransaction {
    const itemRecords: POSTransactionItemRecord[] = [];
    let totalAmount = 0;
    let totalHpp = 0;

    const trxId = `trx-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const input of data.items) {
      if (input.qty <= 0) {
        throw new Error('Transaction item quantity must be greater than zero');
      }
      if (input.unit_price < 0) {
        throw new Error('Transaction item price cannot be negative');
      }

      // Snapshot unit_hpp from master catalog at transaction creation time
      const catalogItem = ServiceCatalogService.getServiceById(input.service_id);
      const unitHpp = catalogItem ? catalogItem.hpp : 0;

      const discount = input.discount || 0;
      const subtotal = input.qty * input.unit_price - discount;
      const lineHpp = input.qty * unitHpp;

      totalAmount += subtotal;
      totalHpp += lineHpp;

      itemRecords.push({
        id: `item-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        transaction_id: trxId,
        service_id: input.service_id,
        qty: input.qty,
        unit_price: input.unit_price,
        unit_hpp: unitHpp, // Immutable HPP snapshot
        discount,
        subtotal,
        line_hpp: lineHpp,
      });
    }

    const newTrx: POSTransaction = {
      id: trxId,
      business_id: data.business_id,
      branch_id: data.branch_id,
      customer_id: data.customer_id,
      total_amount: totalAmount,
      total_hpp: totalHpp,
      items: itemRecords,
      status: 'COMPLETED',
      created_by: data.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockTransactions.unshift(newTrx);
    return newTrx;
  }

  static getTotalCompletedHpp(): number {
    return this.mockTransactions.reduce((sum, t) => {
      if (t.status === 'COMPLETED') {
        return sum + (t.total_hpp || 0);
      }
      return sum;
    }, 0);
  }

  /**
   * GD-09 / OD-03: Evaluates refund approval tier
   */
  static evaluateRefundApprovalTier(
    amount: number,
    tenantLowerThreshold?: number
  ): 'TIER_3_MANAGER' | 'TIER_2_OWNER' {
    let effectiveOwnerThreshold = 500000;

    if (tenantLowerThreshold !== undefined) {
      if (tenantLowerThreshold > 500000) {
        throw new Error('Tenant refund threshold cannot exceed the governed ceiling of Rp 500,000 (OD-03)');
      }
      effectiveOwnerThreshold = tenantLowerThreshold;
    }

    if (amount >= effectiveOwnerThreshold) {
      return 'TIER_2_OWNER';
    }
    return 'TIER_3_MANAGER';
  }

  /**
   * Refund / Void Boundary Enforcement
   */
  static requestVoid(transactionId: string, actorRole: string, actorId: string): POSTransaction {
    const trx = this.mockTransactions.find(t => t.id === transactionId);
    if (!trx) {
      throw new Error('Transaction not found');
    }

    if (trx.status === 'COMPLETED') {
      throw new Error('Completed transactions cannot bypass Refund approval through Void. Use Refund flow (GD-09 / GD-08 Boundary)');
    }

    if (trx.status === 'VOIDED') {
      throw new Error('Transaction is already voided');
    }

    trx.status = 'VOIDED';
    trx.updated_at = new Date().toISOString();
    return trx;
  }

  /**
   * GD-09 / OD-03: Processes a Refund for COMPLETED transactions with strict Tier Authority & SoD
   */
  static processRefund(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    approverRole: string;
    approverId: string;
    tenantLowerThreshold?: number;
  }): POSTransaction {
    const trx = this.mockTransactions.find(t => t.id === params.transactionId);
    if (!trx) {
      throw new Error('Transaction not found for refund');
    }

    if (trx.status !== 'COMPLETED') {
      throw new Error(`Only COMPLETED transactions can be refunded. Current state: ${trx.status}`);
    }

    if (params.refundAmount <= 0 || params.refundAmount > trx.total_amount) {
      throw new Error(`Invalid refund amount. Must be between 1 and ${trx.total_amount}`);
    }

    // GD-19 Strict SoD Assertion: Creator cannot approve own refund
    if (trx.created_by && trx.created_by === params.approverId) {
      throw new Error('Creator cannot approve own transaction refund (GD-19 Strict SoD)');
    }

    const requiredTier = this.evaluateRefundApprovalTier(params.refundAmount, params.tenantLowerThreshold);
    const roleLower = params.approverRole.toLowerCase();

    if (requiredTier === 'TIER_2_OWNER' && roleLower !== 'owner') {
      throw new Error('Unauthorized refund approval: Tier 2 Owner authority required for refund >= threshold (GD-09 / OD-03)');
    }

    if (requiredTier === 'TIER_3_MANAGER' && roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized refund approval: Tier 3 Manager or Owner authority required (GD-09)');
    }

    trx.status = 'REFUNDED' as TransactionStatus;
    trx.refund_amount = params.refundAmount;
    trx.refund_reason = params.reason.trim();
    trx.refund_tier = requiredTier;
    trx.approved_by = params.approverId;
    trx.updated_at = new Date().toISOString();

    return trx;
  }
}
