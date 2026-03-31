import { NextRequest, NextResponse } from 'next/server';
import { systemConfigService } from '@/server/services/system-config.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const config = await systemConfigService.getConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/system-config error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = await systemConfigService.saveConfig(body);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.statusCode });
    console.error('PUT /admin/api/system-config error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
