import { NavLink } from 'react-router-dom'

export default function Sidebar({ items }) {
  return (
    <nav className="w-56 bg-navy-800 text-white/80 shrink-0 py-4 hidden md:block">
      <ul className="space-y-0.5 px-2">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-teal-600 text-white' : 'hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
