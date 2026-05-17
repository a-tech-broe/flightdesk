'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Aircraft } from '@/types';

const BookingCalendar = dynamic(() => import('@/components/BookingCalendar'), { ssr: false });

export default function SchedulingPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [showAddAircraft, setShowAddAircraft] = useState(false);
  const [form, setForm] = useState({ tail_number: '', make: '', model: '', year: '', category: '', aircraft_class: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAircraft = useCallback(() => {
    api.get('/aircraft').then((r) => setAircraft(r.data));
  }, []);

  useEffect(fetchAircraft, [fetchAircraft]);

  const handleAddAircraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/aircraft', {
        tail_number: form.tail_number.toUpperCase(),
        make: form.make,
        model: form.model,
        year: form.year ? Number(form.year) : null,
        category: form.category || null,
        aircraft_class: form.aircraft_class || null,
      });
      setShowAddAircraft(false);
      setForm({ tail_number: '', make: '', model: '', year: '', category: '', aircraft_class: '' });
      fetchAircraft();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to add aircraft.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Scheduling</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {aircraft.length} {aircraft.length === 1 ? 'aircraft' : 'aircraft'} in fleet · click a slot to book
          </p>
        </div>
        <button
          onClick={() => setShowAddAircraft(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Aircraft
        </button>
      </div>

      {/* Fleet strip */}
      {aircraft.length === 0 ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">No aircraft in fleet yet. Add one above to start booking.</p>
        </div>
      ) : (
        <div className="flex gap-3 flex-wrap">
          {aircraft.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{a.tail_number}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{a.make} {a.model}{a.year ? ` · ${a.year}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <BookingCalendar />
      </div>

      {/* Add Aircraft modal */}
      {showAddAircraft && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Add Aircraft</h2>
              </div>
              <button
                onClick={() => setShowAddAircraft(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddAircraft} className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Tail Number *</label>
                  <input
                    required
                    value={form.tail_number}
                    onChange={(e) => setForm((p) => ({ ...p, tail_number: e.target.value }))}
                    className={`${inputCls} uppercase`}
                    placeholder="N12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Year</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
                    className={inputCls}
                    placeholder="2010"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Make *</label>
                  <input
                    required
                    value={form.make}
                    onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
                    className={inputCls}
                    placeholder="Cessna"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Model *</label>
                  <input
                    required
                    value={form.model}
                    onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                    className={inputCls}
                    placeholder="172S"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select</option>
                    <option>Airplane</option>
                    <option>Helicopter</option>
                    <option>Glider</option>
                    <option>Powered Lift</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Class</label>
                  <select
                    value={form.aircraft_class}
                    onChange={(e) => setForm((p) => ({ ...p, aircraft_class: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select</option>
                    <option>Single-Engine Land</option>
                    <option>Multi-Engine Land</option>
                    <option>Single-Engine Sea</option>
                    <option>Multi-Engine Sea</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                >
                  {saving && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {saving ? 'Adding...' : 'Add Aircraft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAircraft(false)}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
