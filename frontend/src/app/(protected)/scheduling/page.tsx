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

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aircraft Scheduling</h1>
          <p className="text-gray-500 text-sm mt-0.5">Click a time slot to book. Blue = your bookings.</p>
        </div>
        <button
          onClick={() => setShowAddAircraft(true)}
          className="text-sm border border-gray-200 hover:border-gray-300 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Aircraft
        </button>
      </div>

      {aircraft.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
          No aircraft added yet. Add an aircraft above before booking.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <BookingCalendar />
      </div>

      {showAddAircraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Add Aircraft</h2>
            <form onSubmit={handleAddAircraft} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tail Number *</label>
                  <input
                    required
                    value={form.tail_number}
                    onChange={(e) => setForm((p) => ({ ...p, tail_number: e.target.value }))}
                    className={`${inputCls} uppercase`}
                    placeholder="N12345"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Make *</label>
                  <input
                    required
                    value={form.make}
                    onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))}
                    className={inputCls}
                    placeholder="Cessna"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Aircraft'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAircraft(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:border-gray-300 transition-colors"
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
