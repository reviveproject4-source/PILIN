-- Migration: 00004_roles_and_permissions.sql
-- Description: Fixed System Roles, Granular Permissions, and Mapping

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add Foreign Key to tenant_memberships now that roles exists
ALTER TABLE tenant_memberships 
ADD CONSTRAINT fk_tenant_memberships_role 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- 2. PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    domain VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- SEED SYSTEM ROLES
INSERT INTO roles (id, code, name, description, is_system) VALUES
('11111111-1111-1111-1111-111111111111', 'owner', 'Owner / Pemilik Usaha', 'Pemilik usaha dengan akses penuh lintas seluruh cabang', true),
('22222222-2222-2222-2222-222222222222', 'kepala_cabang', 'Kepala Cabang', 'Penanggung jawab operasional & persetujuan cabang tertentu', true),
('33333333-3333-3333-3333-333333333333', 'pegawai', 'Pegawai / Kasir', 'Staf operasional kasir cabang', true)
ON CONFLICT (code) DO NOTHING;

-- SEED GRANULAR PERMISSIONS
INSERT INTO permissions (code, domain, description) VALUES
('org:branch:manage', 'organization', 'Kelola cabang (Tambah/Edit)'),
('org:employee:manage', 'organization', 'Kelola pegawai & penugasan cabang'),
('customer:read', 'customer', 'Lihat data pelanggan tenant'),
('customer:create', 'customer', 'Buat pelanggan manual / POS'),
('customer:update', 'customer', 'Edit informasi pelanggan'),
('customer:import', 'customer', 'Jalankan migrasi/impor pelanggan'),
('customer:export', 'customer', 'Ekspor data pelanggan tenant'),
('service:catalog:manage', 'commerce', 'Kelola Katalog Layanan Utama Tenant'),
('service:branch:override', 'commerce', 'Atur ketersediaan/harga cabang'),
('transaction:create', 'commerce', 'Input transaksi kasir baru'),
('transaction:read', 'commerce', 'Lihat riwayat transaksi cabang'),
('transaction:void_request', 'control', 'Ajukan pembatalan (void) transaksi'),
('transaction:void_approve', 'control', 'Menyetujui/menolak void transaksi'),
('retention:rule:manage', 'retention', 'Kelola aturan reminder retensi'),
('retention:reminder:read', 'retention', 'Lihat jadwal & status reminder'),
('retention:reminder:send', 'retention', 'Eksekusi pengiriman reminder'),
('finance:expense:create', 'finance', 'Catat pengeluaran kas operasional'),
('finance:report:view', 'finance', 'Lihat laporan keuangan P&L'),
('control:audit:view', 'control', 'Lihat audit log aktivitas bisnis')
ON CONFLICT (code) DO NOTHING;

-- SEED ROLE_PERMISSIONS
-- OWNER PERMISSIONS (All Permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions
ON CONFLICT DO NOTHING;

-- KEPALA CABANG PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM permissions 
WHERE code IN (
  'customer:read', 'customer:create', 'customer:update',
  'service:branch:override',
  'transaction:create', 'transaction:read', 'transaction:void_request', 'transaction:void_approve',
  'retention:reminder:read', 'retention:reminder:send',
  'finance:expense:create'
)
ON CONFLICT DO NOTHING;

-- PEGAWAI PERMISSIONS
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM permissions 
WHERE code IN (
  'customer:read', 'customer:create',
  'transaction:create', 'transaction:read', 'transaction:void_request',
  'retention:reminder:read',
  'finance:expense:create'
)
ON CONFLICT DO NOTHING;
