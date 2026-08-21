import { TransactionStatus } from '../../lib/types';

export interface POSTransaction {
  id: string;
  business_id: string;
  branch_id: string;
  total_amount: number;
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

  static getTransactions(): POSTransaction[] {
    return [...this.mockTransactions];
  }

  static getTransactionById(id: string): POSTransaction | undefined {
    return this.mockTransactions.find(t => t.id === id);
  }

  /**
   * GD-09 / OD-03: Evaluates refund approval tier
   * Default:
   * - amount < Rp 500,000 -> TIER_3_MANAGER
   * - amount >= Rp 500,000 -> TIER_2_OWNER
   * Optional Tenant Lower Threshold:
   * - If configured and < Rp 500,000, amount >= tenantThreshold -> TIER_2_OWNER
   * - Tenant threshold MUST NOT exceed Rp 500,000
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
   * Pre-completion transactions (DRAFT, PENDING_PAYMENT) -> Void lifecycle (GD-08)
   * COMPLETED / PAID transactions -> Refund approval flow (GD-09)
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
