import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ success: false, error: 'Không có file nào' }, { status: 400 });
    }

    const results: Array<{ name: string; url?: string; error?: string }> = [];

    const folder = formData.get('folder') as string | null;
    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    const uploadDir = folder ? path.join(uploadRoot, folder) : uploadRoot;
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        results.push({ name: file.name, error: `File quá lớn (max ${MAX_SIZE / 1024 / 1024}MB)` });
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        results.push({ name: file.name, error: 'Định dạng không được hỗ trợ' });
        continue;
      }

      const ext = file.name.split('.').pop() || 'jpg';
      // Giữ tên gốc, thêm timestamp prefix để tránh trùng
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'image';
      const fileName = `${Date.now()}-${baseName}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const urlPath = folder ? `/uploads/${folder}/${fileName}` : `/uploads/${fileName}`;
      results.push({ name: file.name, url: urlPath });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi upload' }, { status: 500 });
  }
}
