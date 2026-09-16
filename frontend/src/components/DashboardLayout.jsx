import Navbar from './Navbar'
import Sidebar from './Sidebar'

export default function DashboardLayout({ navItems, children }) {
  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar items={navItems} />
        <main className="flex-1 overflow-y-auto p-6 bg-paper">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
