# 🔐 SmartLock Dashboard

A full-stack smart lock web dashboard system with real-time control, access logging, and ESP32-CAM hardware integration.

## 📁 Project Structure

```
smartlock/
├── backend/          # Node.js + Express + MongoDB API
├── frontend/         # React + Tailwind CSS + Framer Motion
├── esp32/            # Arduino code for ESP32-CAM
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Arduino IDE (for ESP32)

---

## ⚙️ Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm start        # production
npm run dev      # development with hot-reload
```

**Default admin account** (auto-created on first start):
- Email: `admin@smartlock.com`
- Password: `admin123`

### Environment Variables (`.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/smartlock` |
| `JWT_SECRET` | Secret for JWT signing | ⚠️ Change this! |
| `JWT_EXPIRES_IN` | Token expiry | `24h` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

---

## 🎨 Frontend Setup

```bash
cd frontend
npm install
npm run dev      # start dev server on http://localhost:5173
npm run build    # production build
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login (rate-limited) |
| POST | `/api/auth/register` | — | Register new user |
| GET | `/api/auth/me` | Bearer | Get current user |

#### Login Request
```json
POST /api/auth/login
{ "email": "admin@smartlock.com", "password": "admin123" }
```

#### Login Response
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "...", "name": "Admin", "email": "...", "role": "admin" }
}
```

---

### Lock Control

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/lock/status` | — | Get current lock state |
| POST | `/api/lock/toggle` | Bearer | Toggle lock (requires JWT) |

#### Lock Status Response
```json
{
  "success": true,
  "isLocked": true,
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "lastUpdatedBy": "Admin"
}
```

---

### Access Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/access-log` | — | Create log entry (ESP32 use) |
| GET | `/api/access-log` | Bearer | Get logs with filters |

#### Create Log (ESP32)
```json
POST /api/access-log
{
  "user": "ESP32-01",
  "method": "fingerprint",
  "status": "success",
  "details": "Access granted"
}
```

#### Get Logs Query Parameters
| Param | Description |
|-------|-------------|
| `page` | Page number (default: 1) |
| `limit` | Results per page (default: 20) |
| `status` | Filter: `success` or `failed` |
| `method` | Filter: `pin`, `fingerprint`, `face`, `web` |
| `user` | Search by username (partial match) |
| `startDate` | ISO 8601 date filter start |
| `endDate` | ISO 8601 date filter end |

---

## 🔌 WebSocket Events (Socket.io)

Connect to the backend WebSocket server:

```javascript
import { io } from 'socket.io-client'
const socket = io('http://localhost:5000')

// Listen for lock state changes
socket.on('lockStateChanged', (data) => {
  // { isLocked: bool, lastUpdated: Date, lastUpdatedBy: string }
})

// Listen for new access log entries
socket.on('newAccessLog', (log) => {
  // AccessLog document
})
```

---

## 🗄️ MongoDB Schemas

### User
```js
{
  name: String,
  email: String (unique),
  password: String (bcrypt hashed),
  role: 'admin' | 'user',
  createdAt: Date,
  updatedAt: Date
}
```

### AccessLog
```js
{
  timestamp: Date,
  user: String,
  method: 'pin' | 'fingerprint' | 'face' | 'web',
  status: 'success' | 'failed',
  ipAddress: String,
  details: String
}
```

### LockState
```js
{
  isLocked: Boolean,
  lastUpdated: Date,
  lastUpdatedBy: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📟 ESP32-CAM Setup

### Hardware Requirements

| Component | Description |
|-----------|-------------|
| ESP32-CAM | AI-Thinker module (OV2640 camera) |
| Relay module | 5V single-channel relay for solenoid lock |
| Solenoid lock | 12V electric strike / solenoid bolt |
| Fingerprint sensor | R307 / AS608 optical fingerprint module |
| 4x4 Matrix Keypad | PIN entry |
| Piezo Buzzer | Alarm feedback |
| 12V power supply | For solenoid lock |

### Wiring

| ESP32-CAM GPIO | Connected To |
|----------------|-------------|
| GPIO 12 | Relay IN |
| GPIO 13 | Buzzer + |
| GPIO 4 | LED Flash (built-in) |
| GPIO 16 (RX2) | Fingerprint TX |
| GPIO 17 (TX2) | Fingerprint RX |
| GPIO 32–33, 25–26 | Keypad rows |
| GPIO 27, 14, 2, 15 | Keypad cols |

### Arduino Libraries (install via Library Manager)

- **Keypad** by Mark Stanley & Alexander Brevig
- **Adafruit Fingerprint Sensor Library** by Adafruit
- **ArduinoJson** by Benoit Blanchon
- **ESP32** board support (via Boards Manager: `https://dl.espressif.com/dl/package_esp32_index.json`)

### Configuration

Edit `esp32/smart_lock/smart_lock.ino`:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL   = "http://192.168.1.100:5000";  // Your server IP
const String VALID_PIN    = "1234";   // Your PIN
```

### Upload Instructions

1. Install ESP32 board support in Arduino IDE
2. Select board: **AI Thinker ESP32-CAM**
3. Set upload speed: **115200**
4. Connect FTDI programmer (3.3V) to GPIO0 + GND for flash mode
5. Upload sketch
6. Disconnect GPIO0, press reset

---

## 🔐 Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | bcrypt (salt rounds: 12) |
| JWT authentication | jsonwebtoken, 24h expiry |
| Login rate limiting | 10 requests / 15 minutes per IP |
| API protection | JWT middleware on sensitive routes |
| CORS | Restricted to frontend origin |

---

## 🖥️ Dashboard Features

- **Dark cyberpunk UI** with glassmorphism cards and neon accents
- **Real-time lock status** with animated lock icon (red/green)
- **One-click lock/unlock** with confirmation feedback
- **Recent activity feed** updated via WebSocket
- **Access logs table** with:
  - Search by user name
  - Filter by status (success/failed)
  - Filter by method (PIN/fingerprint/face/web)
  - Date range filter
  - Paginated results
  - **Export to CSV**
- **Responsive design** (mobile sidebar + desktop layout)

---

## 🏭 Production Deployment

### Backend
```bash
# Set NODE_ENV=production and strong JWT_SECRET in .env
# Use a process manager:
npm install -g pm2
pm2 start src/server.js --name smartlock-api
pm2 save
```

### Frontend
```bash
npm run build
# Serve dist/ with nginx, Caddy, or any static host
```

### Nginx Example (frontend + proxy)
```nginx
server {
    listen 80;
    root /var/www/smartlock/dist;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```