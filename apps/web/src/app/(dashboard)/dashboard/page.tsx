'use client';

import { useEffect, useState } from 'react';
import { Dog, AlertTriangle, CheckCircle, Activity, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  totalAnimals: number;
  openCases: number;
  resolvedCases: number;
  pendingAbc: number;
  casesToday: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(r => { if (r.success) setStats(r.data); })
      .finally(() => setLoading(false));
  }, []);

  const chartData = [
    { name: 'Open', value: stats?.openCases || 0, fill: '#B83232' },
    { name: 'Resolved', value: stats?.resolvedCases || 0, fill: '#4A7C59' },
    { name: 'ABC Pending', value: stats?.pendingAbc || 0, fill: '#C9A227' },
  ];

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-astro-dark">Dashboard</h1>
        <p className="text-astro-sand">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Dog} label="Animals Tracked" value={stats?.totalAnimals || 0} color="bg-astro-sage" />
        <MetricCard icon={AlertTriangle} label="Open Cases" value={stats?.openCases || 0} color="bg-astro-danger" />
        <MetricCard icon={CheckCircle} label="Resolved Cases" value={stats?.resolvedCases || 0} color="bg-astro-sage" />
        <MetricCard icon={Activity} label="ABC Pending" value={stats?.pendingAbc || 0} color="bg-astro-warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-astro-dark mb-4">Case Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-astro-dark mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <a href="/emergency" className="flex items-center gap-3 p-4 bg-astro-danger text-white rounded-xl hover:bg-astro-danger/90 transition">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Report Emergency</span>
            </a>
            <a href="/cases" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <Clock className="w-5 h-5 text-astro-sand" />
              <span className="font-medium text-astro-dark">View Cases</span>
            </a>
            <a href="/map" className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              <Dog className="w-5 h-5 text-astro-sand" />
              <span className="font-medium text-astro-dark">Live Map</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof Dog; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-astro-sand">{label}</span>
      </div>
      <p className="text-3xl font-bold text-astro-dark">{value}</p>
    </div>
  );
}
