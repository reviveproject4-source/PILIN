import { createClient } from '../../lib/supabase/client';
import { POSTransaction, POSTransactionItemInput } from './POSTransactionService';

export class POSTransactionRepository {
  /**
   * Executes atomic POS checkout RPC against Supabase database
   */
  static async createTransactionInDb(params: {
    branch_id: string;
    items: POSTransactionItemInput[];
    customer_id?: string;
    payment_method?: string;
    discount?: number;
    client_trx_id?: string;
  }): Promise<POSTransaction> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('create_pos_transaction', {
      p_branch_id: params.branch_id,
      p_items: params.items,
      p_customer_id: params.customer_id || null,
      p_payment_method: params.payment_method || 'cash',
      p_header_discount: params.discount || 0,
      p_client_trx_id: params.client_trx_id || null,
    });

    if (error) {
      throw new Error(`[POS DB Checkout Error] ${error.message}`);
    }

    if (!data) {
      throw new Error('[POS DB Checkout Error] RPC returned empty transaction payload');
    }

    // Map DB JSON response to POSTransaction domain model
    const trx = data as POSTransaction;
    
    // Calculate line_hpp and total_hpp for domain consistency if needed
    if (trx.items && Array.isArray(trx.items)) {
      let totalHpp = 0;
      trx.items.forEach(item => {
        item.line_hpp = (item.qty || 0) * (item.unit_hpp || 0);
        totalHpp += item.line_hpp;
      });
      trx.total_hpp = totalHpp;
    }

    return trx;
  }

  /**
   * Executes database persistence for Refund lifecycle transition (P0-2 Scope Amendment)
   */
  static async processRefundInDb(params: {
    transactionId: string;
    refundAmount: number;
    reason: string;
    requiredTier: 'TIER_3_MANAGER' | 'TIER_2_OWNER';
    approverId: string;
  }): Promise<POSTransaction> {
    const supabase = createClient();

    // 1. Fetch transaction to verify existence and COMPLETED state
    const existing = await this.fetchTransactionByIdFromDb(params.transactionId);
    if (!existing) {
      throw new Error('[POS DB Refund Error] Transaction not found');
    }

    if (existing.status !== 'COMPLETED') {
      throw new Error(`[POS DB Refund Error] Only COMPLETED transactions can be refunded. Current status: ${existing.status}`);
    }

    // 2. Update status to REFUNDED and write metadata
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status: 'REFUNDED',
        refund_amount: params.refundAmount,
        refund_reason: params.reason,
        refund_tier: params.requiredTier,
        approved_by: params.approverId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.transactionId)
      .eq('status', 'COMPLETED') // Optimistic state concurrency predicate
      .select(`
        *,
        items:transaction_items(*)
      `)
      .single();

    if (error) {
      throw new Error(`[POS DB Refund Error] ${error.message}`);
    }

    // 3. Write Audit Log Event
    await supabase.from('audit_logs').insert([{
      business_id: data.business_id,
      branch_id: data.branch_id,
      actor_user_id: params.approverId,
      operation: 'TRANSACTION_REFUNDED',
      entity: 'transactions',
      entity_id: params.transactionId,
      payload_sanitized: {
        transaction_id: params.transactionId,
        refund_amount: params.refundAmount,
        refund_reason: params.reason,
        refund_tier: params.requiredTier,
      },
      created_at: new Date().toISOString(),
    }]);

    const items = (data.items || []).map((ti: any) => ({
      id: ti.id,
      transaction_id: ti.transaction_id,
      service_id: ti.service_id,
      qty: ti.qty,
      unit_price: Number(ti.unit_price),
      unit_hpp: Number(ti.unit_hpp || 0),
      discount: Number(ti.discount || 0),
      subtotal: Number(ti.subtotal),
      line_hpp: Number(ti.qty) * Number(ti.unit_hpp || 0),
    }));

    const totalHpp = items.reduce((sum: number, it: any) => sum + it.line_hpp, 0);

    return {
      id: data.id,
      business_id: data.business_id,
      branch_id: data.branch_id,
      customer_id: data.customer_id,
      kasir_employee_id: data.kasir_employee_id,
      total_amount: Number(data.total_amount),
      total_hpp: totalHpp,
      items,
      status: data.status,
      created_by: data.kasir_employee_id || 'system',
      approved_by: data.approved_by,
      refund_amount: Number(data.refund_amount),
      refund_reason: data.refund_reason,
      refund_tier: data.refund_tier,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Fetches transactions with joined transaction items from database
   */
  static async fetchTransactionsFromDb(branchId?: string): Promise<POSTransaction[]> {
    const supabase = createClient();

    let query = supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(*)
      `)
      .order('created_at', { ascending: false });

    if (branchId) {
      query = query.eq('branch_id', branchId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[POS Repository Fetch Error] ${error.message}`);
    }

    return (data || []).map(row => {
      const items = (row.items || []).map((ti: any) => ({
        id: ti.id,
        transaction_id: ti.transaction_id,
        service_id: ti.service_id,
        qty: ti.qty,
        unit_price: Number(ti.unit_price),
        unit_hpp: Number(ti.unit_hpp || 0),
        discount: Number(ti.discount || 0),
        subtotal: Number(ti.subtotal),
        line_hpp: Number(ti.qty) * Number(ti.unit_hpp || 0),
      }));

      const totalHpp = items.reduce((sum: number, it: any) => sum + it.line_hpp, 0);

      return {
        id: row.id,
        business_id: row.business_id,
        branch_id: row.branch_id,
        customer_id: row.customer_id,
        kasir_employee_id: row.kasir_employee_id,
        total_amount: Number(row.total_amount),
        total_hpp: totalHpp,
        items,
        status: row.status,
        created_by: row.kasir_employee_id || 'system',
        approved_by: row.approved_by,
        refund_amount: Number(row.refund_amount || 0),
        refund_reason: row.refund_reason,
        refund_tier: row.refund_tier,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  }

  /**
   * Fetches single transaction by ID with items from database
   */
  static async fetchTransactionByIdFromDb(id: string): Promise<POSTransaction | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[POS Repository FetchById Error] ${error.message}`);
    }

    if (!data) return null;

    const items = (data.items || []).map((ti: any) => ({
      id: ti.id,
      transaction_id: ti.transaction_id,
      service_id: ti.service_id,
      qty: ti.qty,
      unit_price: Number(ti.unit_price),
      unit_hpp: Number(ti.unit_hpp || 0),
      discount: Number(ti.discount || 0),
      subtotal: Number(ti.subtotal),
      line_hpp: Number(ti.qty) * Number(ti.unit_hpp || 0),
    }));

    const totalHpp = items.reduce((sum: number, it: any) => sum + it.line_hpp, 0);

    return {
      id: data.id,
      business_id: data.business_id,
      branch_id: data.branch_id,
      customer_id: data.customer_id,
      kasir_employee_id: data.kasir_employee_id,
      total_amount: Number(data.total_amount),
      total_hpp: totalHpp,
      items,
      status: data.status,
      created_by: data.kasir_employee_id || 'system',
      approved_by: data.approved_by,
      refund_amount: Number(data.refund_amount || 0),
      refund_reason: data.refund_reason,
      refund_tier: data.refund_tier,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }
}
