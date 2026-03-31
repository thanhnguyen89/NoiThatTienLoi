import { NextRequest, NextResponse } from 'next/server';
import { menuService } from '@/server/services/menu.service';
import { isAppError } from '@/server/errors';

function serializeMenu(menu: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(menu, (_, v) => typeof v === 'bigint' ? String(v) : v));
}

interface Props { params: Promise<{ id: string }>; }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const menu = await menuService.getMenuById(id);
    return NextResponse.json({ success: true, data: serializeMenu(menu) });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await request.json();
    const menu = await menuService.updateMenu(id, body);
    return NextResponse.json({ success: true, data: serializeMenu(menu) });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    await menuService.deleteMenu(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
