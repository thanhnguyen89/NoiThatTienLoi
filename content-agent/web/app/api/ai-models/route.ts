import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// ─── GET: Lấy danh sách AI models ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const models = await prisma.aIModel.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: models });
  } catch (error) {
    console.error('[ai-models GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── POST: Tạo hoặc cập nhật AI model ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, provider, modelId, apiKey, baseUrl, icon, description, isActive, isDefault } = body;

    // Validation
    if (!name?.trim() || !provider?.trim() || !modelId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: name, provider, modelId' },
        { status: 400 }
      );
    }

    // Nếu set isDefault = true, bỏ default của các model khác
    if (isDefault) {
      await prisma.aIModel.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    let model;

    if (id) {
      // Update existing model
      model = await prisma.aIModel.update({
        where: { id },
        data: {
          name: name.trim(),
          provider: provider.trim(),
          modelId: modelId.trim(),
          apiKey: apiKey?.trim() || null,
          baseUrl: baseUrl?.trim() || null,
          icon: icon?.trim() || null,
          description: description?.trim() || null,
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
        },
      });
    } else {
      // Create new model
      model = await prisma.aIModel.create({
        data: {
          name: name.trim(),
          provider: provider.trim(),
          modelId: modelId.trim(),
          apiKey: apiKey?.trim() || null,
          baseUrl: baseUrl?.trim() || null,
          icon: icon?.trim() || null,
          description: description?.trim() || null,
          isActive: isActive ?? true,
          isDefault: isDefault ?? false,
        },
      });
    }

    return NextResponse.json({ success: true, data: model });
  } catch (error) {
    console.error('[ai-models POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// ─── DELETE: Xóa AI model ──────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID' }, { status: 400 });
    }

    // Không cho xóa model default
    const model = await prisma.aIModel.findUnique({ where: { id } });
    if (model?.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Không thể xóa model mặc định' },
        { status: 400 }
      );
    }

    await prisma.aIModel.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ai-models DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi server';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
