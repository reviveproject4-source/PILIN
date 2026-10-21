const fs = require('fs');
const path = require('path');

const targetTables = [
  'business_calendar',
  'business_calendar_rules',
  'business_calendar_exceptions',
  'service_orders',
  'service_order_items',
  'service_order_assets',
  'service_order_estimates',
  'jobs',
  'job_assignments',
  'job_qc'
];

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        getAllFiles(fullPath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx|sql|json|md)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = getAllFiles(path.join(__dirname, '../..'));

console.log('=== AUDIT PENGGUNAAN 10 TABEL SPESIFIK DI SELURUH CODEBASE ===\n');

for (const tableName of targetTables) {
  console.log(`\n--- TABEL: ${tableName} ---`);
  let found = 0;
  for (const file of allFiles) {
    // Skip migration files and this audit script itself
    const relPath = path.relative(path.join(__dirname, '../..'), file).replace(/\\/g, '/');
    if (relPath.startsWith('supabase/migrations/') || relPath.startsWith('src/tests/')) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const regex = new RegExp(`\\b${tableName}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const lineContent = content.split('\n')[line - 1].trim();
      console.log(`  [${relPath}:${line}] ${lineContent.substring(0, 100)}`);
      found++;
      if (found >= 10) {
        console.log(`  ... and more in ${relPath}`);
        break;
      }
    }
  }
  if (found === 0) {
    console.log(`  -> TIDAK ADA pemanggilan langsung di kode aplikasi (murni internal skema database).`);
  }
}
