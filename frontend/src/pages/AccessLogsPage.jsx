import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { Search, Filter, Download, FileText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'

const METHOD_COLORS = {
  pin: 'text-cyber-blue bg-blue-900/20 border-blue-800/30',
  fingerprint: 'text-purple-400 bg-purple-900/20 border-purple-800/30',
  face: 'text-yellow-400 bg-yellow-900/20 border-yellow-800/30',
  web: 'text-cyan-400 bg-cyan-900/20 border-cyan-800/30',
}

const STATUS_COLORS = {
  success: 'text-cyber-green bg-green-900/20 border-green-800/30',
  failed: 'text-cyber-red bg-red-900/20 border-red-800/30',
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (search) params.user = search
      if (statusFilter) params.status = statusFilter
      if (methodFilter) params.method = methodFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await axios.get('/api/access-log', { params })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.totalPages || 1)
    } catch (err) {
      console.error('Failed to fetch logs', err)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, methodFilter, startDate, endDate])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleReset = () => {
    setSearch('')
    setStatusFilter('')
    setMethodFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const exportCSV = () => {
    if (logs.length === 0) return
    const headers = ['Timestamp', 'User', 'Method', 'Status', 'Details', 'IP Address']
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.user,
      l.method,
      l.status,
      l.details || '',
      l.ipAddress || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `access-logs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Logs</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total records</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={fetchLogs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-card border border-cyber-border text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/40 transition-all text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 transition-all text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search user…"
              value={search}
              onChange={handleSearch}
              className="input-field pl-10 py-2 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="input-field py-2 text-sm w-36"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => { setMethodFilter(e.target.value); setPage(1) }}
            className="input-field py-2 text-sm w-40"
          >
            <option value="">All Methods</option>
            <option value="pin">PIN</option>
            <option value="fingerprint">Fingerprint</option>
            <option value="face">Face</option>
            <option value="web">Web</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={e => { setStartDate(e.target.value); setPage(1) }}
            className="input-field py-2 text-sm w-40"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => { setEndDate(e.target.value); setPage(1) }}
            className="input-field py-2 text-sm w-40"
          />

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl border border-cyber-border text-gray-400 hover:text-cyber-text hover:border-gray-500 transition-colors text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyber-border">
                <th className="text-left px-4 py-3 text-gray-400 font-medium uppercase tracking-wide text-xs">Timestamp</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium uppercase tracking-wide text-xs">User</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium uppercase tracking-wide text-xs">Method</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium uppercase tracking-wide text-xs">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium uppercase tracking-wide text-xs">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-cyber-blue border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Loading logs…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <FileText className="w-8 h-8 opacity-40" />
                      <p className="text-sm">No logs found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <motion.tr
                    key={log._id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-cyber-border/50 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{log.user}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${METHOD_COLORS[log.method] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                        {log.method?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[log.status] || 'text-gray-400'}`}>
                        {log.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details || '—'}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-cyber-border">
            <p className="text-gray-500 text-sm">
              Page {page} of {totalPages} · {total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-cyber-border text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {(() => {
                const pageCount = Math.min(5, totalPages)
                let startPage = Math.max(1, page - Math.floor(pageCount / 2))
                if (startPage + pageCount - 1 > totalPages) {
                  startPage = Math.max(1, totalPages - pageCount + 1)
                }
                return Array.from({ length: pageCount }, (_, i) => startPage + i).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      p === page
                        ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/40'
                        : 'border border-cyber-border text-gray-400 hover:text-cyber-text'
                    }`}
                  >
                    {p}
                  </button>
                ))
              })()}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-cyber-border text-gray-400 hover:text-cyber-blue hover:border-cyber-blue/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
