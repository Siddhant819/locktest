import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Video, VideoOff, Settings, RefreshCw, Maximize2, AlertTriangle, Camera } from 'lucide-react'

const STORAGE_KEY = 'esp32_cam_url'
const DEFAULT_URL = 'http://192.168.1.100:81/stream'

export default function LiveCameraPage() {
  const [camUrl, setCamUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_URL)
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_URL)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const imgRef = useRef(null)
  const containerRef = useRef(null)

  const startStream = useCallback(() => {
    const trimmed = inputUrl.trim()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    setCamUrl(trimmed)
    setError(false)
    setStreaming(true)
    setShowSettings(false)
  }, [inputUrl])

  const stopStream = useCallback(() => {
    setStreaming(false)
    setError(false)
    if (imgRef.current) {
      imgRef.current.src = 'about:blank'
    }
  }, [])

  const handleImgLoad = () => {
    setError(false)
  }

  const handleImgError = () => {
    setError(true)
    setStreaming(false)
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.()
      setFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setFullscreen(false)
    }
  }

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Camera</h1>
          <p className="text-gray-500 text-sm mt-1">ESP32-CAM real-time video feed</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${streaming && !error ? 'bg-cyber-green animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-gray-400 text-sm">
            {streaming && !error ? 'Live' : error ? 'Connection failed' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Camera Feed */}
      <div
        ref={containerRef}
        className="glass-card overflow-hidden relative"
        style={{ aspectRatio: '16/9', background: 'rgba(8,14,28,0.95)' }}
      >
        {!streaming ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <VideoOff className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-sm">Stream is offline</p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 transition-all text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
              Configure Camera
            </motion.button>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-500">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,51,102,0.05)', border: '1px solid rgba(255,51,102,0.2)' }}>
              <VideoOff className="w-10 h-10 text-cyber-red" />
            </div>
            <p className="text-sm text-cyber-red font-medium">Cannot connect to camera</p>
            <p className="text-xs text-gray-600 px-8 text-center">
              Make sure the ESP32-CAM is powered on, connected to the same network, and the stream URL is correct.
            </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startStream}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowSettings(true); setError(false) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-card border border-cyber-border text-gray-400 hover:text-cyber-text transition-all text-sm"
              >
                <Settings className="w-4 h-4" />
                Change URL
              </motion.button>
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={camUrl}
            alt="ESP32-CAM live feed"
            onLoad={handleImgLoad}
            onError={handleImgError}
            className="w-full h-full object-contain"
          />
        )}

        {/* Overlay controls (visible while streaming) */}
        {streaming && !error && (
          <div className="absolute top-3 right-3 flex gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleFullscreen}
              title="Fullscreen"
              className="p-2 rounded-lg bg-black/50 text-gray-300 hover:text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              title="Settings"
              className="p-2 rounded-lg bg-black/50 text-gray-300 hover:text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
            >
              <Settings className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={stopStream}
              title="Stop stream"
              className="p-2 rounded-lg bg-black/50 text-cyber-red hover:bg-red-900/50 transition-colors backdrop-blur-sm"
            >
              <VideoOff className="w-4 h-4" />
            </motion.button>
          </div>
        )}

        {/* Live badge */}
        {streaming && !error && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
            <span className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="glass-card p-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">Stream URL</p>
          <p className="text-sm text-cyber-blue font-mono truncate">{camUrl}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!streaming ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startStream}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyber-green/10 border border-cyber-green/30 text-cyber-green hover:bg-cyber-green/20 transition-all text-sm font-medium"
            >
              <Video className="w-4 h-4" />
              Start Stream
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopStream}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyber-red/10 border border-cyber-red/30 text-cyber-red hover:bg-cyber-red/20 transition-all text-sm font-medium"
            >
              <VideoOff className="w-4 h-4" />
              Stop Stream
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(s => !s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm ${
              showSettings
                ? 'bg-cyber-blue/10 border-cyber-blue/40 text-cyber-blue'
                : 'bg-cyber-card border-cyber-border text-gray-400 hover:text-cyber-text'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </motion.button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 space-y-4"
        >
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyber-blue" />
            Camera Configuration
          </h3>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
              ESP32-CAM Stream URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputUrl}
                onChange={e => setInputUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startStream()}
                placeholder="http://192.168.1.100:81/stream"
                className="input-field flex-1 py-2 text-sm font-mono"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startStream}
                className="px-5 py-2 rounded-xl bg-cyber-blue/10 border border-cyber-blue/30 text-cyber-blue hover:bg-cyber-blue/20 transition-all text-sm font-medium whitespace-nowrap"
              >
                Apply & Connect
              </motion.button>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Default stream URL for ESP32-CAM (AI-Thinker): <span className="text-gray-500 font-mono">http://&lt;device-ip&gt;:81/stream</span>
            </p>
          </div>

          <div className="border-t border-cyber-border pt-4">
            <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-900/10 border border-yellow-800/30 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Mixed Content Notice</p>
                <p className="text-yellow-600">
                  If this dashboard is served over HTTPS, your browser may block the HTTP stream from the ESP32-CAM.
                  Access the dashboard over HTTP, or set up a reverse proxy for the camera stream.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
              <p className="text-gray-500 text-xs mb-1">Default Stream Port</p>
              <p className="text-cyber-blue font-mono text-sm">:81/stream</p>
            </div>
            <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
              <p className="text-gray-500 text-xs mb-1">Still Image</p>
              <p className="text-cyber-blue font-mono text-sm">/capture</p>
            </div>
            <div className="p-3 rounded-xl bg-cyber-bg border border-cyber-border">
              <p className="text-gray-500 text-xs mb-1">Camera Settings</p>
              <p className="text-cyber-blue font-mono text-sm">/control</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
