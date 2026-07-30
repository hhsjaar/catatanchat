import { NextResponse } from 'next/server';
import { getFolders, createFolder, updateFolder, deleteFolder } from '@/lib/db';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json({ success: true, folders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
    }

    const folder = await createFolder(name.trim());
    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Folder ID and name are required' }, { status: 400 });
    }

    const folder = await updateFolder(id, name.trim());
    if (!folder) {
      return NextResponse.json({ success: false, error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, folder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Folder ID is required' }, { status: 400 });
    }

    const success = await deleteFolder(id);
    return NextResponse.json({ success, message: success ? 'Folder deleted' : 'Folder not found' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
