const fs = require('fs');
const path = require('path');

const revokedTables = [
  'tenant_feature_flags', 'business_calendar', 'business_calendar_rules', 'business_calendar_exceptions',
  'import_jobs', 'import_profiles', 'import_rows', 'jobs', 'job_assignments', 'job_dependencies',
  'job_material_usage', 'job_qc', 'job_sla', 'job_status_history', 'deliveries', 'service_orders',
  'service_order_items', 'service_order_assets', 'service_order_estimates', 'branch_performance_metrics',
  'promo_events', 'promo_proposals', 'promo_rules', 'reminder_rules', 'sapaan_logs', 'sapaan_schedules',
  'sapaan_templates', 'permissions', 'role_permissions', 'transaction_delete_requests', 'decision_history',
  'action_assignments', 'action_evidences', 'action_execution_logs', 'action_plan_revisions',
  'action_result_evaluations', 'management_signals'
];

console.log('======================================================================');
console.log('AUDIT FOCUS 1: SCAN .from(...) FOR REVOKED TABLES');
console.log('======================================================================');

const findings = [];
function scanDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'tests') return;
    if (fs.statSync(full).isDirectory()) {
      scanDir(full);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(full, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        revokedTables.forEach(t => {
          if (line.includes(`.from('${t}')`) || line.includes(`.from("${t}")`)) {
            findings.push({ table: t, file: path.relative(path.join(__dirname, '../..'), full), line: idx + 1, code: line.trim() });
          }
        });
      });
    }
  });
}

scanDir(path.join(__dirname, '..'));

console.log(`Found ${findings.length} occurrences of .from(revoked_table) in src/:`);
console.log(JSON.stringify(findings, null, 2));

// Also search for general occurrences of revoked table names in domain code
console.log('\n======================================================================');
console.log('AUDIT FOCUS 2: USAGE OF CALENDAR & WORK ORDER / JOBS IN CODE');
console.log('======================================================================');

const targetTables = [
  'business_calendar', 'business_calendar_rules', 'business_calendar_exceptions',
  'service_orders', 'service_order_items', 'service_order_assets', 'service_order_estimates',
  'jobs', 'job_assignments', 'job_qc'
];

const domainUsages = [];
function scanDomainUsage(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'tests') return;
    if (fs.statSync(full).isDirectory()) {
      scanDomainUsage(full);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(full, 'utf-8');
      targetTables.forEach(t => {
        if (content.includes(`'${t}'`) || content.includes(`"${t}"`) || content.includes(t)) {
          // let's record file and purpose
          domainUsages.push({ table: t, file: path.relative(path.join(__dirname, '../..'), full) });
        }
      });
    }
  });
}
scanDomainUsage(path.join(__dirname, '..'));
const uniqueDomainFiles = {};
domainUsages.forEach(u => {
  if (!uniqueDomainFiles[u.table]) uniqueDomainFiles[u.table] = new Set();
  uniqueDomainFiles[u.table].add(u.file);
});
for (const [tbl, files] of Object.entries(uniqueDomainFiles)) {
  console.log(`Table ${tbl}: referenced in ${files.size} files:`, [...files]);
}
