import { PeopleDomainService } from '../domains/people/peopleDomainService';
import { PeopleRepository } from '../domains/people/peopleRepository';
import { ServiceCatalogService } from '../domains/catalog/serviceCatalogService';

async function runActualMasterDataVerification() {
  console.log('============================================================');
  console.log('STARTING ACTUAL MASTER DATA E2E VERIFICATION TEST');
  console.log('============================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failedTests++;
    }
  }

  try {
    const testBusinessId = 'biz-master-verify-01';
    const actorUserId = 'owner-actor-01';

    // Seed mock structure for division, position, branch
    const div = await PeopleRepository.createDivision({
      business_id: testBusinessId,
      code: 'OPS-MKT',
      name: 'Operasional & Produksi',
    });

    const pos = await PeopleRepository.createPosition({
      business_id: testBusinessId,
      division_id: div.id,
      code: 'TECH-LEAD',
      name: 'Teknisi Utama',
    });

    // 1. Input Data Pegawai Baru Lengkap
    const newEmployeeCode = `EMP-TEST-${Date.now().toString().slice(-4)}`;
    const newEmployeeData = {
      business_id: testBusinessId,
      employee_code: newEmployeeCode,
      full_name: 'Budi Santoso Teknisi',
      nickname: 'Budi',
      phone: '081299887766',
      email: 'budi.santoso@pilin.id',
      address: 'Jl. Merdeka No. 45, Jakarta Pusat',
      join_date: '2026-01-15',
      employment_status: 'ACTIVE' as const,
      division_id: div.id,
      position_id: pos.id,
      base_salary: 4500000,
      incentive_rate: 35000,
    };

    console.log('--- 1. Creating New Employee with Salary & Incentive ---');
    const createdEmp = await PeopleDomainService.createEmployee(actorUserId, newEmployeeData);
    assert(!!createdEmp.id, '1.1 Employee ID generated upon save');
    assert(createdEmp.full_name === 'Budi Santoso Teknisi', '1.2 Full name persisted correctly');
    assert(createdEmp.base_salary === 4500000, '1.3 Base salary (Gaji Pokok Rp 4,500,000) persisted correctly');
    assert(createdEmp.incentive_rate === 35000, '1.4 Incentive rate (Rp 35,000 / SPK) persisted correctly');

    // 2. Fetch and Verify Persistence (Simulate page refresh / reload)
    console.log('\n--- 2. Verifying Employee Persistence After Reload ---');
    const reloadedEmp = await PeopleRepository.getEmployeeById(createdEmp.id);
    assert(!!reloadedEmp, '2.1 Employee found in repository upon fetch');
    assert(reloadedEmp?.base_salary === 4500000, '2.2 Reloaded base salary matches saved value');
    assert(reloadedEmp?.incentive_rate === 35000, '2.3 Reloaded incentive rate matches saved value');
    assert(reloadedEmp?.phone === '081299887766', '2.4 Phone number matches saved value');

    // 3. Edit Employee & Save Again
    console.log('\n--- 3. Editing Employee (Updating Salary, Incentive & Phone) ---');
    const updatedEmp = await PeopleDomainService.updateEmployee(actorUserId, createdEmp.id, {
      full_name: 'Budi Santoso Senior',
      phone: '081299887777',
      base_salary: 5000000,
      incentive_rate: 40000,
    });

    assert(updatedEmp.full_name === 'Budi Santoso Senior', '3.1 Updated full name persisted');
    assert(updatedEmp.base_salary === 5000000, '3.2 Updated base salary (Rp 5,000,000) persisted');
    assert(updatedEmp.incentive_rate === 40000, '3.3 Updated incentive rate (Rp 40,000 / SPK) persisted');
    assert(updatedEmp.phone === '081299887777', '3.4 Updated phone number persisted');

    // Reload again to guarantee update persistence after refresh
    const reloadedUpdatedEmp = await PeopleRepository.getEmployeeById(createdEmp.id);
    assert(reloadedUpdatedEmp?.base_salary === 5000000, '3.5 Reloaded employee reflects updated base salary');
    assert(reloadedUpdatedEmp?.incentive_rate === 40000, '3.6 Reloaded employee reflects updated incentive rate');

    // ---------------------------------------------------------
    // TEST SUITE 2: LAYANAN & BOM (CREATE -> VERIFY -> UPDATE -> VERIFY)
    // ---------------------------------------------------------
    console.log('\n--- 4. Creating New Layanan & BOM Catalog Item ---');
    const initialCatalogCount = ServiceCatalogService.getMasterCatalog().length;

    const newCatalogItem = ServiceCatalogService.addMasterService({
      nama: 'Cuci & Detailing Premium Engine Bay',
      base_harga: 250000,
      item_type: 'SERVICE',
      hpp_mode: 'ACTUAL_COST',
      hpp: 75000,
      bahan_baku: 'Degreaser HD 500ml, Microfiber Cloth, Engine Dresser 200ml',
    });

    assert(!!newCatalogItem.id, '4.1 Service catalog item ID generated');
    assert(newCatalogItem.nama === 'Cuci & Detailing Premium Engine Bay', '4.2 Catalog item name persisted');
    assert(newCatalogItem.base_harga === 250000, '4.3 Base selling price persisted');
    assert(newCatalogItem.hpp === 75000, '4.4 Actual HPP cost persisted');
    assert(newCatalogItem.bahan_baku === 'Degreaser HD 500ml, Microfiber Cloth, Engine Dresser 200ml', '4.5 BOM material description persisted');

    // Verify catalog count increased
    const afterAddCount = ServiceCatalogService.getMasterCatalog().length;
    assert(afterAddCount === initialCatalogCount + 1, '4.6 Catalog list updated with new item');

    console.log('\n--- 5. Editing Layanan & BOM Catalog Item ---');
    const updatedCatalogItem = ServiceCatalogService.updateMasterService(newCatalogItem.id, {
      nama: 'Cuci & Detailing Premium Engine Bay + Coating',
      base_harga: 350000,
      item_type: 'SERVICE',
      hpp_mode: 'PERCENTAGE',
      hpp_percent: 30,
      hpp: 105000,
      bahan_baku: 'Degreaser HD 500ml, Microfiber Cloth, Engine Dresser 200ml, Ceramic Coating Spray 50ml',
    });

    assert(!!updatedCatalogItem, '5.1 Updated item returned non-null');
    assert(updatedCatalogItem?.nama === 'Cuci & Detailing Premium Engine Bay + Coating', '5.2 Updated catalog item name persisted');
    assert(updatedCatalogItem?.base_harga === 350000, '5.3 Updated selling price persisted');
    assert(updatedCatalogItem?.hpp_mode === 'PERCENTAGE', '5.4 Updated HPP mode persisted');
    assert(updatedCatalogItem?.hpp === 105000, '5.5 Computed HPP persisted');
    assert(Boolean(updatedCatalogItem?.bahan_baku?.includes('Ceramic Coating Spray')), '5.6 Updated BOM material description persisted');

    // Reload catalog list to verify persistence
    const reloadedCatalog = ServiceCatalogService.getMasterCatalog();
    const foundItem = reloadedCatalog.find(i => i.id === newCatalogItem.id);
    assert(foundItem?.nama === 'Cuci & Detailing Premium Engine Bay + Coating', '5.7 Reloaded catalog list reflects updated item name');
    assert(Boolean(foundItem?.bahan_baku?.includes('Ceramic Coating Spray')), '5.8 Reloaded catalog list reflects updated BOM description');

    // Clean up test item
    ServiceCatalogService.deleteMasterService(newCatalogItem.id);
    assert(ServiceCatalogService.getMasterCatalog().length === initialCatalogCount, '5.9 Cleanup deleted test catalog item cleanly');

  } catch (err: any) {
    console.error(`[EXCEPTION] Test execution error: ${err.message}`);
    failedTests++;
  }

  console.log('\n============================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests} PASSED | ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runActualMasterDataVerification();
