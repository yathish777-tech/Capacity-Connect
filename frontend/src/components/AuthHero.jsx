export default function AuthHero() {
  return (
    <div className="relative hidden lg:flex flex-col items-center justify-center bg-navy-900 text-white overflow-hidden">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 opacity-90" />
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 20%, #227F88 0%, transparent 55%), radial-gradient(circle at 70% 80%, #C7621B 0%, transparent 50%)',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-10 space-y-8">
        {/* IMD Logo */}
        <div className="flex items-center justify-center">
          <img
            src="/IMD.png"
            alt="India Meteorological Department Logo"
            className="w-52 h-auto object-contain drop-shadow-xl"
          />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <p className="font-display text-3xl font-bold tracking-tight leading-tight">CAPACITY CONNECT</p>
          <p className="text-teal-400 text-sm font-medium tracking-widest uppercase">
            India Meteorological Department
          </p>
        </div>

        {/* Divider */}
        <div className="w-16 h-px bg-white/20" />

        {/* Tagline */}
        <div className="max-w-xs space-y-3">
          <p className="font-display text-lg leading-snug text-white/90">
            Empowering the next generation of weather scientists.
          </p>
          <p className="text-white/50 text-sm leading-relaxed">
            Trainees, trainers and administrators — one portal for competency development, assessments and
            admin-verified knowledge sharing.
          </p>
        </div>
      </div>
    </div>
  )
}
