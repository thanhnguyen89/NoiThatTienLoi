import { NextRequest, NextResponse } from 'next/server';
import { urlRecordService } from '@/server/services/url-record.service';
import { isAppError } from '@/server/errors';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const record = await urlRecordService.getUrlRecordById(id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Khong tim thay UrlRecord' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('GET /admin/api/url-records/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi server' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const record = await urlRecordService.updateUrlRecord(id, body);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode, details } = error;
      return NextResponse.json(
        { success: false, error: message, code, ...(details && { errors: details }) },
        { status: statusCode }
      );
    }
    console.error('PUT /admin/api/url-records/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi cap nhat UrlRecord' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await urlRecordService.deleteUrlRecord(id);
    return NextResponse.json({ success: true, message: 'Da xoa UrlRecord' });
  } catch (error) {
    if (isAppError(error)) {
      const { code, message, statusCode } = error;
      return NextResponse.json(
        { success: false, error: message, code },
        { status: statusCode }
      );
    }
    console.error('DELETE /admin/api/url-records/:id error:', error);
    return NextResponse.json(
      { success: false, error: 'Loi khi xoa UrlRecord' },
      { status: 500 }
    );
  }
}
