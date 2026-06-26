import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const animalSchema = z.object({
  name: z.string().optional(),
  species: z.string().min(1),
  breed: z.string().optional(),
  color: z.string().optional(),
  gender: z.string().optional(),
  status: z.enum(['community', 'lost', 'found', 'reunited', 'adopted']).default('community'),
  location: z.object({ lat: z.number(), lng: z.number() }),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '5';
  const status = searchParams.get('status');

  let query = supabase.from('animals').select('*');
  if (status) query = query.eq('status', status);

  if (lat && lng) {
    const { data, error } = await supabase.rpc('nearby_animals', {
      lat: Number(lat),
      lng: Number(lng),
      radius_km: Number(radius),
    });
    if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    return NextResponse.json({ success: true, data });
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = animalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid input', fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const { data, error } = await supabase.from('animals').insert({
    ...parsed.data,
    location: `POINT(${parsed.data.location.lng} ${parsed.data.location.lat})`,
    created_by_user_id: user.id,
  }).select().single();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data, message: 'Animal created' });
}
