import { NextRequest, NextResponse } from 'next/server';
import { inquiryService } from '@/server/services/inquiry.service';

/**
 * POST /api/inquiries - Public: khách gửi form tư vấn
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng nhập tên và số điện thoại' },
        { status: 400 }
      );
    }
    const inquiry = await inquiryService.createInquiry(body);
    return NextResponse.json({ success: true, data: inquiry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/inquiries error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi gửi yêu cầu' },
      { status: 500 }
    );
  }
}
