import { NextRequest, NextResponse } from 'next/server';
import { inquiryService } from '@/server/services/inquiry.service';

/**
 * GET /admin/api/inquiries (admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const result = await inquiryService.getInquiries({
      page: Number(searchParams.get('page')) || 1,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('GET /admin/api/inquiries error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi lấy danh sách yêu cầu' },
      { status: 500 }
    );
  }
}

/**
 * POST /admin/api/inquiries (admin)
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
    console.error('POST /admin/api/inquiries error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi gửi yêu cầu' },
      { status: 500 }
    );
  }
}
