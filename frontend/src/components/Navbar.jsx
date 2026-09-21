import { LogOut, CloudSun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="h-14 bg-navy-900 text-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-teal-500" />
        <span className="font-display font-semibold tracking-tight">CAPACITY CONNECT</span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight hidden sm:block">
              <p className="text-sm font-medium">{user.full_name}</p>
              <p className="text-[11px] text-white/50 capitalize">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white border border-white/20 rounded px-2 py-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
