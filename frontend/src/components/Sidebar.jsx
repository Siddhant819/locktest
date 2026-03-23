import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, FileText, LogOut, ShieldAlert, Wifi, Video } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/logs', icon: FileText, label: 'Access Logs' },
  { to: '/live', icon: Video, label: 'Live Camera' },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-full py-6">
      {/* Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center glow-animate"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.05))', border: '1px solid rgba(0,212,255,0.4)' }}>
            <ShieldAlert className="w-5 h-5 text-cyber-blue" />
          </div>
          <div>
            <h2 className="text-lg font-bold neon-text">SmartLock</h2>
            <p className="text-xs text-gray-500">Security Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive
                  ? 'bg-cyber-blue/10 text-cyber-blue neon-border border'
                  : 'text-gray-400 hover:bg-white/5 hover:text-cyber-text border border-transparent'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* System Status */}
      <div className="px-4 mb-4">
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Wifi className="w-4 h-4 text-cyber-green" />
            <span>System Online</span>
            <span className="ml-auto w-2 h-2 bg-cyber-green rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 border-t border-cyber-border pt-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyber-blue/20 flex items-center justify-center text-cyber-blue font-bold text-sm border border-cyber-border">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-2 rounded-lg text-gray-500 hover:text-cyber-red hover:bg-red-900/20 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
