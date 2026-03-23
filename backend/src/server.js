require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const { router: lockRouter, setIo: setLockIo } = require('./routes/lockRoutes');
const { router: accessLogRouter, setIo: setAccessLogIo } = require('./routes/accessLogRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setLockIo(io);
setAccessLogIo(io);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/lock', lockRouter);
app.use('/api/access-log', accessLogRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const seedAdmin = async () => {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ email: 'admin@smartlock.com' });
    if (!existing) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      await User.create({
        name: 'Admin',
        email: 'admin@smartlock.com',
        password: adminPassword,
        role: 'admin',
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Default admin created: admin@smartlock.com / ${adminPassword}`);
      } else {
        console.log('Default admin account created. Set ADMIN_PASSWORD env var before first run.');
      }
    }
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  seedAdmin();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
