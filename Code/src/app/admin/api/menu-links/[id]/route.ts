import { NextRequest, NextResponse } from 'next/server';
import { menuLinkService } from '@/server/services/menu-link.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const menuLink = await menuLinkService.getMenuLinkById(id);
    if (!menuLink) {
      return NextResponse.json(
        { success: false, error: 'Khong tim thay menu link' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: menuLink });
  } catch (error) {
    console.error('GET /admin/api/menu-links/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const menuLink = await menuLinkService.updateMenuLink(id, body);
    return NextResponse.json({ success: true, data: menuLink });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/menu-links/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi cap nhat menu link' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await menuLinkService.deleteMenuLink(id);
    return NextResponse.json({ success: true, message: 'Da xoa menu link' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/menu-links/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi xoa menu link' },
      { status: 500 }
    );
  }
}
