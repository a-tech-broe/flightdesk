'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Flight } from '@/types';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this flight entry?')) return;
    await api.delete(`/flights/${id}`);
    setFlights((prev) => prev.filter((f) => f.id !== id));
  };

  const totalHours = flights.reduce((s, f) => s + f.total_time, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Flight Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {flights.length} {flights.length === 1 ? 'entry' : 'entries'} · {totalHours.toFixed(1)} total hours
          </p>
        </div>
        <Link
          href="/flights/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Log Flight
        </Link>
      </div>

      {flights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">✈</div>
          <h3 className="font-semibold text-slate-700 mb-1">No flights logged yet</h3>
          <p className="text-gray-400 text-sm mb-4">Start building your logbook today.</p>
          <Link
            href="/flights/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            Log your first flight
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {['Date', 'Route', 'Total', 'PIC', 'Night', 'Inst.', 'Ldg', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide ${h === '' || h === 'Total' || h === 'PIC' || h === 'Night' || h === 'Inst.' || h === 'Ldg' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {flights.map((f) => (
                  <tr key={f.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {format(new Date(f.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{f.departure}</span>
                      <span className="text-gray-400 mx-1.5">→</span>
                      <span className="font-semibold text-slate-800">{f.destination}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{f.total_time.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{f.pic_time.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{f.night.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{f.instrument.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{f.day_landings + f.night_landings}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/flights/${f.id}/edit`} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50">
                          Edit
                        </Link>
                        <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-gray-200">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{totalHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{flights.reduce((s, f) => s + f.pic_time, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{flights.reduce((s, f) => s + f.night, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{flights.reduce((s, f) => s + f.instrument, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">{flights.reduce((s, f) => s + f.day_landings + f.night_landings, 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {flights.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-800">
                      {f.departure} → {f.destination}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(new Date(f.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{f.total_time.toFixed(1)}h</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  {[
                    { label: 'PIC', value: f.pic_time },
                    { label: 'Night', value: f.night },
                    { label: 'Inst.', value: f.instrument },
                    { label: 'Ldg', value: f.day_landings + f.night_landings, fixed: 0 },
                  ].map(({ label, value, fixed = 1 }) => (
                    <div key={label} className="bg-slate-50 rounded-lg py-2">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-semibold text-slate-700">{typeof value === 'number' ? (fixed === 0 ? value : value.toFixed(1)) : value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link href={`/flights/${f.id}/edit`} className="flex-1 text-center text-xs text-blue-600 font-semibold py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                    Edit
                  </Link>
                  <button onClick={() => handleDelete(f.id)} className="flex-1 text-xs text-red-500 font-semibold py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
