import { NextRequest, NextResponse } from 'next/server';
import { memberService } from '@/server/services/member.service';
import { isAppError } from '@/server/errors';

function getToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
  return request.cookies.get('admin_token')?.value || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab');

    if (tab === 'orders') {
      const orders = await memberService.getMemberOrders(id);
      return NextResponse.json({ success: true, data: orders });
    }

    if (tab === 'stats') {
      const stats = await memberService.getMemberStats(id);
      return NextResponse.json({ success: true, data: stats });
    }

    const member = await memberService.getMemberById(id);
    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('GET /admin/api/members/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Address actions
    if (action === 'address') {
      const body = await request.json();
      if (body._addressId) {
        const address = await memberService.updateAddress(body._addressId, id, body);
        return NextResponse.json({ success: true, data: address });
      } else {
        const address = await memberService.createAddress(id, body);
        return NextResponse.json({ success: true, data: address }, { status: 201 });
      }
    }

    if (action === 'set-default-address') {
      const body = await request.json();
      if (!body.addressId) return NextResponse.json({ success: false, error: 'Thiếu addressId' }, { status: 400 });
      await memberService.setDefaultAddress(body.addressId, id);
      return NextResponse.json({ success: true });
    }

    // Toggle active
    if (action === 'toggle-active') {
      const body = await request.json();
      const member = await memberService.toggleMemberActive(id);
      return NextResponse.json({ success: true, data: member });
    }

    // Regular member update
    const body = await request.json();
    const member = await memberService.updateMember(id, body);
    return NextResponse.json({ success: true, data: member });
  } catch (error) {
    if (isAppError(error)) {
      const response: Record<string, unknown> = { success: false, error: error.message };
      if (error.details) response.errors = error.details;
      return NextResponse.json(response, { status: error.statusCode });
    }
    console.error('PUT /admin/api/members/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getToken(request);
    if (!token) return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Delete address
    if (action === 'address') {
      const addressId = searchParams.get('addressId');
      if (!addressId) return NextResponse.json({ success: false, error: 'Thiếu addressId' }, { status: 400 });
      await memberService.deleteAddress(addressId, id);
      return NextResponse.json({ success: true });
    }

    // Soft delete member
    await memberService.deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAppError(error)) return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    console.error('DELETE /admin/api/members/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
