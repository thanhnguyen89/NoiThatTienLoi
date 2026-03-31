import { NextRequest, NextResponse } from 'next/server';
import { sliderService } from '@/server/services/slider.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const sliders = await sliderService.getAllSliders();
    return NextResponse.json({ success: true, data: sliders });
  } catch (error) {
    console.error('GET /admin/api/sliders error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy slider' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slider = await sliderService.createSlider(body);
    return NextResponse.json({ success: true, data: slider }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/sliders error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tạo slider' },
      { status: 500 }
    );
  }
}
