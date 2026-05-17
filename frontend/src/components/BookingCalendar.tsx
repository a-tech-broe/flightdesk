'use client';

import { useEffect, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import api from '@/lib/api';
import { Booking, Aircraft } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function BookingCalendar() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [calView] = useState<string>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'timeGridDay' : 'timeGridWeek'
  );
  const [showModal, setShowModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [form, setForm] = useState({
    aircraft_id: '',
    start_time: '',
    end_time: '',
    purpose: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    Promise.all([api.get('/bookings'), api.get('/aircraft')]).then(([b, a]) => {
      setBookings(b.data);
      setAircraft(a.data);
    });
  }, []);

  useEffect(fetchData, [fetchData]);

  const events = bookings.map((b) => ({
    id: String(b.id),
    title: `${b.purpose || 'Booking'} (${aircraft.find((a) => a.id === b.aircraft_id)?.tail_number ?? '?'})`,
    start: b.start_time,
    end: b.end_time,
    color: b.user_id === user?.id ? '#2563eb' : '#64748b',
  }));

  const openNew = (dateStr: string) => {
    setSelectedBooking(null);
    const start = dateStr.includes('T') ? dateStr : `${dateStr}T09:00`;
    const end = dateStr.includes('T') ? dateStr : `${dateStr}T10:00`;
    setForm({ aircraft_id: aircraft[0]?.id.toString() ?? '', start_time: start, end_time: end, purpose: '', notes: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (booking: Booking) => {
    if (booking.user_id !== user?.id) return;
    setSelectedBooking(booking);
    setForm({
      aircraft_id: String(booking.aircraft_id),
      start_time: booking.start_time.slice(0, 16),
      end_time: booking.end_time.slice(0, 16),
      purpose: booking.purpose ?? '',
      notes: booking.notes ?? '',
    });
    setError('');
    setShowModal(true);
  };

  const handleDateClick = (arg: DateClickArg) => openNew(arg.dateStr);
  const handleEventClick = (arg: EventClickArg) => {
    const b = bookings.find((x) => x.id === Number(arg.event.id));
    if (b) openEdit(b);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        aircraft_id: Number(form.aircraft_id),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        purpose: form.purpose || null,
        notes: form.notes || null,
      };
      if (selectedBooking) {
        await api.put(`/bookings/${selectedBooking.id}`, payload);
      } else {
        await api.post('/bookings', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to save booking.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBooking || !confirm('Cancel this booking?')) return;
    await api.delete(`/bookings/${selectedBooking.id}`);
    setShowModal(false);
    fetchData();
  };

  const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

  return (
    <div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={calView}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {selectedBooking ? 'Edit Booking' : 'New Booking'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Aircraft *</label>
                <select
                  required
                  value={form.aircraft_id}
                  onChange={(e) => setForm((p) => ({ ...p, aircraft_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select aircraft</option>
                  {aircraft.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tail_number} — {a.make} {a.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Start *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">End *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Purpose</label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  className={inputCls}
                  placeholder="Training, solo, cross-country..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className={`${inputCls} resize-none`}
                  placeholder="Additional details..."
                />
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
                  {saving ? 'Saving...' : selectedBooking ? 'Update Booking' : 'Book Slot'}
                </button>
                {selectedBooking && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2.5 text-red-600 hover:text-red-700 border border-red-200 dark:border-red-800 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
