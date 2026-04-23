import { NextRequest, NextResponse } from 'next/server';
import { systemConfigService } from '@/server/services/system-config.service';
import { isAppError } from '@/server/errors';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    await systemConfigService.changeMailPassword(body);
    return NextResponse.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }
    console.error('PUT /admin/api/system-config/mail-password error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
