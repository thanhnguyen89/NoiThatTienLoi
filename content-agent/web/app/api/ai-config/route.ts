import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';

// GET - Lấy tất cả config
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await prisma.aIConfig.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });

    // Group by type
    const grouped = {
      FORBIDDEN_WORDS: configs.find((c) => c.type === 'FORBIDDEN_WORDS')?.items || [],
      CLICHE_OPENINGS: configs.find((c) => c.type === 'CLICHE_OPENINGS')?.items || [],
    };

    return NextResponse.json({ success: true, data: grouped });
  } catch (error) {
    console.error('[ai-config GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

// POST - Cập nhật config
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, items } = body;

    if (!type || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'FORBIDDEN_WORDS' && type !== 'CLICHE_OPENINGS') {
      return NextResponse.json(
        { success: false, error: 'Invalid config type' },
        { status: 400 }
      );
    }

    // Upsert config
    const config = await prisma.aIConfig.upsert({
      where: {
        // Composite unique constraint would be ideal, but using findFirst + update/create
        id: (await prisma.aIConfig.findFirst({ where: { type } }))?.id || 'new',
      },
      update: {
        items,
        updatedBy: user.userId,
      },
      create: {
        type,
        items,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
    });

    console.log(`[ai-config] Updated ${type}: ${items.length} items`);

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('[ai-config POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
