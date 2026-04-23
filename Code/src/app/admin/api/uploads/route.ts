import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, unlink, rename } from 'fs/promises';
import path from 'path';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const uploadRoot = path.join(process.cwd(), 'public', 'uploads');
    const targetDir = folder ? path.join(uploadRoot, folder) : uploadRoot;

    let files: string[] = [];
    try {
      files = await readdir(targetDir);
    } catch {
      return NextResponse.json({ success: true, data: [], total: 0, page, limit, totalPages: 0 });
    }

    const imageFiles = files.filter((f) => IMAGE_EXTS.some((e) => f.toLowerCase().endsWith(e)));

    // Get all images with metadata first
    const allImages = await Promise.all(
      imageFiles.map(async (file) => {
        let size: number | null = null;
        let mtime: number | null = null;
        try {
          const s = await stat(path.join(targetDir, file));
          size = s.size;
          mtime = s.mtimeMs; // Modification time in milliseconds
        } catch {}
        const urlPath = folder ? `/uploads/${folder}/${file}` : `/uploads/${file}`;
        return { name: file, url: urlPath, size, mtime, folder: folder || 'root' };
      })
    );

    // Sort by modification time (newest first)
    allImages.sort((a, b) => (b.mtime || 0) - (a.mtime || 0));

    const total = allImages.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const images = allImages.slice(start, start + limit);

    return NextResponse.json({ success: true, data: images, total, page, limit, totalPages });
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
