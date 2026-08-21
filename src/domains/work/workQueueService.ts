import { ServiceOrderStatus, QCStatus } from '@/lib/types';
import { WorkDomainService } from './workDomainService';

export interface WorkOrderActivityLog {
  id: string;
  stage_code: string;
  worker_name: string;
  timestamp: string;
}

export interface WorkOrderQueueItem {
  id: string;
  order_number: string;
  customer_name: string;
  service_name: string;
  worker_name: string;
  branch_id?: string;
  branch_name?: string;
  status: ServiceOrderStatus;
  qc_status: QCStatus;
  elapsed_minutes: number;
  target_minutes: number;
  created_at: string;
  activity_log: WorkOrderActivityLog[];
}

export class WorkQueueService {
  private static mockOrders: WorkOrderQueueItem[] = [];

  static getOrders(branchId?: string): WorkOrderQueueItem[] {
    if (!branchId || branchId === 'ALL_BRANCHES') {
      return [...this.mockOrders];
    }
    return this.mockOrders.filter(o => !o.branch_id || o.branch_id === branchId);
  }

  static updateOrderStatus(id: string, targetStatus: ServiceOrderStatus, workerName?: string): { success: boolean; message: string } {
    const order = this.mockOrders.find(o => o.id === id);
    if (!order) return { success: false, message: 'Service Order tidak ditemukan.' };

    const activeWorker = workerName && workerName.trim() ? workerName.trim() : order.worker_name || 'Staf Operator';
    order.status = targetStatus;
    order.worker_name = activeWorker;

    if (!order.activity_log) {
      order.activity_log = [];
    }

    const nowFormatted = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    order.activity_log.push({
      id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      stage_code: targetStatus,
      worker_name: activeWorker,
      timestamp: `${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} ${nowFormatted}`
    });

    return { success: true, message: `Status order ${order.order_number} berhasil diperbarui ke ${targetStatus} oleh ${activeWorker}.` };
  }

  static updateOrderQC(id: string, qc: QCStatus): { success: boolean; message: string } {
    const order = this.mockOrders.find(o => o.id === id);
    if (!order) return { success: false, message: 'Service Order tidak ditemukan.' };

    order.qc_status = qc;
    return { success: true, message: `Hasil inspeksi QC untuk ${order.order_number} diperbarui ke ${qc}.` };
  }

  static createWorkOrder(data: { customer_name: string; service_name: string; worker_name?: string; branch_id?: string; branch_name?: string }): WorkOrderQueueItem {
    const nextSeq = this.mockOrders.length + 1;
    const activeWorker = data.worker_name ? data.worker_name.trim() : 'Staf Kasir';
    const nowFormatted = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newOrder: WorkOrderQueueItem = {
      id: `so-${Date.now()}`,
      order_number: `SO-2026-00${nextSeq}`,
      customer_name: data.customer_name,
      service_name: data.service_name,
      worker_name: activeWorker,
      branch_id: data.branch_id || 'BRANCH_001',
      branch_name: data.branch_name || 'Cabang Utama',
      status: 'RECEIVED',
      qc_status: 'FAILED',
      elapsed_minutes: 0,
      target_minutes: 120,
      created_at: new Date().toISOString(),
      activity_log: [
        {
          id: `log-${Date.now()}`,
          stage_code: 'RECEIVED',
          worker_name: activeWorker,
          timestamp: `${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} ${nowFormatted}`
        }
      ]
    };

    this.mockOrders.unshift(newOrder);
    return newOrder;
  }
}
