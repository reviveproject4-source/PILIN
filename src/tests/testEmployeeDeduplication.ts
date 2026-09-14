import { PeopleRepository } from '../domains/people/peopleRepository';

async function runDeduplicationTest() {
  console.log('=== STEP 1: RESET STATE & COUNT INITIAL EMPLOYEES ===');
  PeopleRepository.clearMockData();
  const initialEmps = await PeopleRepository.listEmployees('tenant-001');
  const countStart = initialEmps.length;
  console.log(`Jumlah pegawai awal: ${countStart}`);

  console.log('\n=== STEP 2: TAMBAH 1 PEGAWAI DENGAN KODE EMP-BUG-001 ===');
  const dto = {
    business_id: 'tenant-001',
    employee_code: 'EMP-BUG-001',
    full_name: 'Budi Santoso Bugfix',
    nickname: 'Budi',
    phone: '081234567899',
    email: 'budi.bugfix@pilin.co.id',
    join_date: '2026-09-14',
    employment_status: 'ACTIVE' as const,
    branch_id: 'branch-001',
    division_id: 'div-001',
    position_id: 'pos-001',
  };

  // Simpan 1 kali
  const newEmp1 = await PeopleRepository.createEmployee(dto);
  console.log('✔ Result 1 (createEmployee):', newEmp1.id, newEmp1.full_name);

  // Simulasi jika terjadi pemicu kedua/double submit pada kode yang sama
  const newEmp2 = await PeopleRepository.createEmployee(dto);
  console.log('✔ Result 2 (createEmployee duplicate submit safeguard):', newEmp2.id, newEmp2.full_name);

  console.log('\n=== STEP 3: PASTIKAN HANYA 1 RECORD BARU BERHASIL TERKUMPUL ===');
  const empsAfterSave = await PeopleRepository.listEmployees('tenant-001');
  const newEmpsFound = empsAfterSave.filter(e => e.employee_code === 'EMP-BUG-001');
  console.log(`Jumlah record dengan kode EMP-BUG-001: ${newEmpsFound.length}`);

  if (newEmpsFound.length !== 1) {
    console.error(`❌ FAIL: Ditemukan ${newEmpsFound.length} record, harusnya tepat 1!`);
    process.exit(1);
  }
  console.log('✔ SUCCESS: Tepat 1 record pegawai baru!');

  console.log('\n=== STEP 4 & 5: SIMULASI RELOAD (READ AGAIN FROM STORAGE) ===');
  const empsReloaded = await PeopleRepository.listEmployees('tenant-001');
  const newEmpsReloaded = empsReloaded.filter(e => e.employee_code === 'EMP-BUG-001');
  console.log(`Setelah reload, jumlah record dengan kode EMP-BUG-001: ${newEmpsReloaded.length}`);

  if (newEmpsReloaded.length !== 1) {
    console.error(`❌ FAIL: Setelah reload ditemukan ${newEmpsReloaded.length} record!`);
    process.exit(1);
  }
  console.log('✔ SUCCESS: Setelah reload tetap tepat 1 record!');

  console.log('\n=== STEP 6 & 7: EDIT RECORD TERSEBUT & VERIFIKASI BAHWA JUMLAH TETAP 1 ===');
  const targetId = newEmpsReloaded[0].id;
  const updatedEmp = await PeopleRepository.updateEmployee(targetId, {
    full_name: 'Budi Santoso Bugfix (Edited)',
    phone: '081299990000',
  });
  console.log('✔ Employee updated:', updatedEmp?.full_name);

  const empsAfterEdit = await PeopleRepository.listEmployees('tenant-001');
  const newEmpsAfterEdit = empsAfterEdit.filter(e => e.employee_code === 'EMP-BUG-001');
  console.log(`Setelah edit, jumlah record dengan kode EMP-BUG-001: ${newEmpsAfterEdit.length}`);

  if (newEmpsAfterEdit.length !== 1) {
    console.error(`❌ FAIL: Setelah edit ditemukan ${newEmpsAfterEdit.length} record!`);
    process.exit(1);
  }
  console.log('✔ SUCCESS: Setelah edit tetap 1 record, tidak terduplikasi!');

  console.log('\n🎉 ALL 7 BUGFIX VERIFICATION STEPS PASSED 100%!');
}

runDeduplicationTest().catch(err => {
  console.error('Test errored:', err);
  process.exit(1);
});
