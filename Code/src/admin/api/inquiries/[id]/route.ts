import { NextRequest, NextResponse } from 'next/server';
import { inquiryService } from '@/server/services/inquiry.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PUT /admin/api/inquiries/:id (admin - cập nhật trạng thái)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const inquiry = await inquiryService.updateInquiryStatus(id, body.status, body.note);
    return NextResponse.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('PUT /admin/api/inquiries/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /admin/api/inquiries/:id
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await inquiryService.deleteInquiry(id);
    return NextResponse.json({ success: true, message: 'Đã xóa' });
  } catch (error) {
    console.error('DELETE /admin/api/inquiries/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa' },
      { status: 500 }
    );
  }
}
