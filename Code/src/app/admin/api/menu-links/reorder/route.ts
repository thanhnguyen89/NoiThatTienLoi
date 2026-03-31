import { NextRequest, NextResponse } from 'next/server';
import { menuLinkService } from '@/server/services/menu-link.service';
import { isAppError } from '@/server/errors';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    await menuLinkService.reorderMenuLinks(body.updates);
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
