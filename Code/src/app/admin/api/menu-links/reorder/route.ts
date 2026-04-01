import { NextRequest, NextResponse } from 'next/server';
import { menuLinkService } from '@/server/services/menu-link.service';
import { isAppError } from '@/server/errors';
import { validateReorderMenuLinks } from '@/server/validators/menu-link.validator';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validateReorderMenuLinks(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Du lieu khong hop le', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await menuLinkService.reorderMenuLinks(parsed.data.updates);
    return NextResponse.json({ success: true, message: 'Da cap nhat thu tu' });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('PUT /admin/api/menu-links/reorder error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi cap nhat thu tu' },
      { status: 500 }
    );
  }
}
