import { NextRequest, NextResponse } from 'next/server';
import { menuLinkService } from '@/server/services/menu-link.service';
import { isAppError } from '@/server/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menuId');

    let menuLinks;
    if (menuId) {
      menuLinks = await menuLinkService.getMenuLinksByMenuId(menuId);
    } else {
      menuLinks = await menuLinkService.getAllMenuLinks();
    }
    return NextResponse.json({ success: true, data: menuLinks });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error('GET /admin/api/menu-links error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy menu links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const menuLink = await menuLinkService.createMenuLink(body);
    return NextResponse.json({ success: true, data: menuLink }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/menu-links error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo menu link' },
      { status: 500 }
    );
  }
}
