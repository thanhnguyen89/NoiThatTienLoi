import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://provinces.open-api.vn/api/p/', {
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!response.ok) {
      throw new Error('Failed to fetch provinces');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching provinces:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách tỉnh/thành phố' },
      { status: 500 }
    );
  }
}
