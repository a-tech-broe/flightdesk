'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Flight } from '@/types';

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlights = () => {
    api.get('/flights')
      .then((r) => setFlights(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(fetchFlights, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this flight?')) return;
    await api.delete(`/flights/${id}`);
    setFlights((prev) => prev.filter((f) => f.id !== id));
  };

  const totalHours = flights.reduce((sum, f) => sum + f.total_time, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Flight Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {flights.length} flights · {totalHours.toFixed(1)} total hours
          </p>
        </div>
        <Link
          href="/flights/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Log Flight
        </Link>
      </div>

      {flights.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400">No flights logged yet.</p>
          <Link href="/flights/new" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Log your first flight
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Route</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">PIC</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Night</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Inst.</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Ldg</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {flights.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(f.date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {f.departure} → {f.destination}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">{f.total_time.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{f.pic_time.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{f.night.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{f.instrument.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {f.day_landings + f.night_landings}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/flights/${f.id}/edit`}
                        className="text-gray-400 hover:text-blue-600 transition-colors text-xs"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(f.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
