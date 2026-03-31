import { NextRequest, NextResponse } from 'next/server';
import { readdir, mkdir, rename, rm } from 'fs/promises';
import path from 'path';

const UPLOAD_ROOT = () => path.join(process.cwd(), 'public', 'uploads');

// GET /admin/api/uploads/folders — list all folders
export async function GET() {
  try {
    const root = UPLOAD_ROOT();
    await mkdir(root, { recursive: true });
    const entries = await readdir(root, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, path: e.name }));
    return NextResponse.json({ success: true, data: folders });
  } catch {
    return NextResponse.json({ success: false, error: 'Lỗi đọc thư mục' }, { status: 500 });
  }
}

// POST /admin/api/uploads/folders — create folder
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || !/^[a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]+$/.test(name)) {
      return NextResponse.json({ success: false, error: 'Tên thư mục không hợp lệ' }, { status: 400 });
    }
    const folderPath = path.join(UPLOAD_ROOT(), name);
    await mkdir(folderPath, { recursive: true });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể tạo thư mục' }, { status: 500 });
  }
}

// PUT /admin/api/uploads/folders — rename folder
export async function PUT(req: NextRequest) {
  try {
    const { oldName, newName } = await req.json();
    if (!oldName || !newName) {
      return NextResponse.json({ success: false, error: 'Thiếu tên thư mục' }, { status: 400 });
    }
    const root = UPLOAD_ROOT();
    await rename(path.join(root, oldName), path.join(root, newName));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể đổi tên' }, { status: 500 });
  }
}

// DELETE /admin/api/uploads/folders — delete folder
export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: 'Thiếu tên thư mục' }, { status: 400 });
    const folderPath = path.join(UPLOAD_ROOT(), name);
    await rm(folderPath, { recursive: true, force: true });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Không thể xóa thư mục' }, { status: 500 });
  }
}
