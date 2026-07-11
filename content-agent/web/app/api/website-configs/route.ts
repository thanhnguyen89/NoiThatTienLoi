import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Lấy danh sách website configs ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const configs = await prisma.websiteConfig.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Ẩn sensitive data trong response
    const safeConfigs = configs.map(c => ({
      ...c,
      appPassword: c.appPassword ? '••••••••' : null,
      apiKey: c.apiKey ? '••••••••' : null,
      apiSecret: c.apiSecret ? '••••••••' : null,
      hasPassword: !!c.appPassword,
      hasApiKey: !!c.apiKey,
      hasApiSecret: !!c.apiSecret,
    }));

    return NextResponse.json({ success: true, data: safeConfigs });
  } catch (error) {
    console.error('[website-configs GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── POST: Tạo hoặc cập nhật website config ───────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id, name, url, platform, apiUrl, 
      username, appPassword, apiKey, apiSecret,
      companyName, hotline, hotlineComplaint, branchCount, branchListUrl, supportInfo,
      defaultCategory, defaultAuthorId, defaultStatus,
      isActive, isDefault,
    } = body;

    if (!name?.trim() || !url?.trim() || !apiUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Thiếu: tên, URL website, API URL' },
        { status: 400 }
      );
    }

    // Nếu set isDefault = true → bỏ default các config khác
    if (isDefault) {
      await prisma.websiteConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const data = {
      name: name.trim(),
      url: url.trim(),
      platform: platform || 'wordpress',
      apiUrl: apiUrl.trim(),
      username: username?.trim() || null,
      companyName: companyName?.trim() || null,
      hotline: hotline?.trim() || null,
      hotlineComplaint: hotlineComplaint?.trim() || null,
      branchCount: branchCount ? Number(branchCount) : null,
      branchListUrl: branchListUrl?.trim() || null,
      supportInfo: supportInfo?.trim() || null,
      defaultCategory: defaultCategory ? Number(defaultCategory) : null,
      defaultAuthorId: defaultAuthorId ? Number(defaultAuthorId) : null,
      defaultStatus: defaultStatus || 'draft',
      isActive: isActive ?? true,
      isDefault: isDefault ?? false,
    };

    let config;
    if (id) {
      // Update — chỉ update sensitive fields nếu user nhập mới (không phải placeholder)
      const updateData: typeof data & { 
        appPassword?: string | null;
        apiKey?: string | null;
        apiSecret?: string | null;
      } = { ...data };
      
      if (appPassword && appPassword !== '••••••••') {
        updateData.appPassword = appPassword.trim();
      }
      if (apiKey && apiKey !== '••••••••') {
        updateData.apiKey = apiKey.trim();
      }
      if (apiSecret && apiSecret !== '••••••••') {
        updateData.apiSecret = apiSecret.trim();
      }
      
      config = await prisma.websiteConfig.update({
        where: { id },
        data: updateData,
      });
    } else {
      config = await prisma.websiteConfig.create({
        data: { 
          ...data, 
          appPassword: appPassword?.trim() || null,
          apiKey: apiKey?.trim() || null,
          apiSecret: apiSecret?.trim() || null,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...config, 
        appPassword: config.appPassword ? '••••••••' : null,
        apiKey: config.apiKey ? '••••••••' : null,
        apiSecret: config.apiSecret ? '••••••••' : null,
      } 
    });
  } catch (error) {
    console.error('[website-configs POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

// ─── DELETE: Xóa website config ───────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Thiếu id' }, { status: 400 });

    await prisma.websiteConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[website-configs DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
