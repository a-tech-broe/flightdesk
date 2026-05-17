export interface User {
  id: number;
  email: string;
  full_name: string | null;
  bfr_date: string | null;
  created_at: string;
}

export interface Aircraft {
  id: number;
  tail_number: string;
  make: string;
  model: string;
  year: number | null;
  category: string | null;
  aircraft_class: string | null;
  created_at: string;
}

export interface Flight {
  id: number;
  user_id: number;
  aircraft_id: number | null;
  date: string;
  departure: string;
  destination: string;
  departure_time: string | null;
  arrival_time: string | null;
  total_time: number;
  pic_time: number;
  dual_received: number;
  night: number;
  instrument: number;
  cross_country: number;
  day_landings: number;
  night_landings: number;
  instrument_approaches: number | null;
  notes: string | null;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  aircraft_id: number;
  start_time: string;
  end_time: string;
  purpose: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}
