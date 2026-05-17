'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Flight, Aircraft } from '@/types';
import WeatherWidget from '@/components/WeatherWidget';

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
  instrument_approaches: '',
  solo: '',
  simulated_instrument: '',
  notes: '',
};

const inputCls = 'w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
        {title}
        <span className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
      </h3>
      {children}
    </div>
  );
}

export default function FlightForm({ initialData, flightId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({ ...defaultForm, ...toFormValues(initialData) });
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/aircraft').then((r) => setAircraft(r.data));
  }, []);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

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
        instrument_approaches: form.instrument_approaches ? Number(form.instrument_approaches) : 0,
        solo: Number(form.solo) || 0,
        simulated_instrument: Number(form.simulated_instrument) || 0,
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
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <Section title="Flight Info">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *">
            <input type="date" required value={form.date} onChange={set('date')} className={inputCls} />
          </Field>
          <Field label="Aircraft">
            <select value={form.aircraft_id} onChange={set('aircraft_id')} className={inputCls}>
              <option value="">Select aircraft</option>
              {aircraft.map((a) => (
                <option key={a.id} value={a.id}>{a.tail_number} — {a.make} {a.model}</option>
              ))}
            </select>
          </Field>
          <Field label="Departure *">
            <input type="text" required maxLength={4} placeholder="KLAX" value={form.departure} onChange={set('departure')} className={`${inputCls} uppercase`} />
          </Field>
          <Field label="Destination *">
            <input type="text" required maxLength={4} placeholder="KSFO" value={form.destination} onChange={set('destination')} className={`${inputCls} uppercase`} />
          </Field>
          <Field label="Off Block">
            <input type="time" value={form.departure_time} onChange={set('departure_time')} className={inputCls} />
          </Field>
          <Field label="On Block">
            <input type="time" value={form.arrival_time} onChange={set('arrival_time')} className={inputCls} />
          </Field>
        </div>
        {/* Live weather widget */}
        {(form.departure.length >= 3 || form.destination.length >= 3) && (
          <div className="mt-3">
            <WeatherWidget departure={form.departure} destination={form.destination} />
          </div>
        )}
      </Section>

      <Section title="Hours">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            ['total_time', 'Total Time *', true],
            ['pic_time', 'PIC', false],
            ['dual_received', 'Dual Received', false],
            ['night', 'Night', false],
            ['instrument', 'Instrument', false],
            ['cross_country', 'Cross Country', false],
          ].map(([field, label, required]) => (
            <Field key={field as string} label={label as string}>
              <input
                type="number"
                step="0.1"
                min="0"
                required={!!required}
                value={form[field as keyof typeof form]}
                onChange={set(field as string)}
                className={inputCls}
                placeholder="0.0"
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Landings & Approaches">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Day Ldg">
            <input type="number" min="0" value={form.day_landings} onChange={set('day_landings')} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Night Ldg">
            <input type="number" min="0" value={form.night_landings} onChange={set('night_landings')} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Inst. Approaches">
            <input type="number" min="0" value={form.instrument_approaches} onChange={set('instrument_approaches')} className={inputCls} placeholder="0" />
          </Field>
        </div>
      </Section>

      <Section title="Solo & Simulated Instrument">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Solo">
            <input type="number" step="0.1" min="0" value={form.solo} onChange={set('solo')} className={inputCls} placeholder="0.0" />
          </Field>
          <Field label="Simulated Instrument (Hood)">
            <input type="number" step="0.1" min="0" value={form.simulated_instrument} onChange={set('simulated_instrument')} className={inputCls} placeholder="0.0" />
          </Field>
        </div>
      </Section>

      <Field label="Remarks">
        <textarea rows={3} value={form.notes} onChange={set('notes')} className={`${inputCls} resize-none`} placeholder="Conditions, endorsements, remarks..." />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {saving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saving ? 'Saving...' : flightId ? 'Update Flight' : 'Log Flight'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/flights')}
          className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
    instrument_approaches: data.instrument_approaches?.toString() || '',
    solo: data.solo?.toString() || '',
    simulated_instrument: data.simulated_instrument?.toString() || '',
    notes: data.notes || '',
  };
}
