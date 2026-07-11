import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { validateBulkAction } from '@/app/cau-hinh-website/schemas';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBulkAction(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { ids, action } = validation.data;

    switch (action) {
      case 'delete':
        await prisma.websiteConfig.deleteMany({
          where: { id: { in: ids } },
        });
        break;

      case 'activate':
        await prisma.websiteConfig.updateMany({
          where: { id: { in: ids } },
          data: { isActive: true },
        });
        break;

      case 'deactivate':
        await prisma.websiteConfig.updateMany({
          where: { id: { in: ids } },
          data: { isActive: false },
        });
        break;

      case 'export':
        // Export is handled by /export endpoint
        break;

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[website-configs/bulk POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
