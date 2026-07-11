import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server-auth';

// ─── POST: Test WordPress REST API connection ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { apiUrl, username, appPassword } = await request.json();

    if (!apiUrl?.trim()) {
      return NextResponse.json({ success: false, error: 'Thiếu API URL' }, { status: 400 });
    }

    const testUrl = apiUrl.replace(/\/$/, '') + '/users/me';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (username && appPassword) {
      const encoded = Buffer.from(`${username}:${appPassword}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(8000) });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        success: true,
        siteName: data.name || data.slug || '',
        userId: data.id,
      });
    } else if (res.status === 401) {
      return NextResponse.json({ success: false, error: 'Sai tên đăng nhập hoặc App Password' });
    } else {
      return NextResponse.json({ success: false, error: `API trả về ${res.status}` });
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Lỗi không xác định';
    return NextResponse.json({ success: false, error: `Không thể kết nối: ${msg}` });
  }
}
