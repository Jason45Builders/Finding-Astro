'use client';

export default function OpenCasesMap({ cases }: { cases: any[] }) {
  return (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
      {cases.length} open case{cases.length !== 1 ? 's' : ''} on map
    </div>
  );
}
