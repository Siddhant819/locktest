const express = require('express');
const rateLimit = require('express-rate-limit');
const AccessLog = require('../models/AccessLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

let io;
const setIo = (socketIo) => { io = socketIo; };

const createLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many log requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const getLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', createLogLimiter, async (req, res) => {
  try {
    const { user, method, status, details, ipAddress } = req.body;

    if (!user || !method || !status) {
      return res.status(400).json({ success: false, message: 'user, method and status are required' });
    }

    const log = await AccessLog.create({
      user,
      method,
      status,
      details,
      ipAddress: ipAddress || req.ip,
    });

    if (io) {
      io.emit('newAccessLog', log);
    }

    res.status(201).json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.get('/', getLogLimiter, protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, method, user, startDate, endDate } = req.query;

    const query = {};
    if (status) query.status = status;
    if (method) query.method = method;
    if (user) query.user = { $regex: user, $options: 'i' };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const total = await AccessLog.countDocuments(query);
    const logs = await AccessLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = { router, setIo };
