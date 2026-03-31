import { NextRequest, NextResponse } from 'next/server';
import { sliderService } from '@/server/services/slider.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const slider = await sliderService.getSliderById(id);
    if (!slider) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy slider' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: slider });
  } catch (error) {
    console.error('GET /admin/api/sliders/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const slider = await sliderService.updateSlider(id, body);
    return NextResponse.json({ success: true, data: slider });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/sliders/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật slider' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await sliderService.deleteSlider(id);
    return NextResponse.json({ success: true, message: 'Đã xóa slider' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/sliders/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa slider' },
      { status: 500 }
    );
  }
}
