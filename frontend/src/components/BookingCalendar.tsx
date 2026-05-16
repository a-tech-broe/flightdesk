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

  return (
    <div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {selectedBooking ? 'Edit Booking' : 'New Booking'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Aircraft *</label>
                <select
                  required
                  value={form.aircraft_id}
                  onChange={(e) => setForm((p) => ({ ...p, aircraft_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select aircraft</option>
                  {aircraft.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.tail_number} — {a.make} {a.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.start_time}
                    onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End *</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.end_time}
                    onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Purpose</label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Training, solo, cross-country..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Booking'}
                </button>
                {selectedBooking && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
