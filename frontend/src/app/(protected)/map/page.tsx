'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Flight } from '@/types';

const FlightMap = dynamic(() => import('@/components/FlightMap'), { ssr: false });

export default function MapPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Route Map</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Every airport you&apos;ve visited, every route you&apos;ve flown
        </p>
      </div>

      {flights.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🗺️</p>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">No flights to map yet</h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm">Log flights to see your routes appear here.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <FlightMap flights={flights} />
        </div>
      )}
    </div>
  );
}
