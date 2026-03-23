const express = require('express');
const rateLimit = require('express-rate-limit');
const LockState = require('../models/LockState');
const AccessLog = require('../models/AccessLog');
const { protect } = require('../middleware/auth');

const router = express.Router();

let io;
const setIo = (socketIo) => { io = socketIo; };

const lockLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many lock requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

const getOrCreateLockState = async () => {
  let state = await LockState.findOne();
  if (!state) {
    state = await LockState.create({ isLocked: true });
  }
  return state;
};

router.get('/status', async (req, res) => {
  try {
    const state = await getOrCreateLockState();
    res.status(200).json({
      success: true,
      isLocked: state.isLocked,
      lastUpdated: state.lastUpdated,
      lastUpdatedBy: state.lastUpdatedBy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/toggle', lockLimiter, protect, async (req, res) => {
  try {
    const state = await getOrCreateLockState();
    state.isLocked = !state.isLocked;
    state.lastUpdated = new Date();
    state.lastUpdatedBy = req.user.name;
    await state.save();

    await AccessLog.create({
      user: req.user.name,
      method: 'web',
      status: 'success',
      details: state.isLocked ? 'Door locked via web' : 'Door unlocked via web',
      ipAddress: req.ip,
    });

    if (io) {
      io.emit('lockStateChanged', {
        isLocked: state.isLocked,
        lastUpdated: state.lastUpdated,
        lastUpdatedBy: state.lastUpdatedBy,
      });
    }

    res.status(200).json({
      success: true,
      isLocked: state.isLocked,
      lastUpdated: state.lastUpdated,
      lastUpdatedBy: state.lastUpdatedBy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = { router, setIo };
