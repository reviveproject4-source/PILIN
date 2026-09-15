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
  private static mockOrders: WorkOrderQueueItem[] = [
    {
      id: 'so-2026-001',
      order_number: 'SO-2026-001',
      customer_name: 'Budi Santoso',
      service_name: 'Cuci & Detailing Sepatu Premium',
      worker_name: 'Tim Produksi Staf',
      branch_id: 'branch-001',
      branch_name: 'Cabang Utama Jakarta',
      status: 'IN_PROGRESS',
      qc_status: 'FAILED',
      elapsed_minutes: 145, // Exceeds target_minutes (120) -> SPK Terlambat (SLA)
      target_minutes: 120,
      created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
      activity_log: [
        { id: 'log-01', stage_code: 'RECEIVED', worker_name: 'Siti Rahma', timestamp: '10:00 WIB' },
        { id: 'log-02', stage_code: 'DIAGNOSIS', worker_name: 'Tim Produksi Staf', timestamp: '10:15 WIB' },
        { id: 'log-03', stage_code: 'IN_PROGRESS', worker_name: 'Tim Produksi Staf', timestamp: '10:30 WIB' },
      ],
    },
    {
      id: 'so-2026-002',
      order_number: 'SO-2026-002',
      customer_name: 'Dewi Lestari',
      service_name: 'Reparasasi & Deep Cleaning Tas',
      worker_name: 'Budi (Teknisi)',
      branch_id: 'branch-001',
      branch_name: 'Cabang Utama Jakarta',
      status: 'QC',
      qc_status: 'FAILED',
      elapsed_minutes: 60,
      target_minutes: 180,
      created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
      activity_log: [
        { id: 'log-04', stage_code: 'RECEIVED', worker_name: 'Siti Rahma', timestamp: '11:00 WIB' },
        { id: 'log-05', stage_code: 'QC', worker_name: 'Budi (Teknisi)', timestamp: '12:00 WIB' },
      ],
    },
  ];

  private static getStoredOrders(branchId?: string): WorkOrderQueueItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('pilin_work_orders');
      if (stored) {
        const parsed: WorkOrderQueueItem[] = JSON.parse(stored);
        if (branchId && branchId !== 'ALL_BRANCHES') {
          return parsed.filter(o => !o.branch_id || o.branch_id === branchId);
        }
        return parsed;
      }
    } catch {}
    return [];
  }

  private static setStoredOrders(orders: WorkOrderQueueItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('pilin_work_orders', JSON.stringify(orders));
    } catch {}
  }

  static getOrders(branchId?: string, isDemo: boolean = false): WorkOrderQueueItem[] {
    if (isDemo || branchId === 'demo-branch') {
      if (!branchId || branchId === 'ALL_BRANCHES') {
        return [...this.mockOrders];
      }
      return this.mockOrders.filter(o => !o.branch_id || o.branch_id === branchId);
    }
    const userOrders = this.getStoredOrders(branchId);
    return userOrders;
  }

  static updateOrderStatus(
    id: string,
    targetStatus: ServiceOrderStatus,
    authenticatedPerformerName?: string
  ): { success: boolean; message: string } {
    const order = this.mockOrders.find(o => o.id === id);
    if (!order) return { success: false, message: 'Service Order tidak ditemukan.' };

    // Server-side status transition validation via WorkDomainService
    const validation = WorkDomainService.validateServiceOrderTransition(order.status, targetStatus);
    if (!validation.isValid) {
      return { success: false, message: validation.reason || `Transisi status dari ${order.status} ke ${targetStatus} tidak valid.` };
    }

    // Actual performer MUST be bound to authenticated user context (not arbitrary dropdown selection)
    const activePerformer = authenticatedPerformerName && authenticatedPerformerName.trim()
      ? authenticatedPerformerName.trim()
      : order.worker_name || 'Authenticated Performer';

    order.status = targetStatus;
    order.worker_name = activePerformer;

    if (!order.activity_log) {
      order.activity_log = [];
    }

    const nowFormatted = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    order.activity_log.push({
      id: `log-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      stage_code: targetStatus,
      worker_name: activePerformer,
      timestamp: `${new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} ${nowFormatted}`
    });

    return { success: true, message: `Status order ${order.order_number} berhasil diperbarui ke ${targetStatus} oleh ${activePerformer}.` };
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
    const existingStored = this.getStoredOrders();
    this.setStoredOrders([newOrder, ...existingStored]);
    return newOrder;
  }
}
