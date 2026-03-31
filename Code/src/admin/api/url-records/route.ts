import { NextRequest, NextResponse } from 'next/server';
import { urlRecordService } from '@/server/services/url-record.service';
import { isAppError } from '@/server/errors';

export async function GET() {
  try {
    const records = await urlRecordService.getAllUrlRecords();
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error('GET /admin/api/url-records error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi lay danh sach UrlRecord' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const record = await urlRecordService.createUrlRecord(body);
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('POST /admin/api/url-records error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi tao UrlRecord' },
      { status: 500 }
    );
  }
}
