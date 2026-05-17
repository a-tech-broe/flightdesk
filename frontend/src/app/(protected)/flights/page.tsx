'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Flight } from '@/types';

async function exportPDF(flights: Flight[], totalHours: number) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('FlightDesk — Pilot Logbook', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${format(new Date(), 'MMMM d, yyyy')} · ${flights.length} entries · ${totalHours.toFixed(1)} total hours`, 14, 26);

  const totalPIC = flights.reduce((s, f) => s + f.pic_time, 0);
  const totalNight = flights.reduce((s, f) => s + f.night, 0);
  const totalIFR = flights.reduce((s, f) => s + f.instrument, 0);
  const totalXC = flights.reduce((s, f) => s + f.cross_country, 0);
  const totalLdg = flights.reduce((s, f) => s + f.day_landings + f.night_landings, 0);
  const totalAppr = flights.reduce((s, f) => s + (f.instrument_approaches ?? 0), 0);

  autoTable(doc, {
    startY: 32,
    head: [['Date', 'From', 'To', 'Total', 'PIC', 'Dual', 'Night', 'IFR', 'X-C', 'Day Ldg', 'Night Ldg', 'Appr.', 'Remarks']],
    body: flights.map((f) => [
      format(new Date(f.date), 'yyyy-MM-dd'),
      f.departure,
      f.destination,
      f.total_time.toFixed(1),
      f.pic_time.toFixed(1),
      f.dual_received.toFixed(1),
      f.night.toFixed(1),
      f.instrument.toFixed(1),
      f.cross_country.toFixed(1),
      f.day_landings,
      f.night_landings,
      f.instrument_approaches ?? 0,
      f.notes ?? '',
    ]),
    foot: [['TOTALS', '', '', totalHours.toFixed(1), totalPIC.toFixed(1), '', totalNight.toFixed(1), totalIFR.toFixed(1), totalXC.toFixed(1), '', totalLdg, totalAppr, '']],
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 12: { cellWidth: 40 } },
    margin: { left: 14, right: 14 },
  });

  doc.save(`FlightDesk_Logbook_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export default function FlightsPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this flight entry?')) return;
    await api.delete(`/flights/${id}`);
    setFlights((prev) => prev.filter((f) => f.id !== id));
  };

  const handleExport = async () => {
    setExporting(true);
    try { await exportPDF(flights, totalHours); }
    finally { setExporting(false); }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Flight Log</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {flights.length} {flights.length === 1 ? 'entry' : 'entries'} · {totalHours.toFixed(1)} total hours
          </p>
        </div>
        <div className="flex items-center gap-2">
          {flights.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              {exporting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          )}
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
      </div>

      {flights.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 sm:p-16 text-center">
          <div className="text-5xl mb-4">✈</div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">No flights logged yet</h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Start building your logbook today.</p>
          <Link href="/flights/new" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Log your first flight
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  {['Date', 'Route', 'Total', 'PIC', 'Night', 'IFR', 'Appr.', 'Ldg', ''].map((h) => (
                    <th key={h} className={`px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide ${h === '' || h === 'Total' || h === 'PIC' || h === 'Night' || h === 'IFR' || h === 'Appr.' || h === 'Ldg' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {flights.map((f) => (
                  <tr key={f.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors group">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {format(new Date(f.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{f.departure}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-1.5">→</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{f.destination}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{f.total_time.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.pic_time.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.night.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.instrument.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.instrument_approaches ?? 0}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{f.day_landings + f.night_landings}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/flights/${f.id}/edit`} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">Edit</Link>
                        <button onClick={() => handleDelete(f.id)} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide" colSpan={2}>Totals</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700 dark:text-blue-400">{totalHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{flights.reduce((s, f) => s + f.pic_time, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{flights.reduce((s, f) => s + f.night, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{flights.reduce((s, f) => s + f.instrument, 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{flights.reduce((s, f) => s + (f.instrument_approaches ?? 0), 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">{flights.reduce((s, f) => s + f.day_landings + f.night_landings, 0)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {flights.map((f) => (
              <div key={f.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{f.departure} → {f.destination}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{format(new Date(f.date), 'MMM d, yyyy')}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{f.total_time.toFixed(1)}h</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  {[
                    { label: 'PIC', value: f.pic_time.toFixed(1) },
                    { label: 'Night', value: f.night.toFixed(1) },
                    { label: 'IFR', value: f.instrument.toFixed(1) },
                    { label: 'Ldg', value: String(f.day_landings + f.night_landings) },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 dark:bg-gray-800 rounded-lg py-2">
                      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Link href={`/flights/${f.id}/edit`} className="flex-1 text-center text-xs text-blue-600 font-semibold py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">Edit</Link>
                  <button onClick={() => handleDelete(f.id)} className="flex-1 text-xs text-red-500 font-semibold py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
