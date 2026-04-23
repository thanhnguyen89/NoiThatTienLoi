import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provinceCode: string }> }
) {
  try {
    const { provinceCode } = await params;

    const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`, {
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!response.ok) {
      throw new Error('Failed to fetch districts');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data.districts || [] });
  } catch (error) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách quận/huyện' },
      { status: 500 }
    );
  }
}
