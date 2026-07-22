'use client';

export default function SingleAnimalMap({ lat, lng, name, status }: { lat: number; lng: number; name: string; status: string }) {
  return (
    <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
      Map: {name} ({lat.toFixed(4)}, {lng.toFixed(4)})
    </div>
  );
}
