import { PeopleRepository } from '../domains/people/peopleRepository';

async function runPersistenceTest() {
  console.log('=== TEST 1: MEMBUAT MASTER CABANG MANUALLY ===');
  const newBranch = await PeopleRepository.createBranch('tenant-001', {
    name: 'Cabang Test Bogor Center',
    code: 'BR-BOGOR',
    address: 'Jl. Pajajaran No. 88, Bogor',
  });
  console.log('✔ Cabang Baru Berhasil Dibuat:', newBranch);

  console.log('\n=== TEST 2: MEMBUAT DATA PEGAWAI MANUALLY (MENIHILKAN DROPDOWN KOSONG) ===');
  const newEmployee = await PeopleRepository.createEmployee({
    business_id: 'tenant-001',
    employee_code: 'EMP-BOGOR-01',
    full_name: 'Ahmad Faisal',
    nickname: 'Ical',
    phone: '081299887766',
    email: 'ahmad.faisal@pilin.co.id',
    branch_id: newBranch.id,
    division_id: 'div-001',
    position_id: 'pos-001',
    supervisor_id: '',
    employment_status: 'ACTIVE',
    base_salary: 5500000,
    incentive_rate: 20000,
  });
  console.log('✔ Pegawai Baru Berhasil Dibuat dengan Hubungan Cabang:', newEmployee);

  console.log('\n=== TEST 3: VERIFIKASI SEBELUM RELOAD (FETCH DATA) ===');
  const branchesBefore = await PeopleRepository.listBranches('tenant-001');
  const employeesBefore = await PeopleRepository.listEmployees('tenant-001');

  const foundBranch = branchesBefore.find(b => b.id === newBranch.id);
  const foundEmp = employeesBefore.find(e => e.id === newEmployee.id);

  console.log('Found Branch:', foundBranch?.name, '| Code:', foundBranch?.code);
  console.log('Found Employee:', foundEmp?.full_name, '| Branch Name:', foundEmp?.branch_name);

  if (!foundBranch || !foundEmp) {
    throw new Error('❌ TEST FAILED: Data cabang atau pegawai tidak ditemukan!');
  }

  console.log('\n=== TEST 4: EDIT DATA PEGAWAI & CABANG ===');
  const updatedBranch = await PeopleRepository.updateBranch(newBranch.id, 'tenant-001', {
    name: 'Cabang Test Bogor Utama (Edited)',
    address: 'Jl. Pajajaran No. 100, Bogor',
  });
  console.log('✔ Cabang Berhasil Di-edit:', updatedBranch);

  const updatedEmp = await PeopleRepository.updateEmployee(newEmployee.id, {
    full_name: 'Ahmad Faisal M.Kom (Edited)',
    base_salary: 6000000,
  });
  console.log('✔ Pegawai Berhasil Di-edit:', updatedEmp);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY 100%!');
}

runPersistenceTest().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
