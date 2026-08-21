export interface ExpenseRecord {
  id: string;
  business_id: string;
  branch_id: string;
  category: 'OPERATIONAL' | 'UTILITIES' | 'SUPPLIES' | 'MAINTENANCE';
  amount: number;
  notes?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REVERSED';
  approval_tier: 'TIER_3_MANAGER' | 'TIER_2_OWNER';
  created_by: string;
  created_by_role: string;
  approved_by?: string;
  is_reversal?: boolean;
  original_expense_id?: string;
  created_at: string;
  updated_at?: string;
}

export class ExpenseDomainService {
  private static mockExpenses: ExpenseRecord[] = [];

  static getExpenses(): ExpenseRecord[] {
    return [...this.mockExpenses];
  }

  static getTotalExpenses(): number {
    return this.mockExpenses.reduce((sum, e) => {
      if (e.status === 'REJECTED') return sum;
      return sum + e.amount;
    }, 0);
  }

  /**
   * GD-01 & GD-02: Determines approval tier routing
   * - <= Rp 5,000,000 created by Cashier/Pegawai -> TIER_3_MANAGER
   * - > Rp 5,000,000 -> TIER_2_OWNER
   * - Created by Manager -> TIER_2_OWNER (GD-02 Manager Escalation)
   */
  static evaluateApprovalRouting(amount: number, creatorRole: string): 'TIER_3_MANAGER' | 'TIER_2_OWNER' {
    const roleLower = creatorRole.toLowerCase();
    if (roleLower === 'manager' || roleLower === 'kepala_cabang') {
      // GD-02: Manager creator MUST escalate to Owner
      return 'TIER_2_OWNER';
    }
    if (amount > 5000000) {
      // GD-01: > 5M requires Owner
      return 'TIER_2_OWNER';
    }
    // GD-01: <= 5M requires Manager
    return 'TIER_3_MANAGER';
  }

  static recordExpense(data: {
    category: ExpenseRecord['category'];
    amount: number;
    notes?: string;
    created_by?: string;
    created_by_role?: string;
  }): ExpenseRecord {
    const creator = data.created_by || 'emp-001';
    const role = data.created_by_role || 'CASHIER';
    const tier = this.evaluateApprovalRouting(data.amount, role);

    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      category: data.category,
      amount: data.amount,
      notes: data.notes ? data.notes.trim() : undefined,
      status: 'PENDING_APPROVAL',
      approval_tier: tier,
      created_by: creator,
      created_by_role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockExpenses.unshift(newExpense);
    return newExpense;
  }

  /**
   * GD-01 & GD-19: Approves an expense with strict role authority & SoD assertions
   */
  static approveExpense(expenseId: string, approverRole: string, approverId: string): ExpenseRecord {
    const roleLower = approverRole.toLowerCase();
    const record = this.mockExpenses.find(e => e.id === expenseId);
    if (!record) {
      throw new Error('Expense record not found');
    }

    if (record.status !== 'PENDING_APPROVAL') {
      throw new Error(`Expense cannot be approved from current state: ${record.status}`);
    }

    // GD-19 Universal SoD: Creator cannot approve own expense
    if (record.created_by && record.created_by === approverId) {
      throw new Error('Creator cannot approve own expense record (GD-19 Strict SoD)');
    }

    // GD-01 & GD-02 Approval Tier Verification
    if (record.approval_tier === 'TIER_2_OWNER' && roleLower !== 'owner') {
      throw new Error('Unauthorized approval: Tier 2 Owner authority required (GD-01 / GD-02)');
    }

    if (record.approval_tier === 'TIER_3_MANAGER' && roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized approval: Tier 3 Manager or Owner authority required (GD-01)');
    }

    record.status = 'APPROVED';
    record.approved_by = approverId;
    record.updated_at = new Date().toISOString();

    return record;
  }

  /**
   * GD-03 Reversal Event Transaction ("Don't Erase")
   * Original record is NOT deleted or modified. Creates balancing minus record.
   */
  static createReversalEvent(originalExpenseId: string, reason: string, actorRole: string, actorId: string): ExpenseRecord {
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized reversal: Manager or Owner required');
    }

    const original = this.mockExpenses.find(e => e.id === originalExpenseId);
    if (!original) {
      throw new Error('Original expense record not found for reversal');
    }

    // Update original record status to REVERSED without erasing it (Don't Erase)
    original.status = 'REVERSED';
    original.updated_at = new Date().toISOString();

    // Create separate balancing reversal record
    const reversalRecord: ExpenseRecord = {
      id: `exp-rev-${Date.now()}`,
      business_id: original.business_id,
      branch_id: original.branch_id,
      category: original.category,
      amount: -original.amount, // Balancing minus amount
      notes: `REVERSAL: ${reason.trim()} (Original Expense ID: ${originalExpenseId})`,
      status: 'APPROVED',
      approval_tier: original.approval_tier,
      created_by: actorId,
      created_by_role: actorRole,
      approved_by: actorId,
      is_reversal: true,
      original_expense_id: originalExpenseId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockExpenses.unshift(reversalRecord);
    return reversalRecord;
  }
}
