'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api from '@/lib/api';
import { Flight } from '@/types';

const RATING_GOALS = [
  { label: 'Private Pilot (PPL)', hours: 40, color: 'bg-blue-500' },
  { label: 'Instrument Rating (IFR)', hours: 50, color: 'bg-violet-500', ifrHours: true },
  { label: 'Commercial Pilot (CPL)', hours: 250, color: 'bg-emerald-500' },
  { label: 'ATP Certificate', hours: 1500, color: 'bg-amber-500' },
];

const BREAKDOWN_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

export default function AnalyticsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  // Hours by month — last 12 months
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const hours = flights
      .filter((f) => {
        const d = new Date(f.date);
        return d >= start && d <= end;
      })
      .reduce((s, f) => s + f.total_time, 0);
    return { month: format(month, 'MMM'), hours: parseFloat(hours.toFixed(1)) };
  });

  // Time breakdown for pie chart
  const totalTime = flights.reduce((s, f) => s + f.total_time, 0);
  const totalPIC = flights.reduce((s, f) => s + f.pic_time, 0);
  const totalNight = flights.reduce((s, f) => s + f.night, 0);
  const totalIFR = flights.reduce((s, f) => s + f.instrument, 0);
  const totalXC = flights.reduce((s, f) => s + f.cross_country, 0);
  const totalDual = flights.reduce((s, f) => s + f.dual_received, 0);

  const breakdownData = [
    { name: 'PIC', value: parseFloat(totalPIC.toFixed(1)) },
    { name: 'Night', value: parseFloat(totalNight.toFixed(1)) },
    { name: 'IFR', value: parseFloat(totalIFR.toFixed(1)) },
    { name: 'Cross-Country', value: parseFloat(totalXC.toFixed(1)) },
    { name: 'Dual Received', value: parseFloat(totalDual.toFixed(1)) },
  ].filter((d) => d.value > 0);

  // Top airports
  const airportCounts: Record<string, number> = {};
  flights.forEach((f) => {
    airportCounts[f.departure] = (airportCounts[f.departure] || 0) + 1;
    airportCounts[f.destination] = (airportCounts[f.destination] || 0) + 1;
  });
  const topAirports = Object.entries(airportCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);
  const maxCount = topAirports[0]?.[1] ?? 1;

  // Recent activity
  const now = new Date();
  const last30 = flights.filter((f) => new Date(f.date) >= subMonths(now, 1)).reduce((s, f) => s + f.total_time, 0);
  const last90 = flights.filter((f) => {
    const d = new Date(f.date);
    const ago90 = new Date(now); ago90.setDate(ago90.getDate() - 90);
    return d >= ago90;
  }).reduce((s, f) => s + f.total_time, 0);
  const lastYear = flights.filter((f) => new Date(f.date) >= subMonths(now, 12)).reduce((s, f) => s + f.total_time, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-4xl">📊</p>
        <p className="text-slate-700 dark:text-slate-300 font-semibold">No flight data yet</p>
        <p className="text-gray-400 dark:text-gray-500 text-sm">Log some flights to see your analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {flights.length} flights · {totalTime.toFixed(1)} total hours
        </p>
      </div>

      {/* Recent activity strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Last 30 Days', value: last30.toFixed(1) + 'h' },
          { label: 'Last 90 Days', value: last90.toFixed(1) + 'h' },
          { label: 'Last 12 Months', value: lastYear.toFixed(1) + 'h' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 text-center">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Monthly hours chart */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-6">Hours per Month</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--tooltip-bg, #fff)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px' }}
              cursor={{ fill: 'rgba(37,99,235,0.06)' }}
              formatter={(v) => [`${v}h`, 'Hours']}
            />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.hours > 0 ? '#2563eb' : '#e2e8f0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Hours Breakdown</h2>
          {breakdownData.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No categorized hours yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={breakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {breakdownData.map((_, i) => (
                    <Cell key={i} fill={BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '13px' }}
                  formatter={(v) => [`${v}h`, '']}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top airports */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Airports</h2>
          {topAirports.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-8">No airports logged yet</p>
          ) : (
            <div className="space-y-3">
              {topAirports.map(([icao, count]) => (
                <div key={icao} className="flex items-center gap-3">
                  <span className="w-14 font-bold text-sm text-slate-700 dark:text-slate-300 font-mono">{icao}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-gray-500 dark:text-gray-400 font-medium">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating progress */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Rating Progress</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">Based on total flight time (simplified — actual requirements vary)</p>
        <div className="space-y-5">
          {RATING_GOALS.map(({ label, hours, color, ifrHours }) => {
            const current = ifrHours ? Math.min(totalIFR, hours) : Math.min(totalTime, hours);
            const pct = Math.min((current / hours) * 100, 100);
            return (
              <div key={label}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {current.toFixed(0)} / {hours}h
                    {pct >= 100 && <span className="text-emerald-500 font-semibold ml-1">✓ Eligible</span>}
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${color} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
