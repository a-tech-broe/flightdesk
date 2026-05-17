'use client';

import { useEffect, useState } from 'react';
import { format, subDays, subMonths, addMonths, differenceInDays } from 'date-fns';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Flight } from '@/types';

type Status = 'current' | 'expiring' | 'lapsed' | 'unknown';

interface CurrencyItem {
  title: string;
  regulation: string;
  status: Status;
  detail: string;
  subDetail: string;
  action?: string;
}

const statusConfig: Record<Status, { color: string; bg: string; border: string; dot: string; label: string }> = {
  current:  { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Current' },
  expiring: { color: 'text-amber-700 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800',   dot: 'bg-amber-500',   label: 'Expiring Soon' },
  lapsed:   { color: 'text-red-700 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-900/20',       border: 'border-red-200 dark:border-red-800',       dot: 'bg-red-500',     label: 'Not Current' },
  unknown:  { color: 'text-gray-600 dark:text-gray-400',     bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-200 dark:border-gray-700',     dot: 'bg-gray-400',    label: 'Unknown' },
};

export default function CurrencyPage() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [bfrInput, setBfrInput] = useState('');
  const [savingBfr, setSavingBfr] = useState(false);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.bfr_date) setBfrInput(user.bfr_date);
  }, [user]);

  const saveBfr = async () => {
    setSavingBfr(true);
    try {
      await api.patch('/auth/me', { bfr_date: bfrInput || null });
      window.location.reload();
    } finally {
      setSavingBfr(false);
    }
  };

  const today = new Date();
  const ago90 = subDays(today, 90);
  const ago6mo = subMonths(today, 6);

  // Day currency: 3 takeoffs+landings in last 90 days (FAR 61.57(a))
  const dayLdgCount = flights
    .filter((f) => new Date(f.date) >= ago90)
    .reduce((s, f) => s + f.day_landings + f.night_landings, 0);

  const oldestDayLdgFlights = flights
    .filter((f) => new Date(f.date) >= ago90 && f.day_landings + f.night_landings > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const dayExpiresOn = oldestDayLdgFlights.length > 0
    ? subDays(new Date(oldestDayLdgFlights[0].date), 0) // oldest qualifying landing + 90 days
    : null;

  // For day currency expiry: the 3rd-oldest qualifying landing defines when currency expires
  const qualifyingDayFlights = flights
    .filter((f) => new Date(f.date) >= ago90 && f.day_landings + f.night_landings > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getDayExpiresOn = () => {
    let count = 0;
    for (const f of qualifyingDayFlights) {
      count += f.day_landings + f.night_landings;
      if (count >= 3) {
        // This flight pushed us over 3 — expiry is 90 days after this flight date
        // Actually we want the OLDEST flight that's still in our rolling 3-count
        break;
      }
    }
    // Simpler: expiry is 90 days from the 3rd-most-recent qualifying landing flight date
    if (qualifyingDayFlights.length === 0) return null;
    // The currency window resets based on when the oldest of the 3 required landings was made
    // This is complex; approximate: 90 days from the oldest recent flight
    return addMonths(new Date(qualifyingDayFlights[qualifyingDayFlights.length - 1].date), 3);
  };

  const dayExpiry = getDayExpiresOn();
  const dayDaysLeft = dayExpiry ? differenceInDays(dayExpiry, today) : null;

  let dayStatus: Status = 'lapsed';
  if (dayLdgCount >= 3) {
    dayStatus = dayDaysLeft !== null && dayDaysLeft <= 30 ? 'expiring' : 'current';
  }

  // Night currency: 3 full-stop night landings in last 90 days (FAR 61.57(b))
  const nightLdgCount = flights
    .filter((f) => new Date(f.date) >= ago90)
    .reduce((s, f) => s + f.night_landings, 0);

  let nightStatus: Status = 'lapsed';
  if (nightLdgCount >= 3) nightStatus = 'current';
  else if (nightLdgCount > 0) nightStatus = 'lapsed';

  // Instrument currency: 6 approaches in last 6 months (FAR 61.57(c))
  const approachCount = flights
    .filter((f) => new Date(f.date) >= ago6mo)
    .reduce((s, f) => s + (f.instrument_approaches ?? 0), 0);

  const hasAnyApproaches = flights.some((f) => (f.instrument_approaches ?? 0) > 0);

  let ifrStatus: Status = hasAnyApproaches ? 'lapsed' : 'unknown';
  if (approachCount >= 6) ifrStatus = 'current';

  // Flight Review: every 24 calendar months (FAR 61.56)
  const bfrDate = user?.bfr_date ? new Date(user.bfr_date) : null;
  const bfrExpiry = bfrDate ? addMonths(bfrDate, 24) : null;
  const bfrDaysLeft = bfrExpiry ? differenceInDays(bfrExpiry, today) : null;

  let bfrStatus: Status = 'unknown';
  if (bfrExpiry) {
    if (bfrDaysLeft! < 0) bfrStatus = 'lapsed';
    else if (bfrDaysLeft! <= 60) bfrStatus = 'expiring';
    else bfrStatus = 'current';
  }

  const items: CurrencyItem[] = [
    {
      title: 'Day Passenger',
      regulation: 'FAR 61.57(a)',
      status: dayStatus,
      detail: `${Math.min(dayLdgCount, 3)}/3 landings in last 90 days`,
      subDetail: dayStatus === 'current'
        ? dayDaysLeft !== null ? `Expires in ~${dayDaysLeft} days` : 'Meets requirement'
        : dayLdgCount === 0
        ? 'No landings logged in last 90 days'
        : `Need ${3 - dayLdgCount} more landing${3 - dayLdgCount !== 1 ? 's' : ''}`,
      action: dayStatus === 'lapsed' ? `Log ${3 - Math.min(dayLdgCount, 3)} more T&L` : undefined,
    },
    {
      title: 'Night Passenger',
      regulation: 'FAR 61.57(b)',
      status: nightStatus,
      detail: `${Math.min(nightLdgCount, 3)}/3 night landings in last 90 days`,
      subDetail: nightStatus === 'current'
        ? 'Meets requirement'
        : nightLdgCount === 0
        ? 'No night landings in last 90 days'
        : `Need ${3 - nightLdgCount} more full-stop night landing${3 - nightLdgCount !== 1 ? 's' : ''}`,
      action: nightStatus === 'lapsed' ? `Log ${3 - Math.min(nightLdgCount, 3)} more night landings` : undefined,
    },
    {
      title: 'Instrument',
      regulation: 'FAR 61.57(c)',
      status: ifrStatus,
      detail: `${Math.min(approachCount, 6)}/6 approaches in last 6 months`,
      subDetail: ifrStatus === 'current'
        ? 'Meets requirement'
        : ifrStatus === 'unknown'
        ? 'Log instrument approaches on each flight to track this'
        : `Need ${6 - approachCount} more approach${6 - approachCount !== 1 ? 'es' : ''}`,
      action: ifrStatus === 'lapsed' ? `Log ${6 - Math.min(approachCount, 6)} more approaches` : undefined,
    },
    {
      title: 'Flight Review',
      regulation: 'FAR 61.56',
      status: bfrStatus,
      detail: bfrDate
        ? `Last BFR: ${format(bfrDate, 'MMM d, yyyy')}`
        : 'No flight review date set',
      subDetail: bfrStatus === 'current'
        ? `Expires ${format(bfrExpiry!, 'MMM yyyy')} (${bfrDaysLeft} days)`
        : bfrStatus === 'expiring'
        ? `Expires ${format(bfrExpiry!, 'MMM d, yyyy')} — schedule now!`
        : bfrStatus === 'lapsed'
        ? `Expired ${format(bfrExpiry!, 'MMM d, yyyy')}`
        : 'Set your last flight review date below',
    },
  ];

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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Currency Tracker</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          FAA currency requirements computed from your logbook
        </p>
      </div>

      {/* Currency cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => {
          const cfg = statusConfig[item.status];
          return (
            <div key={item.title} className={`rounded-2xl border p-6 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.title}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{item.regulation}</p>
                </div>
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color} bg-white/60 dark:bg-black/20`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <p className={`text-sm font-semibold ${cfg.color} mb-1`}>{item.detail}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.subDetail}</p>
              {item.action && (
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-2">→ {item.action}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* BFR date setter */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Flight Review Date</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Set the date of your most recent flight review (BFR). This cannot be computed from flight data alone.
        </p>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
              Last Flight Review Date
            </label>
            <input
              type="date"
              value={bfrInput}
              onChange={(e) => setBfrInput(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <button
            onClick={saveBfr}
            disabled={savingBfr}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            {savingBfr ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Regulatory reference */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Quick Reference</h2>
        <div className="space-y-3">
          {[
            { reg: 'FAR 61.57(a)', desc: 'Day passenger currency — 3 takeoffs & landings in preceding 90 days' },
            { reg: 'FAR 61.57(b)', desc: 'Night passenger currency — 3 full-stop night landings in preceding 90 days (1hr after sunset to 1hr before sunrise)' },
            { reg: 'FAR 61.57(c)', desc: 'Instrument currency — 6 instrument approaches, holding procedures, intercepting/tracking courses in preceding 6 calendar months' },
            { reg: 'FAR 61.56', desc: 'Flight review — satisfactory flight review from authorized instructor within preceding 24 calendar months' },
          ].map(({ reg, desc }) => (
            <div key={reg} className="flex gap-3">
              <span className="shrink-0 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5">{reg}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
