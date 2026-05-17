'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Flight } from '@/types';

interface AirportCoord {
  lat: number;
  lon: number;
  name: string;
}

async function fetchCoords(icaos: string[]): Promise<Record<string, AirportCoord>> {
  const unique = Array.from(new Set(icaos)).filter((c) => c.length >= 3);
  if (unique.length === 0) return {};
  const results: Record<string, AirportCoord> = {};
  // Batch in groups of 50
  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    try {
      const res = await fetch(
        `https://aviationweather.gov/api/data/airport?ids=${batch.join(',')}&format=json`
      );
      const data: { icaoId: string; lat: number; lon: number; name?: string }[] = await res.json();
      for (const ap of data) {
        if (ap.lat && ap.lon) {
          results[ap.icaoId] = { lat: ap.lat, lon: ap.lon, name: ap.name ?? ap.icaoId };
        }
      }
    } catch { /* skip batch on error */ }
  }
  return results;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AutoFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

export default function FlightMap({ flights }: { flights: Flight[] }) {
  const [coords, setCoords] = useState<Record<string, AirportCoord>>({});
  const [loadingCoords, setLoadingCoords] = useState(true);

  useEffect(() => {
    const icaos = flights.flatMap((f) => [f.departure, f.destination]);
    fetchCoords(icaos).then((c) => { setCoords(c); setLoadingCoords(false); });
  }, [flights]);

  const airportCounts: Record<string, number> = {};
  flights.forEach((f) => {
    airportCounts[f.departure] = (airportCounts[f.departure] || 0) + 1;
    airportCounts[f.destination] = (airportCounts[f.destination] || 0) + 1;
  });

  const routes = flights
    .map((f) => ({
      from: coords[f.departure],
      to: coords[f.destination],
      flight: f,
    }))
    .filter((r) => r.from && r.to && !(r.from.lat === r.to.lat && r.from.lon === r.to.lon));

  const airports = Object.entries(coords);

  const allPositions: [number, number][] = airports.map(([, c]) => [c.lat, c.lon]);

  // Furthest flight
  let furthestDist = 0;
  let furthestFlight: Flight | null = null;
  routes.forEach((r) => {
    const dist = haversineNm(r.from.lat, r.from.lon, r.to.lat, r.to.lon);
    if (dist > furthestDist) { furthestDist = dist; furthestFlight = r.flight; }
  });

  if (loadingCoords) {
    return (
      <div className="flex flex-col items-center justify-center h-64 sm:h-96 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Loading airport coordinates…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Airports Visited', value: airports.length },
          { label: 'Unique Routes', value: routes.length },
          { label: 'Furthest Flight', value: furthestFlight ? `${Math.round(furthestDist)} NM` : '—' },
          { label: 'Most Visited', value: Object.entries(airportCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 h-64 sm:h-96 lg:h-[520px]">
        <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {allPositions.length > 0 && <AutoFit positions={allPositions} />}

          {/* Routes */}
          {routes.map((r, i) => (
            <Polyline
              key={i}
              positions={[[r.from.lat, r.from.lon], [r.to.lat, r.to.lon]]}
              pathOptions={{ color: '#2563eb', weight: 2, opacity: 0.55 }}
            />
          ))}

          {/* Airport markers */}
          {airports.map(([icao, ap]) => {
            const count = airportCounts[icao] ?? 0;
            const radius = Math.min(4 + count * 1.5, 14);
            return (
              <CircleMarker
                key={icao}
                center={[ap.lat, ap.lon]}
                radius={radius}
                pathOptions={{ color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85, weight: 1.5 }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{icao}</p>
                    <p className="text-gray-500 text-xs">{ap.name}</p>
                    <p className="mt-1">{count} operation{count !== 1 ? 's' : ''}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Click airports for details · Dot size indicates visit frequency
      </p>
    </div>
  );
}
