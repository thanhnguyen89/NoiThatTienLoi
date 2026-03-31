import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/server/services/menu.service';
import { isAppError } from '@/server/errors';

function serializeMenu(menu: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(menu, (_, v) => typeof v === 'bigint' ? String(v) : v));
}

export async function GET() {
  try {
    const menus = await menuService.getAllMenus();
    return NextResponse.json({ success: true, data: serializeMenu(menus) });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/menus error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const menu = await menuService.createMenu(body);
    return NextResponse.json({ success: true, data: serializeMenu(menu) }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('POST /admin/api/menus error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
