import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Danh sách brand profiles ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const profiles = await prisma.brandProfile.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: profiles });
  } catch (error) {
    console.error('[brand-profiles GET]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── POST: Tạo brand profile mới ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      name, shopName, industry, brandPronouns, brandAudience,
      brandToneNotes, phone, address, brandDesc, brandForbidden,
      ctaStandard, mainProducts, latitude, longitude, openingHours, priceRange, isDefault,
    } = body;

    if (!name?.trim() || !shopName?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu tên profile và tên thương hiệu' }, { status: 400 });
    }

    // Nếu set default → bỏ default của các profile khác
    if (isDefault) {
      await prisma.brandProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const profile = await prisma.brandProfile.create({
      data: {
        name:           name.trim(),
        shopName:       shopName.trim(),
        industry:       industry?.trim()        || null,
        brandPronouns:  brandPronouns?.trim()   || null,
        brandAudience:  brandAudience?.trim()   || null,
        brandToneNotes: brandToneNotes?.trim()  || null,
        phone:          phone?.trim()           || null,
        address:        address?.trim()         || null,
        brandDesc:      brandDesc?.trim()       || null,
        brandForbidden: brandForbidden?.trim()  || null,
        ctaStandard:    ctaStandard?.trim()     || null,
        mainProducts:   mainProducts?.trim()    || null,
        latitude:        latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : null,
        longitude:       longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : null,
        openingHours:    openingHours?.trim()   || null,
        priceRange:      priceRange?.trim()     || null,
        isDefault:      isDefault ?? false,
        isActive:       true,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('[brand-profiles POST]', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
