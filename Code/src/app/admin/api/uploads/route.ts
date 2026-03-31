import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink, rename } from 'fs/promises';
import path from 'path';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';

    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = folder ? path.join(uploadRoot, folder) : uploadRoot;

    let files: string[] = [];
    try {
      files = await readdir(targetDir);
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }

    const images = await Promise.all(
      files
        .filter((f) => IMAGE_EXTS.some((e) => f.toLowerCase().endsWith(e)))
        .map(async (file) => {
          let size: number | null = null;
          try {
            const s = await stat(path.join(targetDir, file));
            size = s.size;
          } catch {}
          const urlPath = folder ? `/uploads/${folder}/${file}` : `/uploads/${file}`;
          return { name: file, url: urlPath, size, folder: folder || 'root' };
        })
    );

    return NextResponse.json({ success: true, data: images });
  } catch (error) {
    console.error('List uploads error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi khi đọc thư mục' }, { status: 500 });
  }
}

// DELETE /admin/api/uploads — delete a file by url path
export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'Thiếu url' }, { status: 400 });
    }
    // url like /uploads/folder/file.jpg or /uploads/file.jpg
    const relative = url.replace(/^\/uploads\//, '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', relative);
    // Prevent path traversal
    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    if (!filePath.startsWith(uploadRoot)) {
      return NextResponse.json({ success: false, error: 'Không hợp lệ' }, { status: 400 });
    }
    await unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể xóa file' }, { status: 500 });
  }
}

// PATCH /admin/api/uploads — rename a file
// body: { url: '/uploads/folder/old.jpg', newName: 'new-name' }  (newName without extension)
export async function PATCH(request: NextRequest) {
  try {
    const { url, newName } = await request.json();
    if (!url || !newName || typeof url !== 'string' || typeof newName !== 'string') {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 });
    }

    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    const relative = url.replace(/^\/uploads\//, '');
    const oldPath = path.join(uploadRoot, relative);

    // Security: prevent path traversal
    if (!oldPath.startsWith(uploadRoot)) {
      return NextResponse.json({ success: false, error: 'Không hợp lệ' }, { status: 400 });
    }

    // Keep original extension, use new name (sanitized)
    const ext = path.extname(relative);
    const dir = path.dirname(oldPath);
    const safeName = newName.trim().replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, '').trim();
    if (!safeName) {
      return NextResponse.json({ success: false, error: 'Tên không hợp lệ' }, { status: 400 });
    }

    const newFileName = safeName + ext;
    const newPath = path.join(dir, newFileName);

    if (!newPath.startsWith(uploadRoot)) {
      return NextResponse.json({ success: false, error: 'Không hợp lệ' }, { status: 400 });
    }

    await rename(oldPath, newPath);

    // Build new URL
    const relativeDir = path.dirname(relative);
    const newUrl = relativeDir === '.' ? `/uploads/${newFileName}` : `/uploads/${relativeDir}/${newFileName}`;

    return NextResponse.json({ success: true, newUrl });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể đổi tên file' }, { status: 500 });
  }
}
