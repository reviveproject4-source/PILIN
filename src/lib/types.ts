export type SystemRoleCode = 'owner' | 'kepala_cabang' | 'pegawai';

export type TransactionStatus = 'DRAFT' | 'PENDING_PAYMENT' | 'COMPLETED' | 'VOID_REQUESTED' | 'VOIDED' | 'REFUNDED';

export type PaymentMethod = 'cash' | 'transfer';

export type ImportUpdatePolicy = 'SKIP' | 'UPDATE_EMPTY_ONLY' | 'OVERWRITE_EXPLICIT' | 'MERGE';

export type ImportJobStatus = 'STAGED' | 'MAPPED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type CommunicationPreference = 'TRANSACTIONAL_ONLY' | 'RELATIONSHIP_ONLY' | 'ALL';

export type CommunicationClass = 'TRANSACTIONAL' | 'RELATIONSHIP' | 'COMMERCIAL';

export type CustomerLifecycleState = 'NEW' | 'ACTIVE' | 'REPEAT' | 'LOYAL' | 'AT_RISK' | 'DORMANT' | 'REACTIVATED';

export type CustomerSignalCode = 
  | 'FIRST_PURCHASE' 
  | 'REPEAT_PURCHASE' 
  | 'SERVICE_DUE' 
  | 'NO_REPEAT' 
  | 'HIGH_VALUE' 
  | 'AT_RISK'
  | 'DORMANT'
  | 'DORMANCY_THRESHOLD_REACHED' 
  | 'REACTIVATED';

// PHASE 5 TYPES
export type ServiceOrderStatus = 
  | 'RECEIVED' 
  | 'DIAGNOSIS' 
  | 'ESTIMATE' 
  | 'WAITING_APPROVAL' 
  | 'APPROVED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'QC' 
  | 'READY_FOR_PICKUP' 
  | 'DELIVERED' 
  | 'CLOSED' 
  | 'REJECTED' 
  | 'CANCELLED';

export type JobStatus = 
  | 'QUEUED' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'READY_FOR_QC' 
  | 'QC' 
  | 'COMPLETED' 
  | 'REWORK';

export type SLAStatus = 
  | 'ON_TRACK' 
  | 'AT_RISK' 
  | 'BREACHED' 
  | 'COMPLETED_ON_TIME' 
  | 'COMPLETED_LATE';

export type QCStatus = 'PASSED' | 'FAILED';

export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  user_id: string;
  business_id: string;
  role_id: string;
  is_tenant_wide: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MembershipBranchScope {
  id: string;
  membership_id: string;
  branch_id: string;
  granted_by?: string | null;
  granted_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  nama: string;
  no_hp?: string | null;
  no_hp_normalized?: string | null;
  email?: string | null;
  alamat?: string | null;
  source_system: string;
  source_customer_id?: string | null;
  tags?: string[];
  communication_preference: CommunicationPreference;
  last_communication_at?: string | null;
  created_at_branch_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  status?: 'ACTIVE' | 'MERGED' | 'ARCHIVED' | 'PERMANENT_DELETED';
  merged_into_id?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
  is_opted_out?: boolean;
}

export interface Service {
  id: string;
  business_id: string;
  nama: string;
  sku?: string | null;
  base_harga: number;
  hpp: number;
  created_at: string;
  updated_at: string;
}

export interface BranchService {
  id: string;
  business_id: string;
  branch_id: string;
  service_id: string;
  is_active: boolean;
  price_override?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id?: string | null;
  service_order_id?: string | null;
  kasir_employee_id?: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  service_id: string;
  qty: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

export interface ServiceOrder {
  id: string;
  business_id: string;
  branch_id: string;
  customer_id: string;
  order_number: string;
  status: ServiceOrderStatus;
  priority: PriorityLevel;
  notes?: string | null;
  received_at: string;
  target_completion_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderItem {
  id: string;
  service_order_id: string;
  service_id?: string | null;
  service_name_snapshot: string;
  quantity: number;
  estimated_price: number;
  approved_price: number;
}

export interface ServiceOrderAsset {
  id: string;
  service_order_id: string;
  asset_type: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  serial_number?: string | null;
  condition_notes?: string | null;
  received_at: string;
  returned_at?: string | null;
}

export interface ServiceOrderEstimate {
  id: string;
  service_order_id: string;
  version: number;
  status: 'DRAFT' | 'PRESENTED' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'CANCELLED';
  total_estimated_price: number;
  total_approved_price: number;
  notes?: string | null;
  created_at: string;
  approved_at?: string | null;
}

export interface Job {
  id: string;
  business_id: string;
  branch_id: string;
  service_order_id: string;
  title: string;
  status: JobStatus;
  priority: PriorityLevel;
  estimated_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  assigned_to_user_id: string;
  status: 'ASSIGNED' | 'REASSIGNED' | 'RELEASED';
  assigned_at: string;
  released_at?: string | null;
  assigned_by?: string | null;
}

export interface JobStatusHistory {
  id: string;
  job_id: string;
  old_status?: JobStatus | null;
  new_status: JobStatus;
  changed_by?: string | null;
  changed_at: string;
  notes?: string | null;
}

export interface JobMaterialUsage {
  id: string;
  job_id: string;
  material_name_snapshot: string;
  quantity: number;
  unit: string;
  unit_cost_snapshot: number;
  recorded_by?: string | null;
  recorded_at: string;
}

export interface JobSLA {
  id: string;
  job_id: string;
  sla_status: SLAStatus;
  elapsed_business_minutes: number;
  target_business_minutes: number;
  hold_reason?: string | null;
  pauses_sla: boolean;
  updated_at: string;
}

export interface JobQC {
  id: string;
  job_id: string;
  inspector_user_id: string;
  status: QCStatus;
  pass_notes?: string | null;
  fail_notes?: string | null;
  inspected_at: string;
}

export interface Delivery {
  id: string;
  business_id: string;
  branch_id: string;
  service_order_id: string;
  delivery_type: 'CUSTOMER_PICKUP' | 'DELIVERY';
  recipient_name: string;
  recipient_phone?: string | null;
  status: 'READY' | 'DELIVERED' | 'CANCELLED';
  delivered_at?: string | null;
  handled_by?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  business_id: string;
  branch_id?: string | null;
  actor_user_id?: string | null;
  operation: string;
  entity: string;
  entity_id?: string | null;
  payload_sanitized: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
}

export interface ImportJob {
  id: string;
  business_id: string;
  executed_at_branch_id?: string | null;
  uploaded_by_user_id: string;
  source_system: string;
  original_filename: string;
  storage_path: string;
  status: ImportJobStatus;
  update_policy: ImportUpdatePolicy;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  imported_rows: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface RFMMetrics {
  recencyDays: number;
  frequencyCount: number;
  monetaryTotal: number;
}

export interface CustomerBehaviorProfile {
  customerId: string;
  lifecycleState: CustomerLifecycleState;
  rfm: RFMMetrics;
  detectedSignals: CustomerSignalCode[];
}

export type { EmploymentStatus, Division, Position, Employee } from '@/domains/people/people.types';
