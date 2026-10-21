const fs = require('fs');
const path = require('path');

// 1. Collect all files in src/
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const srcFiles = getAllFiles(path.join(__dirname, '../'));

// 2. Regex to find .from('table_name') or .from("table_name")
const fromRegex = /\.from\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g;
const rpcRegex = /\.rpc\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]/g;

const tablesReferenced = new Map();
const rpcsReferenced = new Map();

for (const file of srcFiles) {
  // skip test files
  if (file.includes('tests') || file.includes('test')) continue;
  
  const content = fs.readFileSync(file, 'utf-8');
  const relPath = path.relative(path.join(__dirname, '../..'), file).replace(/\\/g, '/');

  let match;
  // Match .from('...') but exclude storage.from('...')
  const dbFromRegex = /(?<!storage)\.from\s*\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)/g;
  while ((match = dbFromRegex.exec(content)) !== null) {
    const tableName = match[1];
    if (!tablesReferenced.has(tableName)) {
      tablesReferenced.set(tableName, []);
    }
    // line number
    const line = content.substring(0, match.index).split('\n').length;
    tablesReferenced.get(tableName).push(`${relPath}:${line}`);
  }

  while ((match = rpcRegex.exec(content)) !== null) {
    const rpcName = match[1];
    if (!rpcsReferenced.has(rpcName)) {
      rpcsReferenced.set(rpcName, []);
    }
    const line = content.substring(0, match.index).split('\n').length;
    rpcsReferenced.get(rpcName).push(`${relPath}:${line}`);
  }
}

console.log('=== HASIL AUDIT PEMANGGILAN TABEL DI KODE (src/) ===');
console.log(`Total tabel unik yang dipanggil via .from(): ${tablesReferenced.size}`);
for (const [table, locations] of Array.from(tablesReferenced.entries()).sort()) {
  console.log(`- ${table} (${locations.length} calls) -> contoh: ${locations[0]}`);
}

console.log('\n=== HASIL AUDIT PEMANGGILAN RPC DI KODE (src/) ===');
console.log(`Total RPC unik yang dipanggil via .rpc(): ${rpcsReferenced.size}`);
for (const [rpc, locations] of Array.from(rpcsReferenced.entries()).sort()) {
  console.log(`- ${rpc} (${locations.length} calls) -> contoh: ${locations[0]}`);
}

// Check against the 37 revoked tables
const revokedTables = [
  'tenant_feature_flags',
  'business_calendar',
  'business_calendar_rules',
  'business_calendar_exceptions',
  'import_jobs',
  'import_profiles',
  'import_rows',
  'jobs',
  'job_assignments',
  'job_dependencies',
  'job_material_usage',
  'job_qc',
  'job_sla',
  'job_status_history',
  'deliveries',
  'service_orders',
  'service_order_items',
  'service_order_assets',
  'service_order_estimates',
  'branch_performance_metrics',
  'promo_events',
  'promo_proposals',
  'promo_rules',
  'reminder_rules',
  'sapaan_logs',
  'sapaan_schedules',
  'sapaan_templates',
  'permissions',
  'role_permissions',
  'transaction_delete_requests',
  'decision_history',
  'action_assignments',
  'action_evidences',
  'action_execution_logs',
  'action_plan_revisions',
  'action_result_evaluations',
  'management_signals'
];

console.log('\n=== PEMERIKSAAN TABEL REVOKED YANG DIPANGGIL DI KODE (POTENSI REGRESI) ===');
let conflictCount = 0;
for (const revTable of revokedTables) {
  if (tablesReferenced.has(revTable)) {
    console.error(`[ALERT / KONFLIK] Tabel "${revTable}" di-REVOKE tetapi masih dipanggil di kode!`);
    console.error(`  Lokasi:`, tablesReferenced.get(revTable));
    conflictCount++;
  }
}
if (conflictCount === 0) {
  console.log('[AMAN] Tidak ada satupun dari 37 tabel yang di-REVOKE dipanggil oleh kode frontend!');
} else {
  console.log(`[PERINGATAN] Ditemukan ${conflictCount} tabel konflik yang akan putus jika di-REVOKE!`);
}

// Check if any referenced table is missing from granted tables
const grantedTables = [
  'tenants', 'branches', 'tenant_memberships', 'membership_branch_scopes', 'roles',
  'customers', 'services', 'branch_services', 'transactions', 'transaction_items',
  'audit_logs', 'employees', 'divisions', 'positions', 'attendance_records',
  'attendance_requests', 'overtime_requests', 'expenses', 'reminders', 'action_plans',
  'action_results', 'decisions', 'outbox_events', 'platform_customers',
  'platform_sales_applications', 'platform_demos', 'platform_invoices',
  'platform_invoice_items', 'platform_payments', 'platform_product_prices',
  'platform_products', 'platform_subscriptions', 'platform_provisioning',
  'platform_role_assignments', 'tenant_products', 'pilin_prospects', 'pilin_prospect_activities'
];

console.log('\n=== PEMERIKSAAN TABEL KODE YANG TIDAK TERDAFTAR DI GRANT (POTENSI AKSES TERPUTUS) ===');
let missingGrantCount = 0;
for (const [table, locations] of tablesReferenced.entries()) {
  if (!grantedTables.includes(table)) {
    console.error(`[ALERT / MISSING GRANT] Tabel "${table}" dipanggil di kode tetapi TIDAK ADA di daftar GRANT!`);
    console.error(`  Lokasi:`, locations);
    missingGrantCount++;
  }
}
if (missingGrantCount === 0) {
  console.log('[AMAN] Seluruh tabel yang dipanggil di kode tercakup 100% di dalam klausa GRANT!');
} else {
  console.log(`[PERINGATAN] Ditemukan ${missingGrantCount} tabel yang dipanggil di kode tapi belum di-GRANT!`);
}
