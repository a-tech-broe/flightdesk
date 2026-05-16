import FlightForm from '@/components/FlightForm';

export default function NewFlightPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Log New Flight</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <FlightForm />
      </div>
    </div>
  );
}
