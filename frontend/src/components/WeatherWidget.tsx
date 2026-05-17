'use client';

import { useState, useEffect, useRef } from 'react';

interface MetarData {
  icaoId: string;
  rawOb: string;
  fltcat: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  visib: string | null;
}

const catConfig: Record<string, { label: string; color: string; bg: string }> = {
  VFR:  { label: 'VFR',  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  MVFR: { label: 'MVFR', color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/40' },
  IFR:  { label: 'IFR',  color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-900/40' },
  LIFR: { label: 'LIFR', color: 'text-fuchsia-700 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40' },
};

function useWeather(icao: string) {
  const [data, setData] = useState<MetarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (icao.length < 3) { setData(null); setError(false); return; }

    timerRef.current = setTimeout(async () => {
      setLoading(true); setError(false);
      try {
        const res = await fetch(
          `https://aviationweather.gov/api/data/metar?ids=${icao.toUpperCase()}&format=json`
        );
        const json: MetarData[] = await res.json();
        setData(json?.[0] ?? null);
        if (!json?.[0]) setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [icao]);

  return { data, loading, error };
}

export function WeatherBadge({ icao }: { icao: string }) {
  const { data, loading, error } = useWeather(icao);

  if (icao.length < 3) return null;
  if (loading) return <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">wx…</span>;
  if (error || !data) return <span className="text-xs text-gray-400 dark:text-gray-500">no wx</span>;

  const cfg = catConfig[data.fltcat] ?? catConfig.VFR;
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${cfg.color} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

export default function WeatherWidget({ departure, destination }: { departure: string; destination: string }) {
  const dep = useWeather(departure);
  const dest = useWeather(destination);

  const hasData = dep.data || dest.data;
  const isLoading = (departure.length >= 3 && dep.loading) || (destination.length >= 3 && dest.loading);

  if (!hasData && !isLoading) return null;

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Live Weather</span>
      </div>
      <div className="space-y-2">
        {[{ label: 'Departure', icao: departure, wx: dep }, { label: 'Destination', icao: destination, wx: dest }].map(({ label, icao, wx }) => {
          if (icao.length < 3) return null;
          const cfg = wx.data?.fltcat ? (catConfig[wx.data.fltcat] ?? catConfig.VFR) : null;
          return (
            <div key={label} className="flex items-start gap-2">
              <span className="text-xs text-gray-400 dark:text-gray-500 w-20 shrink-0 pt-0.5">{label}</span>
              {wx.loading && <span className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">loading…</span>}
              {!wx.loading && !wx.data && <span className="text-xs text-gray-400 dark:text-gray-500">no data for {icao.toUpperCase()}</span>}
              {wx.data && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {cfg && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
                        {cfg.label}
                      </span>
                    )}
                    {wx.data.wspd != null && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {wx.data.wdir ?? '?'}°@{wx.data.wspd}kt
                      </span>
                    )}
                    {wx.data.visib && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">vis {wx.data.visib}SM</span>
                    )}
                    {wx.data.temp != null && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">{wx.data.temp}°C</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate font-mono">{wx.data.rawOb}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
