import { NextRequest, NextResponse } from 'next/server';
import { sliderPictureService } from '@/server/services/slider-picture.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const picture = await sliderPictureService.getSliderPictureById(id);
    if (!picture) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy hình ảnh slider' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: picture });
  } catch (error) {
    console.error('GET /admin/api/slider-pictures/:id error:', error);
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
    const picture = await sliderPictureService.updateSliderPicture(id, body);
    return NextResponse.json({ success: true, data: picture });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/slider-pictures/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi cập nhật hình ảnh slider' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await sliderPictureService.deleteSliderPicture(id);
    return NextResponse.json({ success: true, message: 'Đã xóa hình ảnh slider' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/slider-pictures/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi xóa hình ảnh slider' },
      { status: 500 }
    );
  }
}
