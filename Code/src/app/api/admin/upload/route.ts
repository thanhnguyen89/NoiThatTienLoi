import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const MAX_SIZE = 977 * 1024; // 977 KB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files.length) {
      return NextResponse.json({ success: false, error: 'Không có file' }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const folder = formData.get('folder') as string | null;
    const targetDir = folder ? join(uploadDir, folder) : uploadDir;
    await mkdir(targetDir, { recursive: true });

    const results = await Promise.all(files.map(async (file) => {
      if (!ALLOWED.includes(file.type)) {
        return { name: file.name, error: 'Định dạng không hỗ trợ' };
      }
      if (file.size > MAX_SIZE) {
        return { name: file.name, size: file.size, error: `File is too large. Maximum file size is ${Math.round(MAX_SIZE / 1024)} KB.` };
      }

      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(targetDir, filename), buffer);

      const urlPath = folder ? `/uploads/${folder}/${filename}` : `/uploads/${filename}`;
      return { name: file.name, size: file.size, url: urlPath };
    }));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi upload' }, { status: 500 });
  }
}
