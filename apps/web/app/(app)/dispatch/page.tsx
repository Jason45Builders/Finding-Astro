'use client';

import { useEffect, useState } from 'react';
import { Radio, User as UserIcon, MapPin, CheckCircle } from 'lucide-react';
import type { Case, User } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DispatchPage() {
  const [openCases, setOpenCases] = useState<Case[]>([]);
  const [responders, setResponders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/cases?status=open')
      .then(r => r.json())
      .then(r => { if (r.success) setOpenCases(r.data); });
    fetch('/api/v1/users')
      .then(r => r.json())
      .then(r => {
        if (r.success) setResponders((r.data as User[]).filter((u: User) => u.isAvailable));
        setLoading(false);
      });
  }, []);

  const handleAssign = async (caseId: string, responderId: string) => {
    await fetch(`/api/v1/emergency/${caseId}/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setOpenCases(prev => prev.filter(c => c.id !== caseId));
  };

  if (loading) return <PageSpinner label="Loading dispatch..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">Responder Dispatch</h1>
        <p className="text-sm text-on-surface-variant mt-1">Assign open cases to available responders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
            <Radio className="w-5 h-5 text-error" />
            Open Cases ({openCases.length})
          </h2>
          {openCases.length > 0 ? (
            <div className="space-y-4 animate-stagger">
              {openCases.map((c) => (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant={c.priority === 'high' ? 'danger' : 'neutral'} className="mb-1">
                        {c.priority}
                      </Badge>
                      <h3 className="font-bold text-on-surface mt-1">{c.title}</h3>
                      <p className="text-sm text-on-surface-variant">{c.description.slice(0, 100)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-outline mb-3">
                    <MapPin className="w-3 h-3" />
                    {c.locationText || `${c.location.latitude.toFixed(4)}, ${c.location.longitude.toFixed(4)}`}
                  </div>
                  <div className="border-t border-outline-variant pt-3">
                    <p className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-2">Assign to:</p>
                    <div className="flex flex-wrap gap-2">
                      {responders.slice(0, 5).map((r) => (
                        <Button
                          key={r.id}
                          variant="primary"
                          size="sm"
                          onClick={() => handleAssign(c.id, r.id)}
                        >
                          <UserIcon className="w-3 h-3" />
                          {r.fullName || r.email}
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Radio} title="No open cases" />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Available Responders ({responders.length})
          </h2>
          <Card className="overflow-hidden">
            {responders.length > 0 ? (
              <div className="divide-y divide-outline-variant/50">
                {responders.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shrink-0">
                        {((r.fullName || r.email) ?? 'A').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{r.fullName || r.email}</p>
                        <p className="text-xs text-on-surface-variant capitalize">{r.role}</p>
                      </div>
                    </div>
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Available" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-outline text-sm">No available responders.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
