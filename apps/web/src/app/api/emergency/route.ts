import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const emergencySchema = z.object({
  description: z.string().min(1),
  severity: z.enum(['critical', 'serious', 'stable_needs_care']),
  location: z.object({ lat: z.number(), lng: z.number() }),
  location_text: z.string().optional(),
  photo_url: z.string().optional(),
  guest_phone: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const body = await request.json();
  const parsed = emergencySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Invalid input' }, { status: 400 });

  const priorityMap = { critical: 'critical', serious: 'high', stable_needs_care: 'medium' } as const;

  const { data, error } = await supabase.from('cases').insert({
    case_type: 'rescue',
    status: 'open',
    priority: priorityMap[parsed.data.severity],
    title: `Emergency: ${parsed.data.severity} — ${parsed.data.description.slice(0, 60)}`,
    description: parsed.data.description,
    location: `POINT(${parsed.data.location.lng} ${parsed.data.location.lat})`,
    location_text: parsed.data.location_text,
    evidence_urls: parsed.data.photo_url ? [parsed.data.photo_url] : [],
    reporter_user_id: user?.id || null,
    guest_phone: user ? null : parsed.data.guest_phone,
  }).select().single();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  // Broadcast emergency
  await supabase.channel('emergency').send({
    type: 'broadcast',
    event: 'emergency',
    payload: { case_id: data.id, severity: parsed.data.severity, lat: parsed.data.location.lat, lng: parsed.data.location.lng },
  });

  return NextResponse.json({ success: true, data, message: 'Emergency reported. Help is on the way.' });
}
