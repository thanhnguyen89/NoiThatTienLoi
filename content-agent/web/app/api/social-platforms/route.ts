import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Lấy danh sách social platforms ──────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const platforms = await prisma.socialPlatform.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ isDefault: 'desc' }, { type: 'asc' }, { createdAt: 'asc' }],
    });

    // Ẩn accessToken
    const safePlatforms = platforms.map(p => ({
      ...p,
      accessToken: p.accessToken ? '••••••••' : null,
      hasToken: !!p.accessToken,
    }));

    return NextResponse.json({ success: true, data: safePlatforms });
  } catch (error) {
    console.error('[social-platforms GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── POST: Tạo hoặc cập nhật social platform ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, type, name, pageId, pageUrl, accessToken, accessTokenExpiry, config, isActive, isDefault } = body;

    if (!type || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu: loại nền tảng và tên' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.socialPlatform.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data = {
      type,
      name: name.trim(),
      pageId: pageId?.trim() || null,
      pageUrl: pageUrl?.trim() || null,
      accessTokenExpiry: accessTokenExpiry ? new Date(accessTokenExpiry) : null,
      config: config || null,
      isActive: isActive ?? true,
      isDefault: isDefault ?? false,
    };

    let platform;
    if (id) {
      const updateData: typeof data & { accessToken?: string | null } = { ...data };
      if (accessToken && accessToken !== '••••••••') {
        updateData.accessToken = accessToken.trim();
      }
      platform = await prisma.socialPlatform.update({ where: { id }, data: updateData });
    } else {
      platform = await prisma.socialPlatform.create({
        data: { ...data, accessToken: accessToken?.trim() || null },
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...platform, accessToken: platform.accessToken ? '••••••••' : null },
    });
  } catch (error) {
    console.error('[social-platforms POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 });

    await prisma.socialPlatform.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[social-platforms DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
