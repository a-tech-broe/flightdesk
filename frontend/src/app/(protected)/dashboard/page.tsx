'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Flight, Booking } from '@/types';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/flights'), api.get('/bookings')])
      .then(([f, b]) => {
        setFlights(f.data);
        setBookings(b.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalHours = flights.reduce((sum, f) => sum + f.total_time, 0);
  const recentFlights = flights.slice(0, 5);
  const upcomingBookings = bookings
    .filter((b) => new Date(b.start_time) > new Date() && b.status === 'confirmed')
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s your flying summary</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Hours" value={totalHours.toFixed(1)} />
        <StatCard label="Total Flights" value={flights.length} />
        <StatCard label="Upcoming Bookings" value={upcomingBookings.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Recent Flights</h2>
            <Link href="/flights" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          {recentFlights.length === 0 ? (
            <p className="text-gray-400 text-sm">No flights logged yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recentFlights.map((f) => (
                <li key={f.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {f.departure} → {f.destination}
                    </p>
                    <p className="text-xs text-gray-400">{format(new Date(f.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{f.total_time.toFixed(1)}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Upcoming Bookings</h2>
            <Link href="/scheduling" className="text-sm text-blue-600 hover:underline">
              View calendar
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className="text-gray-400 text-sm">No upcoming bookings.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="py-3">
                  <p className="text-sm font-medium text-slate-700">
                    {b.purpose || 'Flight booking'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(b.start_time), 'MMM d, yyyy h:mm a')} –{' '}
                    {format(new Date(b.end_time), 'h:mm a')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
