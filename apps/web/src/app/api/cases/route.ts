import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const caseSchema = z.object({
  case_type: z.enum(['rescue', 'abuse', 'conflict', 'lost_pet', 'abc', 'wildlife']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.object({ lat: z.number(), lng: z.number() }),
  location_text: z.string().optional(),
  animal_id: z.string().optional(),
  guest_phone: z.string().optional(),
});

export async function GET(request: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const caseType = searchParams.get('case_type');

  let query = supabase.from('cases').select('*, profiles!cases_reporter_user_id_fkey(full_name)');
  if (status) query = query.eq('status', status);
  if (caseType) query = query.eq('case_type', caseType);

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json();
  const parsed = caseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid input', fields: parsed.error.flatten().fieldErrors }, { status: 400 });

  const isEmergency = parsed.data.case_type === 'rescue' || parsed.data.case_type === 'abuse';
  const insertData = {
    ...parsed.data,
    priority: isEmergency ? 'high' : parsed.data.priority,
    location: `POINT(${parsed.data.location.lng} ${parsed.data.location.lat})`,
    reporter_user_id: user?.id || null,
    guest_phone: user ? null : parsed.data.guest_phone,
    status: 'open',
  };

  const { data, error } = await supabase.from('cases').insert(insertData).select().single();
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  // Broadcast to nearby responders via Supabase Realtime
  await supabase.channel('emergency').send({
    type: 'broadcast',
    event: 'new_case',
    payload: { case_id: data.id, priority: data.priority, lat: parsed.data.location.lat, lng: parsed.data.location.lng },
  });

  return NextResponse.json({ success: true, data, message: 'Case created' });
}
