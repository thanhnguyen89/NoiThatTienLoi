import { NextRequest, NextResponse } from 'next/server';
import { sliderPictureService } from '@/server/services/slider-picture.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const pictures = await sliderPictureService.getAllSliderPictures();
    return NextResponse.json({ success: true, data: pictures });
  } catch (error) {
    console.error('GET /admin/api/slider-pictures error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách hình ảnh slider' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const picture = await sliderPictureService.createSliderPicture(body);
    return NextResponse.json({ success: true, data: picture }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/slider-pictures error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo hình ảnh slider' },
      { status: 500 }
    );
  }
}
