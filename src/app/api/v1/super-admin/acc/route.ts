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
    const tenantId = `tenant-${prospectId.slice(0, 8)}`;

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

      // Update pilin_prospects status to CLOSED_WON
      await supabaseAdmin
        .from('pilin_prospects')
        .update({ status: 'CLOSED_WON' })
        .eq('id', prospectId);

      // Create or update platform_customers
      let customerId = dbCustomer?.id;
      if (dbCustomer) {
        await supabaseAdmin
          .from('platform_customers')
          .update({
            status: 'ACTIVE',
            updated_at: now.toISOString(),
          })
          .eq('id', dbCustomer.id);
      } else if (prospect) {
        const { data: newCust } = await supabaseAdmin
          .from('platform_customers')
          .insert({
            name: prospect.name || 'Usaha Tenant',
            contact_name: prospect.owner_name || prospect.name || 'Owner',
            email: prospect.email || 'tenant@pilin.id',
            phone: prospect.whatsapp || '',
            owner_email: prospect.email || 'tenant@pilin.id',
            status: 'ACTIVE',
          })
          .select('id')
          .single();
        customerId = newCust?.id;
      }

      // Ensure 13 standard feature flags are enabled
      const targetIdForFeatures = customerId || tenantId;
      const flagRows = PILIN_STANDARD_FEATURES.map((feat) => ({
        tenant_id: targetIdForFeatures,
        feature_code: feat.feature_code,
        enabled: true,
        updated_at: now.toISOString(),
      }));

      await supabaseAdmin
        .from('tenant_feature_flags')
        .upsert(flagRows, { onConflict: 'tenant_id,feature_code' });
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
