'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Flight, Booking } from '@/types';

const statCards = [
  {
    key: 'hours',
    label: 'Total Hours',
    color: 'blue',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'flights',
    label: 'Total Flights',
    color: 'green',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
      </svg>
    ),
  },
  {
    key: 'bookings',
    label: 'Upcoming Bookings',
    color: 'purple',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const colorMap: Record<string, string> = {
  blue:   'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-blue-100 dark:ring-blue-800',
  green:  'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 ring-emerald-100 dark:ring-emerald-800',
  purple: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 ring-violet-100 dark:ring-violet-800',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/flights'), api.get('/bookings')])
      .then(([f, b]) => { setFlights(f.data); setBookings(b.data); })
      .finally(() => setLoading(false));
  }, []);

  const totalHours = flights.reduce((s, f) => s + f.total_time, 0);
  const upcomingBookings = bookings.filter(
    (b) => new Date(b.start_time) > new Date() && b.status === 'confirmed'
  );
  const recentFlights = flights.slice(0, 5);

  const statValues: Record<string, string | number> = {
    hours: totalHours.toFixed(1),
    flights: flights.length,
    bookings: upcomingBookings.length,
  };

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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {user?.full_name ? `Welcome back, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Here&apos;s your flying summary</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ key, label, color, icon }) => (
          <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex items-center gap-4">
            <div className={`p-3 rounded-xl ring-1 ${colorMap[color]}`}>{icon}</div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{statValues[key]}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent flights */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Flights</h2>
            <Link href="/flights" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View all →
            </Link>
          </div>
          {recentFlights.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">✈</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">No flights logged yet.</p>
              <Link href="/flights/new" className="text-blue-600 text-sm font-medium hover:underline mt-1 inline-block">
                Log your first flight
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {recentFlights.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{f.departure} → {f.destination}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{format(new Date(f.date), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{f.total_time.toFixed(1)}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Upcoming Bookings</h2>
            <Link href="/scheduling" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              View calendar →
            </Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">No upcoming bookings.</p>
              <Link href="/scheduling" className="text-blue-600 text-sm font-medium hover:underline mt-1 inline-block">
                Schedule an aircraft
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {upcomingBookings.slice(0, 5).map((b) => (
                <li key={b.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-violet-500 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{b.purpose || 'Flight booking'}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {format(new Date(b.start_time), 'MMM d · h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
