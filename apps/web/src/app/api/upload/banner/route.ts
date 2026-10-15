import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// POST /api/upload/banner
// Upload a tournament banner image to Supabase Storage.
// Requires authentication. Accepts multipart/form-data with 'file' field.
export async function POST(req: NextRequest) {
  // Authenticate the request
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const guildId = req.nextUrl.searchParams.get('guildId');
  if (!guildId) {
    return NextResponse.json({ error: 'Missing guildId query parameter' }, { status: 400 });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
      { status: 400 }
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5 MB.' },
      { status: 400 }
    );
  }

  // Determine extension from MIME type
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const ext = extMap[file.type] ?? 'jpg';

  // Build storage path: {guildId}/{uuid}.{ext}
  const uuid = randomUUID();
  const storagePath = `${guildId}/${uuid}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Upload to Supabase Storage 'banners' bucket
  const { error: uploadError } = await supabase.storage
    .from('banners')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload/banner] Supabase storage error:', uploadError);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }

  // Get the public URL
  const { data: urlData } = supabase.storage.from('banners').getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
