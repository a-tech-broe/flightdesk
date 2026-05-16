'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Flight, Aircraft } from '@/types';

interface Props {
  initialData?: Partial<Flight>;
  flightId?: number;
}

const defaultForm = {
  date: new Date().toISOString().split('T')[0],
  departure: '',
  destination: '',
  aircraft_id: '',
  departure_time: '',
  arrival_time: '',
  total_time: '',
  pic_time: '',
  dual_received: '',
  night: '',
  instrument: '',
  cross_country: '',
  day_landings: '',
  night_landings: '',
  notes: '',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function FlightForm({ initialData, flightId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ ...defaultForm, ...toFormValues(initialData) });
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/aircraft').then((r) => setAircraft(r.data));
  }, []);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        departure: form.departure.toUpperCase(),
        destination: form.destination.toUpperCase(),
        aircraft_id: form.aircraft_id ? Number(form.aircraft_id) : null,
        departure_time: form.departure_time || null,
        arrival_time: form.arrival_time || null,
        total_time: Number(form.total_time) || 0,
        pic_time: Number(form.pic_time) || 0,
        dual_received: Number(form.dual_received) || 0,
        night: Number(form.night) || 0,
        instrument: Number(form.instrument) || 0,
        cross_country: Number(form.cross_country) || 0,
        day_landings: Number(form.day_landings) || 0,
        night_landings: Number(form.night_landings) || 0,
        notes: form.notes || null,
      };

      if (flightId) {
        await api.put(`/flights/${flightId}`, payload);
      } else {
        await api.post('/flights', payload);
      }
      router.push('/flights');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Failed to save flight.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date *">
          <input type="date" required value={form.date} onChange={set('date')} className={inputCls} />
        </Field>
        <Field label="Aircraft">
          <select value={form.aircraft_id} onChange={set('aircraft_id')} className={inputCls}>
            <option value="">Select aircraft</option>
            {aircraft.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tail_number} — {a.make} {a.model}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Departure *">
          <input
            type="text"
            required
            maxLength={4}
            placeholder="KLAX"
            value={form.departure}
            onChange={set('departure')}
            className={`${inputCls} uppercase`}
          />
        </Field>
        <Field label="Destination *">
          <input
            type="text"
            required
            maxLength={4}
            placeholder="KSFO"
            value={form.destination}
            onChange={set('destination')}
            className={`${inputCls} uppercase`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Departure Time">
          <input type="time" value={form.departure_time} onChange={set('departure_time')} className={inputCls} />
        </Field>
        <Field label="Arrival Time">
          <input type="time" value={form.arrival_time} onChange={set('arrival_time')} className={inputCls} />
        </Field>
      </div>

      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Flight Hours</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            ['total_time', 'Total Time *'],
            ['pic_time', 'PIC'],
            ['dual_received', 'Dual Received'],
            ['night', 'Night'],
            ['instrument', 'Instrument'],
            ['cross_country', 'Cross Country'],
          ].map(([field, label]) => (
            <Field key={field} label={label}>
              <input
                type="number"
                step="0.1"
                min="0"
                required={field === 'total_time'}
                value={form[field as keyof typeof form]}
                onChange={set(field)}
                className={inputCls}
                placeholder="0.0"
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Day Landings">
          <input type="number" min="0" value={form.day_landings} onChange={set('day_landings')} className={inputCls} placeholder="0" />
        </Field>
        <Field label="Night Landings">
          <input type="number" min="0" value={form.night_landings} onChange={set('night_landings')} className={inputCls} placeholder="0" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          rows={3}
          value={form.notes}
          onChange={set('notes')}
          className={`${inputCls} resize-none`}
          placeholder="Remarks, conditions, endorsements..."
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : flightId ? 'Update Flight' : 'Log Flight'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/flights')}
          className="text-gray-600 hover:text-gray-800 font-medium px-6 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function toFormValues(data?: Partial<Flight>): Partial<typeof defaultForm> {
  if (!data) return {};
  return {
    date: data.date || '',
    departure: data.departure || '',
    destination: data.destination || '',
    aircraft_id: data.aircraft_id?.toString() || '',
    departure_time: data.departure_time || '',
    arrival_time: data.arrival_time || '',
    total_time: data.total_time?.toString() || '',
    pic_time: data.pic_time?.toString() || '',
    dual_received: data.dual_received?.toString() || '',
    night: data.night?.toString() || '',
    instrument: data.instrument?.toString() || '',
    cross_country: data.cross_country?.toString() || '',
    day_landings: data.day_landings?.toString() || '',
    night_landings: data.night_landings?.toString() || '',
    notes: data.notes || '',
  };
}
