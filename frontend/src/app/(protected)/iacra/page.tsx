'use client';

import { useEffect, useState } from 'react';
import { format, subYears } from 'date-fns';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Flight } from '@/types';

// ---------------------------------------------------------------------------
// Certificate definitions — simplified from FAR 61.109 / 61.65 / 61.129 / 61.159
// These are hour minimums only; full eligibility requires CFI sign-off and FAR review.
// ---------------------------------------------------------------------------

interface Requirement {
  label: string;
  field: string;
  min: number;
  unit?: string;
  note?: string;
}

interface Certificate {
  label: string;
  far: string;
  description: string;
  requirements: Requirement[];
}

const CERTIFICATES: Record<string, Certificate> = {
  ppl: {
    label: 'Private Pilot — Airplane (PPL)',
    far: 'FAR 61.109(a)',
    description: 'Minimum aeronautical experience for a private pilot certificate, airplane single-engine land.',
    requirements: [
      { label: 'Total flight time', field: 'total_time', min: 40 },
      { label: 'Flight training (dual)', field: 'dual_received', min: 20 },
      { label: 'Solo flight time', field: 'solo', min: 10 },
      { label: 'Night flight time', field: 'night', min: 3 },
      { label: 'Instrument training (actual + simulated)', field: 'instrument_all', min: 3, note: 'Actual + simulated instrument' },
      { label: 'Cross-country flight training', field: 'cross_country', min: 5 },
      { label: 'Instrument approaches', field: 'instrument_approaches', min: 0, unit: 'appr', note: 'Tracked separately in logbook' },
    ],
  },
  ifr: {
    label: 'Instrument Rating — Airplane (IFR)',
    far: 'FAR 61.65(d)',
    description: 'Minimum aeronautical experience for an instrument rating, airplane.',
    requirements: [
      { label: 'Total flight time as pilot', field: 'total_time', min: 0, note: 'No minimum specified' },
      { label: 'PIC cross-country time', field: 'pic_xc_approx', min: 50, note: '50h PIC cross-country — approximated from cross-country total' },
      { label: 'Instrument time (actual + simulated)', field: 'instrument_all', min: 40, note: 'Actual instrument + simulated instrument (hood/sim)' },
      { label: 'Instrument approaches', field: 'instrument_approaches', min: 6, unit: 'appr' },
    ],
  },
  cpl: {
    label: 'Commercial Pilot — Airplane (CPL)',
    far: 'FAR 61.129(a)',
    description: 'Minimum aeronautical experience for a commercial pilot certificate, airplane single-engine land.',
    requirements: [
      { label: 'Total flight time', field: 'total_time', min: 250 },
      { label: 'Pilot-in-command time', field: 'pic_time', min: 100 },
      { label: 'PIC cross-country time', field: 'pic_xc_approx', min: 50, note: 'Approximated from cross-country total' },
      { label: 'Night flight time', field: 'night', min: 10 },
      { label: 'Instrument time (actual + simulated)', field: 'instrument_all', min: 10 },
      { label: 'Instrument approaches', field: 'instrument_approaches', min: 0, unit: 'appr', note: 'Tracked separately' },
      { label: 'Dual instruction received', field: 'dual_received', min: 0, note: 'Logged per training session' },
    ],
  },
  cfi: {
    label: 'Flight Instructor Certificate (CFI)',
    far: 'FAR 61.183',
    description: 'Aeronautical experience requirements for a flight instructor certificate, airplane.',
    requirements: [
      { label: 'Total flight time', field: 'total_time', min: 0, note: 'Must hold CPL or ATP' },
      { label: 'Pilot-in-command time', field: 'pic_time', min: 0, note: 'Must hold CPL or ATP — see commercial reqs' },
      { label: 'Flight time in category/class', field: 'total_time', min: 200, note: '200h in the aircraft category and class' },
      { label: 'Instrument time (actual + simulated)', field: 'instrument_all', min: 0, note: 'Instrument rating required' },
    ],
  },
  atp: {
    label: 'Airline Transport Pilot (ATP)',
    far: 'FAR 61.159',
    description: 'Minimum aeronautical experience for an airline transport pilot certificate, airplane.',
    requirements: [
      { label: 'Total flight time', field: 'total_time', min: 1500 },
      { label: 'Pilot-in-command time', field: 'pic_time', min: 250 },
      { label: 'Cross-country time', field: 'cross_country', min: 500 },
      { label: 'Night flight time', field: 'night', min: 100 },
      { label: 'Instrument time (actual + simulated)', field: 'instrument_all', min: 75 },
      { label: 'Instrument approaches', field: 'instrument_approaches', min: 0, unit: 'appr', note: 'Tracked separately' },
    ],
  },
};

// ---------------------------------------------------------------------------

function computeHours(flights: Flight[]) {
  const sum = (fn: (f: Flight) => number) => flights.reduce((s, f) => s + fn(f), 0);
  const total_time = sum((f) => f.total_time);
  const pic_time = sum((f) => f.pic_time);
  const dual_received = sum((f) => f.dual_received);
  const night = sum((f) => f.night);
  const instrument = sum((f) => f.instrument);
  const simulated_instrument = sum((f) => f.simulated_instrument ?? 0);
  const cross_country = sum((f) => f.cross_country);
  const solo = sum((f) => f.solo ?? 0);
  const instrument_approaches = sum((f) => f.instrument_approaches ?? 0);
  const instrument_all = instrument + simulated_instrument;
  // Rough approximation: PIC XC ≈ min(pic_time, cross_country)
  const pic_xc_approx = Math.min(pic_time, cross_country);

  return {
    total_time, pic_time, dual_received, night,
    instrument, simulated_instrument, cross_country,
    solo, instrument_approaches, instrument_all, pic_xc_approx,
  };
}

async function generatePDF(
  cert: Certificate,
  hours: ReturnType<typeof computeHours>,
  pilotName: string,
  dateRange: string,
  flightCount: number,
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const today = format(new Date(), 'MMMM d, yyyy');

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text('FAA Form 8710-1 — Aeronautical Experience Summary', 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text(`${cert.label}  ·  ${cert.far}`, 14, 30);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Pilot: ${pilotName || 'N/A'}   ·   Date generated: ${today}   ·   Flights included: ${flightCount}   ·   Period: ${dateRange}`, 14, 38);

  // Requirements table
  autoTable(doc, {
    startY: 46,
    head: [['IACRA / 8710-1 Field', 'Your Hours', 'Minimum Required', 'Status']],
    body: cert.requirements.map((req) => {
      const val = (hours as Record<string, number>)[req.field] ?? 0;
      const unit = req.unit ?? 'h';
      const display = unit === 'appr' ? Math.round(val).toString() : val.toFixed(1);
      const minDisplay = req.min === 0 ? 'See note' : `${req.min}${unit === 'appr' ? ' appr' : 'h'}`;
      const met = req.min === 0 || val >= req.min;
      return [
        req.label + (req.note ? `\n(${req.note})` : ''),
        display + (unit === 'appr' ? ' approaches' : 'h'),
        minDisplay,
        req.min === 0 ? 'Track' : met ? '✓ Met' : '✗ Need ' + ((req.min - val) > 0 ? (req.min - val).toFixed(1) : '0') + (unit === 'appr' ? ' appr' : 'h') + ' more',
      ];
    }),
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 40, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const text = String(data.cell.text);
        if (text.startsWith('✓')) data.cell.styles.textColor = [5, 150, 105];
        else if (text.startsWith('✗')) data.cell.styles.textColor = [220, 38, 38];
        else data.cell.styles.textColor = [100, 116, 139];
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Full logbook totals
  const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY,
    head: [['Complete Logbook Totals (all fields)', '']],
    body: [
      ['Total flight time', hours.total_time.toFixed(1) + 'h'],
      ['Pilot-in-command (PIC)', hours.pic_time.toFixed(1) + 'h'],
      ['Dual instruction received', hours.dual_received.toFixed(1) + 'h'],
      ['Solo flight time', hours.solo.toFixed(1) + 'h'],
      ['Night flight time', hours.night.toFixed(1) + 'h'],
      ['Actual instrument', hours.instrument.toFixed(1) + 'h'],
      ['Simulated instrument (hood)', hours.simulated_instrument.toFixed(1) + 'h'],
      ['Cross-country', hours.cross_country.toFixed(1) + 'h'],
      ['Instrument approaches', Math.round(hours.instrument_approaches) + ' approaches'],
    ],
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 30, halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  // Disclaimer
  const disclaimerY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This report is an informational summary generated by FlightDesk. It does not constitute an official FAA record.',
    14, disclaimerY,
  );
  doc.text(
    'Consult your CFI and the applicable FARs for complete eligibility requirements before submitting an IACRA application.',
    14, disclaimerY + 5,
  );

  doc.save(`IACRA_${cert.label.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

// ---------------------------------------------------------------------------

export default function IacraPage() {
  const { user } = useAuth();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [certKey, setCertKey] = useState('ppl');
  const [dateFilter, setDateFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/flights').then((r) => setFlights(r.data)).finally(() => setLoading(false));
  }, []);

  const filteredFlights = flights.filter((f) => {
    if (dateFilter === 'all') return true;
    const d = new Date(f.date);
    if (dateFilter === '2y') return d >= subYears(new Date(), 2);
    if (dateFilter === '5y') return d >= subYears(new Date(), 5);
    return true;
  });

  const cert = CERTIFICATES[certKey];
  const hours = computeHours(filteredFlights);

  const allMet = cert.requirements.every((r) => {
    if (r.min === 0) return true;
    return ((hours as Record<string, number>)[r.field] ?? 0) >= r.min;
  });

  const metCount = cert.requirements.filter((r) => {
    if (r.min === 0) return true;
    return ((hours as Record<string, number>)[r.field] ?? 0) >= r.min;
  }).length;

  const dateRangeLabel = dateFilter === 'all' ? 'All time' : dateFilter === '2y' ? 'Last 2 years' : 'Last 5 years';

  const handleExport = async () => {
    setExporting(true);
    try {
      await generatePDF(cert, hours, user?.full_name || user?.email || '', dateRangeLabel, filteredFlights.length);
    } finally {
      setExporting(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">IACRA Export</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Pre-fill your FAA Form 8710-1 from your FlightDesk logbook
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl px-5 py-4">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-0.5">How to use this</p>
          <p>Select your certificate, download the PDF, then open <span className="font-mono">iacra.faa.gov</span> and copy your hours field-by-field. IACRA has no public API — this is the next best thing. Always have your CFI review before submitting.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Certificate / Rating</label>
          <select
            value={certKey}
            onChange={(e) => setCertKey(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            {Object.entries(CERTIFICATES).map(([key, c]) => (
              <option key={key} value={key}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Time Period</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          >
            <option value="all">All time</option>
            <option value="5y">Last 5 years</option>
            <option value="2y">Last 2 years</option>
          </select>
        </div>
      </div>

      {/* Certificate info + overall status */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{cert.label}</h2>
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{cert.far}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cert.description}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {filteredFlights.length} flights · {dateRangeLabel}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              allMet
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            }`}>
              {allMet ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Hour Requirements Met</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" /></svg> {metCount}/{cert.requirements.length} Requirements Met</>
              )}
            </div>
          </div>
        </div>

        {/* Requirements table */}
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">IACRA / 8710-1 Field</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Your Hours</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Minimum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {cert.requirements.map((req) => {
                const val = (hours as Record<string, number>)[req.field] ?? 0;
                const unit = req.unit ?? 'h';
                const display = unit === 'appr' ? Math.round(val) : val.toFixed(1);
                const met = req.min === 0 || val >= req.min;
                const deficit = req.min > 0 ? Math.max(0, req.min - val) : 0;
                return (
                  <tr key={req.label} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-700 dark:text-slate-300">{req.label}</p>
                      {req.note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{req.note}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                      {display}{unit === 'appr' ? ' appr' : 'h'}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                      {req.min === 0 ? '—' : `${req.min}${unit === 'appr' ? ' appr' : 'h'}`}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {req.min === 0 ? (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Track</span>
                      ) : met ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          Met
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          Need {unit === 'appr' ? Math.ceil(deficit) + ' more appr' : deficit.toFixed(1) + 'h more'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full logbook summary */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Complete Logbook Totals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Total Time', value: hours.total_time.toFixed(1) + 'h' },
            { label: 'PIC', value: hours.pic_time.toFixed(1) + 'h' },
            { label: 'Dual Received', value: hours.dual_received.toFixed(1) + 'h' },
            { label: 'Solo', value: hours.solo.toFixed(1) + 'h' },
            { label: 'Night', value: hours.night.toFixed(1) + 'h' },
            { label: 'Actual Instrument', value: hours.instrument.toFixed(1) + 'h' },
            { label: 'Simulated Instrument', value: hours.simulated_instrument.toFixed(1) + 'h' },
            { label: 'Cross-Country', value: hours.cross_country.toFixed(1) + 'h' },
            { label: 'Instrument Approaches', value: Math.round(hours.instrument_approaches) + ' appr' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 dark:bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
              <p className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export + disclaimer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xl">
          <strong className="text-gray-500 dark:text-gray-400">Disclaimer:</strong> This is an informational summary only. It does not constitute an official FAA record. Always have your CFI review your logbook before submitting an IACRA application. Full eligibility requirements are in the applicable FARs.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting || flights.length === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm whitespace-nowrap"
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
          {exporting ? 'Generating PDF…' : 'Download 8710 Summary PDF'}
        </button>
      </div>
    </div>
  );
}
