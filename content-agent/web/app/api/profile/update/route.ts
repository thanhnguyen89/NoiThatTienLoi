import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, currentPassword, newPassword } = body;

    // Validation
    if (!fullName?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Họ tên không được để trống' },
        { status: 400 }
      );
    }

    // Get current user from DB
    const dbUser = await prisma.adminUser.findUnique({
      where: { id: user.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      fullName: fullName.trim(),
    };

    // If changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: 'Vui lòng nhập mật khẩu hiện tại' },
          { status: 400 }
        );
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Mật khẩu hiện tại không đúng' },
          { status: 400 }
        );
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(newPassword, salt);
    }

    // Update user
    await prisma.adminUser.update({
      where: { id: user.userId },
      data: updateData,
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.userId,
        username: user.username,
        action: 'UPDATE',
        resource: 'profile',
        resourceId: user.userId,
        description: newPassword ? 'Cập nhật thông tin và đổi mật khẩu' : 'Cập nhật thông tin',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[profile/update] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
