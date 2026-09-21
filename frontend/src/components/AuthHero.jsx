export default function AuthHero() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-navy-900 text-white p-10 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 600" preserveAspectRatio="xMidYMid slice">
        {[60, 100, 140, 180, 220].map((r, i) => (
          <circle key={r} cx="120" cy="180" r={r} fill="none" stroke="#227F88" strokeWidth="1.2" opacity={0.9 - i * 0.15} />
        ))}
        {[40, 80, 120, 160].map((r, i) => (
          <circle key={r} cx="300" cy="440" r={r} fill="none" stroke="#C7621B" strokeWidth="1" opacity={0.5 - i * 0.1} />
        ))}
      </svg>

      <div className="relative z-10">
        <p className="font-display text-2xl font-semibold tracking-tight">CAPACITY CONNECT</p>
        <p className="text-white/60 text-sm mt-1">India Meteorological Department</p>
      </div>

      <div className="relative z-10 max-w-sm">
        <p className="font-display text-xl leading-snug">Empowering the next generation of weather scientists.</p>
        <p className="text-white/50 text-sm mt-4">
          Trainees, trainers and administrators — one portal for competency development, assessments and
          admin-verified knowledge sharing.
        </p>
      </div>
    </div>
  )
}
