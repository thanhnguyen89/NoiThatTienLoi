import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { validateImport } from '@/app/cau-hinh-website/schemas';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateImport(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { data, overwrite } = validation.data;

    let imported = 0;
    let skipped = 0;

    for (const config of data) {
      try {
        // Check if website with same name exists
        const existing = await prisma.websiteConfig.findFirst({
          where: { name: config.name },
        });

        if (existing && !overwrite) {
          skipped++;
          continue;
        }

        // If overwrite and exists, update
        if (existing && overwrite) {
          await prisma.websiteConfig.update({
            where: { id: existing.id },
            data: {
              url: config.url,
              platform: config.platform,
              apiUrl: config.apiUrl,
              companyName: config.companyName,
              hotline: config.hotline,
              hotlineComplaint: config.hotlineComplaint,
              branchCount: config.branchCount,
              branchListUrl: config.branchListUrl,
              supportInfo: config.supportInfo,
              username: config.username,
              appPassword: config.appPassword,
              apiKey: config.apiKey,
              apiSecret: config.apiSecret,
              defaultCategory: config.defaultCategory,
              defaultAuthorId: config.defaultAuthorId,
              defaultStatus: config.defaultStatus,
              isActive: config.isActive,
              isDefault: config.isDefault,
            },
          });
        } else {
          // Create new
          await prisma.websiteConfig.create({
            data: {
              name: config.name,
              url: config.url,
              platform: config.platform,
              apiUrl: config.apiUrl,
              companyName: config.companyName,
              hotline: config.hotline,
              hotlineComplaint: config.hotlineComplaint,
              branchCount: config.branchCount,
              branchListUrl: config.branchListUrl,
              supportInfo: config.supportInfo,
              username: config.username,
              appPassword: config.appPassword,
              apiKey: config.apiKey,
              apiSecret: config.apiSecret,
              defaultCategory: config.defaultCategory,
              defaultAuthorId: config.defaultAuthorId,
              defaultStatus: config.defaultStatus || 'draft',
              isActive: config.isActive ?? true,
              isDefault: config.isDefault ?? false,
            },
          });
        }

        imported++;
      } catch (error) {
        console.error('[import] Error importing config:', config.name, error);
        skipped++;
      }
    }

    return NextResponse.json({ success: true, data: { imported, skipped } });
  } catch (error) {
    console.error('[website-configs/import POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
