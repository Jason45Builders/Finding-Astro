import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isPrivileged = ['admin', 'govt', 'ngo', 'hospital'].includes(profile?.role || '');

  const promises = [
    supabase.from('animals').select('id', { count: 'exact', head: true }),
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('cases').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    supabase.from('abc_events').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
  ];

  if (isPrivileged) {
    promises.push(supabase.from('cases').select('created_at').gte('created_at', new Date(Date.now() - 86400000).toISOString()));
  }

  const results = await Promise.all(promises);
  const [animals, openCases, resolvedCases, pendingAbc, todayCases] = results;

  return NextResponse.json({
    success: true,
    data: {
      totalAnimals: animals.count || 0,
      openCases: openCases.count || 0,
      resolvedCases: resolvedCases.count || 0,
      pendingAbc: pendingAbc.count || 0,
      casesToday: Array.isArray(todayCases?.data) ? todayCases.data.length : 0,
    },
  });
}
