export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Branding panel — desktop only */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-blue-800/30" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full border border-blue-700/20" />
        <div className="absolute top-20 -right-20 w-64 h-64 rounded-full border border-blue-800/20" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈</span>
            <span className="text-2xl font-bold text-white tracking-tight">FlightDesk</span>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your digital<br />flight logbook
          </h2>
          <p className="text-blue-300 text-base leading-relaxed mb-10">
            Log flights, schedule aircraft, and track every hour — built for pilot training schools.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'FAA', label: 'Compliant fields' },
              { value: '24/7', label: 'Scheduling' },
              { value: '100%', label: 'Secure' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-blue-400 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-blue-500 text-xs">© {new Date().getFullYear()} FlightDesk</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="text-3xl">✈</span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">FlightDesk</h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
