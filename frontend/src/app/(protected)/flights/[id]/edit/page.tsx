'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Flight } from '@/types';
import FlightForm from '@/components/FlightForm';

export default function EditFlightPage() {
  const { id } = useParams<{ id: string }>();
  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/flights/${id}`)
      .then((r) => setFlight(r.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!flight) {
    return <p className="text-red-500">Flight not found.</p>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Edit Flight</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <FlightForm initialData={flight} flightId={flight.id} />
      </div>
    </div>
  );
}
