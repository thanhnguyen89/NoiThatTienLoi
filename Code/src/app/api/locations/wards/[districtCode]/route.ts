import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtCode: string }> }
) {
  try {
    const { districtCode } = await params;

    const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`, {
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wards');
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data.wards || [] });
  } catch (error) {
    console.error('Error fetching wards:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi tải danh sách phường/xã' },
      { status: 500 }
    );
  }
}
