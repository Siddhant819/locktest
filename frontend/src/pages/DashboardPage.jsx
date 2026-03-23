import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  Lock, Unlock, Shield, ShieldOff, Activity,
  Clock, User, Cpu, Wifi, AlertTriangle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

export default function DashboardPage() {
  const { token } = useAuth()
  const [lockState, setLockState] = useState({ isLocked: true, lastUpdated: null, lastUpdatedBy: 'system' })
  const [recentLogs, setRecentLogs] = useState([])
  const [toggling, setToggling] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [connected, setConnected] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get('/api/lock/status')
      setLockState(res.data)
    } catch {
      // silently fail
    }
  }, [])

  const fetchRecentLogs = useCallback(async () => {
    try {
      const res = await axios.get('/api/access-log?limit=5')
      setRecentLogs(res.data.logs || [])
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    fetchRecentLogs()

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('lockStateChanged', (data) => {
      setLockState(data)
    })
    socket.on('newAccessLog', (log) => {
      setRecentLogs(prev => [log, ...prev].slice(0, 5))
    })
    return () => socket.disconnect()
  }, [fetchStatus, fetchRecentLogs])

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    setStatusMsg('')
    try {
      const res = await axios.post('/api/lock/toggle', {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLockState(res.data)
      setStatusMsg(res.data.isLocked ? '🔒 Door locked successfully' : '🔓 Door unlocked successfully')
    } catch (err) {
      setStatusMsg('⚠️ ' + (err.response?.data?.message || 'Failed to toggle lock'))
    } finally {
      setToggling(false)
      setTimeout(() => setStatusMsg(''), 3000)
    }
  }

  const { isLocked, lastUpdated, lastUpdatedBy } = lockState

  const stats = [
    { label: 'Lock Status', value: isLocked ? 'SECURED' : 'OPEN', icon: isLocked ? Shield : ShieldOff, color: isLocked ? 'text-cyber-green' : 'text-cyber-red' },
    { label: 'Last Activity', value: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—', icon: Clock, color: 'text-cyber-blue' },
    { label: 'Updated By', value: lastUpdatedBy || 'system', icon: User, color: 'text-cyber-yellow' },
    { label: 'Recent Events', value: recentLogs.length, icon: Activity, color: 'text-purple-400' },
  ]

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gate Control Center</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time smart lock management</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-cyber-green animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-400">{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      {/* Main Lock Control */}
      <div className="glass-card p-8 flex flex-col items-center text-center">
        {/* Animated Lock Icon */}
        <AnimatePresence mode="wait">
          <motion.div
            key={String(isLocked)}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3, type: 'spring' }}
            className={`relative mb-6 w-40 h-40 rounded-full flex items-center justify-center ${isLocked ? 'lock-glow-red' : 'lock-glow-green'}`}
            style={{
              background: isLocked
                ? 'radial-gradient(circle, rgba(255,51,102,0.15) 0%, rgba(15,22,41,0.8) 70%)'
                : 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, rgba(15,22,41,0.8) 70%)',
              border: `2px solid ${isLocked ? 'rgba(255,51,102,0.5)' : 'rgba(0,255,136,0.5)'}`,
            }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `1px solid ${isLocked ? 'rgba(255,51,102,0.2)' : 'rgba(0,255,136,0.2)'}` }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            {isLocked
              ? <Lock className="w-16 h-16 text-cyber-red" strokeWidth={1.5} />
              : <Unlock className="w-16 h-16 text-cyber-green" strokeWidth={1.5} />
            }
          </motion.div>
        </AnimatePresence>

        <motion.h2
          key={String(isLocked) + 'label'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-4xl font-bold tracking-wider mb-2 ${isLocked ? 'text-cyber-red' : 'text-cyber-green'}`}
        >
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </motion.h2>
        <p className="text-gray-400 text-sm mb-2">
          {lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleString()}` : 'Status unknown'}
        </p>
        {lastUpdatedBy && (
          <p className="text-gray-500 text-xs mb-8">By: {lastUpdatedBy}</p>
        )}

        {/* Status message */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 px-4 py-2 rounded-lg bg-cyber-card border border-cyber-border text-sm text-cyber-text"
            >
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <motion.button
          onClick={handleToggle}
          disabled={toggling}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.03 }}
          className={`relative px-12 py-4 rounded-2xl font-bold text-lg tracking-wide transition-all duration-300 overflow-hidden ${
            isLocked
              ? 'bg-cyber-green/10 text-cyber-green border-2 border-cyber-green hover:bg-cyber-green/20'
              : 'bg-cyber-red/10 text-cyber-red border-2 border-cyber-red hover:bg-cyber-red/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {toggling ? (
            <span className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            <span className="flex items-center gap-3">
              {isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              {isLocked ? 'UNLOCK DOOR' : 'LOCK DOOR'}
            </span>
          )}
        </motion.button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className="text-gray-500 text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-lg font-bold truncate ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyber-blue" />
          Recent Activity
        </h3>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Cpu className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <motion.div
                key={log._id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-xl bg-cyber-bg border border-cyber-border hover:border-cyber-blue/30 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-cyber-green' : 'bg-cyber-red'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{log.user}</p>
                  <p className="text-xs text-gray-500">{log.method?.toUpperCase()} · {log.details || ''}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${log.status === 'success' ? 'bg-cyber-green/10 text-cyber-green' : 'bg-cyber-red/10 text-cyber-red'}`}>
                    {log.status}
                  </span>
                  <p className="text-xs text-gray-600 mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ESP32 Status Card */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-cyber-blue" />
          ESP32-CAM Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
            <p className="text-gray-500 text-xs mb-1">Lock Status Endpoint</p>
            <p className="text-cyber-blue font-mono">GET /api/lock/status</p>
          </div>
          <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
            <p className="text-gray-500 text-xs mb-1">Access Log Endpoint</p>
            <p className="text-cyber-blue font-mono">POST /api/access-log</p>
          </div>
          <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
            <p className="text-gray-500 text-xs mb-1">Real-time Updates</p>
            <p className="text-cyber-green font-mono">WebSocket · Socket.io</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Configure ESP32 with your backend URL. See esp32/smart_lock/smart_lock.ino for Arduino code.
        </div>
      </div>
    </div>
  )
}
