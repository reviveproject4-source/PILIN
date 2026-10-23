import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PendingRegistrationStore } from '@/domains/tenant/pendingRegistrationStore';
import { PILIN_STANDARD_FEATURES } from '@/app/super-admin/constants';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospectId } = body;

    if (!prospectId) {
      return NextResponse.json({ success: false, message: 'Prospect ID wajib diisi.' }, { status: 400 });
    }

    // 1. Update in local store
    const storeRecord = PendingRegistrationStore.acc(prospectId);

    let prospect: any = storeRecord ? {
      id: storeRecord.id,
      name: storeRecord.name,
      owner_name: storeRecord.ownerName,
      whatsapp: storeRecord.whatsapp,
      email: storeRecord.email,
    } : null;

    const now = new Date();

    // 2. Update Supabase
    try {
      const supabaseAdmin = createAdminClient();

      // Check pilin_prospects
      const { data: dbProspect } = await supabaseAdmin
        .from('pilin_prospects')
        .select('*')
        .eq('id', prospectId)
        .maybeSingle();

      if (dbProspect) {
        prospect = { ...prospect, ...dbProspect };
      }

      // Check platform_customers
      const { data: dbCustomer } = await supabaseAdmin
        .from('platform_customers')
        .select('*')
        .or(`id.eq.${prospectId},phone.eq.${prospect?.whatsapp}`)
        .maybeSingle();

      if (dbCustomer) {
        prospect = {
          ...prospect,
          name: dbCustomer.name || prospect?.name,
          owner_name: dbCustomer.contact_name || prospect?.owner_name,
          whatsapp: dbCustomer.phone || prospect?.whatsapp,
          email: dbCustomer.email || prospect?.email,
        };
      }

      const businessName = prospect?.name || 'Usaha Tenant';
      const cleanCode = businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) + '01';

      // A. Create or Find Tenant in `tenants` table
      let tenantRecord: any = null;
      const { data: existingTenant } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .ilike('name', businessName)
        .maybeSingle();

      if (existingTenant) {
        tenantRecord = existingTenant;
      } else {
        const { data: createdTenant, error: insertTenantErr } = await supabaseAdmin
          .from('tenants')
          .insert({
            name: businessName,
            code: cleanCode,
          })
          .select()
          .single();

        if (insertTenantErr) {
          console.warn('insertTenantErr:', insertTenantErr);
        }
        tenantRecord = createdTenant;
      }

      const actualTenantId = tenantRecord?.id || `tenant-${prospectId.slice(0, 8)}`;

      // B. Create or update platform_customers
      let customerId = dbCustomer?.id;
      if (dbCustomer) {
        await supabaseAdmin
          .from('platform_customers')
          .update({
            tenant_id: tenantRecord?.id || null,
            status: 'ACTIVE',
            updated_at: now.toISOString(),
          })
          .eq('id', dbCustomer.id);
      } else if (prospect) {
        const { data: newCust } = await supabaseAdmin
          .from('platform_customers')
          .insert({
            name: businessName,
            contact_name: prospect.owner_name || prospect.name || 'Owner',
            email: prospect.email || 'tenant@pilin.id',
            phone: prospect.whatsapp || '',
            owner_email: prospect.email || 'tenant@pilin.id',
            tenant_id: tenantRecord?.id || null,
            status: 'ACTIVE',
          })
          .select('id')
          .single();
        customerId = newCust?.id;
      }

      // C. Ensure default subscription product in tenant_products
      if (tenantRecord) {
        await supabaseAdmin
          .from('tenant_products')
          .upsert({
            tenant_id: tenantRecord.id,
            product_id: 'e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1',
            status: 'ACTIVE',
          }, { onConflict: 'tenant_id,product_id' });
      }

      // D. Ensure 13 standard feature flags are enabled in tenant_feature_flags
      const flagRows = PILIN_STANDARD_FEATURES.map((feat) => ({
        tenant_id: actualTenantId,
        feature_code: feat.feature_code,
        enabled: true,
        updated_at: now.toISOString(),
      }));

      await supabaseAdmin
        .from('tenant_feature_flags')
        .upsert(flagRows, { onConflict: 'tenant_id,feature_code' });

      // E. Update pilin_prospects status to CLOSED_WON
      await supabaseAdmin
        .from('pilin_prospects')
        .update({ status: 'CLOSED_WON' })
        .eq('id', prospectId);

    } catch (dbErr) {
      console.warn('Database update notice during ACC API:', dbErr);
    }

    if (!prospect) {
      prospect = {
        name: 'Usaha Anda',
        owner_name: 'Owner',
        whatsapp: '',
        email: '-',
      };
    }

    // Format WhatsApp notification
    const ownerName = prospect.owner_name || prospect.contact_name || 'Owner';
    const businessName = prospect.name || 'Usaha Anda';
    const email = prospect.email || '-';
    const rawPhone = prospect.whatsapp || prospect.phone || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');

    const messageText = `Halo ${ownerName},\n\nPendaftaran usaha "${businessName}" di PILIN ERP telah DISETUJUI oleh Super Admin!\nAkun tenant Anda kini sudah AKTIF dan seluruh modul sistem siap digunakan.\n\n🔗 Akses Portal: https://pilin.id\n👤 Role Masuk: OWNER\n📧 Email / ID: ${email}\n\nSelamat mengelola operasional cabang Anda dengan PILIN ERP!`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    return NextResponse.json({
      success: true,
      message: `Pendaftaran ${businessName} berhasil di-ACC & diaktifkan!`,
      notification: {
        ownerName,
        businessName,
        phone: rawPhone,
        email,
        messageText,
        waUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Gagal meng-ACC tenant.',
    }, { status: 500 });
  }
}
