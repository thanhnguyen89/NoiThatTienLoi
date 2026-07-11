import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── PATCH: Cập nhật brand profile ───────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, shopName, industry, brandPronouns, brandAudience,
      brandToneNotes, phone, address, brandDesc, brandForbidden,
      ctaStandard, mainProducts, latitude, longitude, openingHours, priceRange, isDefault, isActive,
    } = body;

    // Nếu set default → bỏ default của các profile khác
    if (isDefault) {
      await prisma.brandProfile.updateMany({
        where: { isDefault: true, NOT: { id: params.id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (name           !== undefined) data.name           = name.trim();
    if (shopName       !== undefined) data.shopName       = shopName.trim();
    if (industry       !== undefined) data.industry       = industry?.trim()       || null;
    if (brandPronouns  !== undefined) data.brandPronouns  = brandPronouns?.trim()  || null;
    if (brandAudience  !== undefined) data.brandAudience  = brandAudience?.trim()  || null;
    if (brandToneNotes !== undefined) data.brandToneNotes = brandToneNotes?.trim() || null;
    if (phone          !== undefined) data.phone          = phone?.trim()          || null;
    if (address        !== undefined) data.address        = address?.trim()        || null;
    if (brandDesc      !== undefined) data.brandDesc      = brandDesc?.trim()      || null;
    if (brandForbidden !== undefined) data.brandForbidden = brandForbidden?.trim() || null;
    if (ctaStandard    !== undefined) data.ctaStandard    = ctaStandard?.trim()   || null;
    if (mainProducts   !== undefined) data.mainProducts   = mainProducts?.trim()  || null;
    if (latitude       !== undefined) data.latitude       = latitude !== null && latitude !== '' ? Number(latitude) : null;
    if (longitude      !== undefined) data.longitude      = longitude !== null && longitude !== '' ? Number(longitude) : null;
    if (openingHours   !== undefined) data.openingHours   = openingHours?.trim()  || null;
    if (priceRange     !== undefined) data.priceRange     = priceRange?.trim()    || null;
    if (isDefault      !== undefined) data.isDefault      = isDefault;
    if (isActive       !== undefined) data.isActive       = isActive;

    const profile = await prisma.brandProfile.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('[brand-profiles PATCH]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    await prisma.brandProfile.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[brand-profiles DELETE]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
