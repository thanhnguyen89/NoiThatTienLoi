import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/server-auth';
import { validateExport } from '@/app/cau-hinh-website/schemas';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateExport(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { ids, format, includeSecrets } = validation.data;

    // Fetch configs
    const where = ids && ids.length > 0 ? { id: { in: ids } } : {};
    const configs = await prisma.websiteConfig.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Remove sensitive data if not including secrets
    const exportData = configs.map(c => {
      const data: any = { ...c };
      if (!includeSecrets) {
        delete data.appPassword;
        delete data.apiKey;
        delete data.apiSecret;
      }
      // Remove internal fields
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
      delete data.createdBy;
      delete data.updatedBy;
      return data;
    });

    if (format === 'json') {
      // Return JSON
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="website-configs-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    } else {
      // Return CSV
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            return value;
          }).join(',')
        ),
      ];
      const csv = csvRows.join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="website-configs-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('[website-configs/export POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
