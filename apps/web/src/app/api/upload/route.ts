import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ success: false, message: 'No file' }, { status: 400 });

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage.from('media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(data.path);
  return NextResponse.json({ success: true, data: { url: publicUrl.publicUrl, path: data.path } });
}
