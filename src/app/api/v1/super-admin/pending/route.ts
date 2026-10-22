import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PendingRegistrationStore } from '@/domains/tenant/pendingRegistrationStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const registrationMap = new Map();

    // 1. From in-memory / local persistent store
    try {
      const storeRecords = PendingRegistrationStore.getAll();
      for (const r of storeRecords) {
        registrationMap.set(r.id, {
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          whatsapp: r.whatsapp,
          email: r.email,
          employeeCount: r.employeeCount,
          createdAt: r.createdAt,
          status: r.status,
          trialStatus: r.trialStatus,
        });
      }
    } catch (e) {
      console.warn('PendingRegistrationStore error in API route:', e);
    }

    // 2. From Supabase pilin_prospects
    try {
      const supabaseAdmin = createAdminClient();
      const { data: prospects, error: pErr } = await supabaseAdmin
        .from('pilin_prospects')
        .select('id, name, whatsapp, created_at, status')
        .order('created_at', { ascending: false });

      if (!pErr && Array.isArray(prospects)) {
        for (const p of prospects) {
          registrationMap.set(p.id, {
            id: p.id,
            name: p.name || 'Usaha Tanpa Nama',
            ownerName: p.name || 'Pemilik Usaha',
            whatsapp: p.whatsapp || '-',
            email: '-',
            employeeCount: '1 Cabang',
            createdAt: p.created_at || new Date().toISOString(),
            status: p.status === 'CLOSED_WON' ? 'CLOSED_WON' : 'NEW',
            trialStatus: p.status === 'CLOSED_WON' ? 'ACTIVE' : 'PENDING_APPROVAL',
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database error pilin_prospects in API route:', dbErr);
    }

    // 3. From Supabase platform_customers (contains owner contact & email)
    try {
      const supabaseAdmin = createAdminClient();
      const { data: customers, error: cErr } = await supabaseAdmin
        .from('platform_customers')
        .select('id, name, contact_name, email, phone, status, created_at')
        .order('created_at', { ascending: false });

      if (!cErr && Array.isArray(customers)) {
        for (const c of customers) {
          let matchedKey = c.id;
          for (const [key, val] of registrationMap.entries()) {
            if (val.whatsapp === c.phone || (c.name && val.name.toLowerCase() === c.name.toLowerCase())) {
              matchedKey = key;
              break;
            }
          }
          const prev = registrationMap.get(matchedKey);
          registrationMap.set(matchedKey, {
            id: matchedKey,
            name: c.name || prev?.name || 'Usaha Tanpa Nama',
            ownerName: c.contact_name || prev?.ownerName || 'Pemilik Usaha',
            whatsapp: c.phone || prev?.whatsapp || '-',
            email: c.email || prev?.email || '-',
            employeeCount: prev?.employeeCount || '1 Cabang',
            createdAt: c.created_at || prev?.createdAt || new Date().toISOString(),
            status: prev?.status || 'NEW',
            trialStatus: prev?.trialStatus || 'PENDING_APPROVAL',
          });
        }
      }
    } catch (custErr) {
      console.warn('Database error platform_customers in API route:', custErr);
    }

    const registrations = Array.from(registrationMap.values()).sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      registrations,
      count: registrations.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Gagal memuat data pendaftaran.',
      registrations: [],
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID pendaftaran wajib diisi.' }, { status: 400 });
    }

    // 1. Delete from local store
    try {
      PendingRegistrationStore.delete(id);
    } catch (e) {
      console.warn('PendingRegistrationStore.delete notice:', e);
    }

    // 2. Delete from Supabase
    try {
      const supabaseAdmin = createAdminClient();
      await supabaseAdmin.from('pilin_prospects').delete().eq('id', id);
      await supabaseAdmin.from('platform_customers').delete().eq('id', id);
    } catch (dbErr) {
      console.warn('Database delete notice in pending route:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran berhasil dihapus dari sistem.',
      id,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || 'Gagal menghapus pendaftaran.',
    }, { status: 500 });
  }
}
